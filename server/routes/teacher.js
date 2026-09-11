// server/routes/teacher.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { parse } = require('csv-parse/sync');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function requireTeacher(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '로그인이 필요합니다.' });
  try {
    req.teacher = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    if (!req.teacher.isTeacher) throw new Error();
    next();
  } catch {
    return res.status(401).json({ error: '교사 인증이 필요합니다.' });
  }
}

// ---------- 교사 로그인 ----------
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await db.query('SELECT * FROM teachers WHERE username = $1', [username]);
  if (rows.length === 0 || !(await bcrypt.compare(password, rows[0].password_hash))) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }
  const token = jwt.sign({ teacherId: rows[0].id, isTeacher: true }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// ---------- 반 목록 조회 (이름으로 실제 classId를 찾을 때 사용) ----------
router.get('/classes', requireTeacher, async (req, res) => {
  const { rows } = await db.query('SELECT id, name FROM classes ORDER BY name');
  res.json(rows);
});

// ---------- 학생 명단 CSV 업로드 ----------
// CSV 형식: 반이름,학번,이름
router.post('/students/upload', requireTeacher, express.text({ type: '*/*' }), async (req, res) => {
  const records = parse(req.body, { columns: ['className', 'studentNo', 'name'], skip_empty_lines: true });
  let inserted = 0;
  for (const r of records) {
    let classRow = await db.query('SELECT id FROM classes WHERE name = $1', [r.className]);
    let classId;
    if (classRow.rows.length === 0) {
      const c = await db.query('INSERT INTO classes (name) VALUES ($1) RETURNING id', [r.className]);
      classId = c.rows[0].id;
    } else {
      classId = classRow.rows[0].id;
    }
    await db.query(
      `INSERT INTO students (class_id, student_no, name) VALUES ($1, $2, $3)
       ON CONFLICT (class_id, student_no) DO UPDATE SET name = $3`,
      [classId, r.studentNo, r.name]
    );
    inserted++;
  }
  res.json({ inserted });
});

// ---------- 반별 예약 시간 설정/조회 ----------
router.get('/schedules/:projectId', requireTeacher, async (req, res) => {
  const { rows } = await db.query(
    `SELECT cs.*, c.name AS class_name FROM class_schedules cs
     JOIN classes c ON c.id = cs.class_id
     WHERE cs.project_id = $1 ORDER BY c.name, cs.session_no`,
    [req.params.projectId]
  );
  res.json(rows);
});

router.put('/schedules/:projectId', requireTeacher, async (req, res) => {
  const { classId, sessionNo, startsAt, endsAt } = req.body;
  const { rows } = await db.query(
    `INSERT INTO class_schedules (project_id, class_id, session_no, starts_at, ends_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (project_id, class_id, session_no)
     DO UPDATE SET starts_at = $4, ends_at = $5
     RETURNING *`,
    [req.params.projectId, classId, sessionNo || 1, startsAt, endsAt]
  );
  res.json(rows[0]);
});

// ---------- 지금 바로 열기 / 마감 ----------
router.post('/schedules/:scheduleId/toggle', requireTeacher, async (req, res) => {
  const { open } = req.body; // true | false
  const { rows } = await db.query(
    'UPDATE class_schedules SET manually_opened = $1 WHERE id = $2 RETURNING *',
    [open, req.params.scheduleId]
  );
  res.json(rows[0]);
});

// ---------- 실시간 진행 현황 (반별 학생이 어느 스텝까지 왔는지) ----------
router.get('/progress/:projectId/:classId', requireTeacher, async (req, res) => {
  const { projectId, classId } = req.params;
  const { rows } = await db.query(
    `SELECT st.id AS student_id, st.name, st.student_no, e.id AS enrollment_id, e.submitted_at,
            COUNT(r.id) AS steps_done
     FROM students st
     LEFT JOIN enrollments e ON e.student_id = st.id AND e.project_id = $1
     LEFT JOIN responses r ON r.enrollment_id = e.id
     WHERE st.class_id = $2
     GROUP BY st.id, st.name, st.student_no, e.id, e.submitted_at
     ORDER BY st.student_no`,
    [projectId, classId]
  );
  res.json(rows);
});

// ---------- 실시간 집계 보기 (STEP3·5·8 전용, 선택형 답안 분포) ----------
router.get('/distribution/:projectId/:stepKey', requireTeacher, async (req, res) => {
  const { projectId, stepKey } = req.params;
  const { classId } = req.query; // 없으면 전체 반 합산, 있으면 그 반만
  const step = await db.query('SELECT id FROM steps WHERE project_id = $1 AND step_key = $2', [projectId, stepKey]);
  if (step.rows.length === 0) return res.status(404).json({ error: '스텝을 찾을 수 없습니다.' });

  const params = [step.rows[0].id];
  let classFilter = '';
  if (classId) {
    classFilter = 'AND st.class_id = $2';
    params.push(classId);
  }

  const { rows } = await db.query(
    `SELECT COALESCE(r.answer->>'choice', r.answer->>'finalChoice') AS choice, COUNT(*) AS count
     FROM responses r
     JOIN enrollments e ON e.id = r.enrollment_id
     JOIN students st ON st.id = e.student_id
     WHERE r.step_id = $1 ${classFilter}
     GROUP BY COALESCE(r.answer->>'choice', r.answer->>'finalChoice')`,
    params
  );
  const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
  res.json({ stepKey, total, distribution: rows, note: '지금까지 제출한 인원 기준' });
});

// ---------- 학생 답안 열람 ----------
router.get('/responses/:enrollmentId', requireTeacher, async (req, res) => {
  const { rows } = await db.query(
    `SELECT s.step_key, s.title, r.answer, r.updated_at
     FROM responses r JOIN steps s ON s.id = r.step_id
     WHERE r.enrollment_id = $1 ORDER BY s.display_order`,
    [req.params.enrollmentId]
  );
  res.json(rows);
});

// ---------- 루브릭 항목 조회 ----------
router.get('/rubric/:projectId', requireTeacher, async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM rubric_items WHERE project_id = $1 ORDER BY display_order',
    [req.params.projectId]
  );
  res.json(rows);
});

// ---------- 특정 학생의 채점 결과 조회 (루브릭 + 기존 점수를 합쳐서 반환) ----------
router.get('/grades/:projectId/:enrollmentId', requireTeacher, async (req, res) => {
  const { projectId, enrollmentId } = req.params;
  const rubric = await db.query(
    'SELECT * FROM rubric_items WHERE project_id = $1 ORDER BY display_order',
    [projectId]
  );
  const grades = await db.query('SELECT rubric_item_id, score FROM grades WHERE enrollment_id = $1', [
    enrollmentId,
  ]);
  const gradeMap = Object.fromEntries(grades.rows.map((g) => [g.rubric_item_id, g.score]));
  const items = rubric.rows.map((r) => ({ ...r, score: gradeMap[r.id] ?? null }));
  const total = items.reduce((sum, i) => sum + (i.score ?? 0), 0);
  res.json({ items, total });
});

// ---------- 채점 항목 하나 저장 (등급 또는 점수) ----------
router.put('/grades/:enrollmentId/:rubricItemId', requireTeacher, async (req, res) => {
  const { enrollmentId, rubricItemId } = req.params;
  const { score } = req.body;
  const { rows } = await db.query(
    `INSERT INTO grades (enrollment_id, rubric_item_id, score, graded_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (enrollment_id, rubric_item_id)
     DO UPDATE SET score = $3, graded_at = now()
     RETURNING *`,
    [enrollmentId, rubricItemId, score]
  );
  res.json(rows[0]);
});

// ---------- 결과 CSV 내보내기 (반별, 루브릭 항목별 점수 + 총점) ----------
router.get('/export/:projectId/:classId', requireTeacher, async (req, res) => {
  const { projectId, classId } = req.params;

  const rubric = await db.query(
    'SELECT id, title FROM rubric_items WHERE project_id = $1 ORDER BY display_order',
    [projectId]
  );

  const students = await db.query(
    `SELECT st.id AS student_id, st.student_no, st.name, e.id AS enrollment_id, e.submitted_at
     FROM students st
     LEFT JOIN enrollments e ON e.student_id = st.id AND e.project_id = $1
     WHERE st.class_id = $2
     ORDER BY st.student_no`,
    [projectId, classId]
  );

  const grades = await db.query(
    `SELECT g.enrollment_id, g.rubric_item_id, g.score
     FROM grades g
     JOIN enrollments e ON e.id = g.enrollment_id
     WHERE e.project_id = $1`,
    [projectId]
  );
  const gradeMap = {}; // { enrollmentId: { rubricItemId: score } }
  grades.rows.forEach((g) => {
    gradeMap[g.enrollment_id] = gradeMap[g.enrollment_id] || {};
    gradeMap[g.enrollment_id][g.rubric_item_id] = g.score;
  });

  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const header = ['학번', '이름', '제출 여부', ...rubric.rows.map((r) => r.title), '총점'];
  const lines = [header.map(esc).join(',')];

  for (const s of students.rows) {
    const itemScores = rubric.rows.map((r) => gradeMap[s.enrollment_id]?.[r.id] ?? '');
    const total = itemScores.reduce((sum, v) => sum + (Number(v) || 0), 0);
    const row = [
      s.student_no,
      s.name,
      s.submitted_at ? '제출 완료' : '미제출',
      ...itemScores,
      s.enrollment_id ? total : '',
    ];
    lines.push(row.map(esc).join(','));
  }

  const csv = '\uFEFF' + lines.join('\r\n'); // BOM 포함: 엑셀·한글에서 한글 깨짐 방지
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="results_${projectId}_${classId}.csv"`);
  res.send(csv);
});

// ---------- 답안 전체 내보내기 (반별, STEP3·5·7·8·9 실제 서술 내용 전부) ----------
const POLICY_LABEL = {
  A: 'A안(관광 확대)',
  B: 'B안(관리형 관광)',
  C: 'C안(주민 생활권 우선)',
};
const DECISION_LABEL = { keep: '유지', change: '변경' };
const TAG_LABEL = { benefit: '혜택', harm: '불이익', neutral: '무관' };

router.get('/export-answers/:projectId/:classId', requireTeacher, async (req, res) => {
  const { projectId, classId } = req.params;

  const students = await db.query(
    `SELECT st.id AS student_id, st.student_no, st.name, e.id AS enrollment_id, e.submitted_at
     FROM students st
     LEFT JOIN enrollments e ON e.student_id = st.id AND e.project_id = $1
     WHERE st.class_id = $2
     ORDER BY st.student_no`,
    [projectId, classId]
  );

  const responses = await db.query(
    `SELECT r.enrollment_id, s.step_key, r.answer
     FROM responses r
     JOIN steps s ON s.id = r.step_id
     JOIN enrollments e ON e.id = r.enrollment_id
     WHERE e.project_id = $1`,
    [projectId]
  );
  const byEnrollment = {}; // { enrollmentId: { step3: {...}, step5: {...}, ... } }
  responses.rows.forEach((r) => {
    byEnrollment[r.enrollment_id] = byEnrollment[r.enrollment_id] || {};
    byEnrollment[r.enrollment_id][r.step_key] = r.answer;
  });

  const stakeholderRows = await db.query('SELECT stakeholder_key, name FROM stakeholders WHERE project_id = $1', [
    projectId,
  ]);
  const stakeholderName = Object.fromEntries(stakeholderRows.rows.map((s) => [s.stakeholder_key, s.name]));

  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const header = [
    '학번', '이름', '제출 여부',
    'STEP3_선택', 'STEP3_근거',
    'STEP5_결정', 'STEP5_최종선택', 'STEP5_이유',
    'STEP7_분류결과', 'STEP7_보완책',
    'STEP8_최종선택', 'STEP8_핵심근거', 'STEP8_예상문제점', 'STEP8_보완방안',
    'STEP9_분기', 'STEP9_분기답변1', 'STEP9_분기답변2', 'STEP9_성찰1', 'STEP9_성찰2', 'STEP9_성찰3',
  ];
  const lines = [header.map(esc).join(',')];

  for (const s of students.rows) {
    const a = byEnrollment[s.enrollment_id] || {};
    const step3 = a.step3 || {};
    const step5 = a.step5 || {};
    const step7 = a.step7 || {};
    const step8 = a.step8 || {};
    const step9 = a.step9 || {};

    const classificationText = step7.classification
      ? Object.entries(step7.classification)
          .map(([key, tag]) => `${stakeholderName[key] || key}(${TAG_LABEL[tag] || tag})`)
          .join(', ')
      : '';

    const row = [
      s.student_no,
      s.name,
      s.submitted_at ? '제출 완료' : '미제출',
      POLICY_LABEL[step3.choice] || '',
      step3.reason || '',
      DECISION_LABEL[step5.decision] || '',
      POLICY_LABEL[step5.choice] || '',
      step5.reason || '',
      classificationText,
      step7.mitigation || '',
      POLICY_LABEL[step8.finalChoice] || '',
      step8.coreReason || '',
      step8.expectedProblem || '',
      step8.mitigationPlan || '',
      step9.branch === 'had' ? '있었다' : step9.branch === 'none' ? '없었다' : '',
      step9.branch === 'had' ? step9.hadPoint || '' : step9.noneReason || '',
      step9.branch === 'had' ? step9.hadChanged || '' : '',
      step9.self1 || '',
      step9.self2 || '',
      step9.self3 || '',
    ];
    lines.push(row.map(esc).join(','));
  }

  const csv = '\uFEFF' + lines.join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="answers_${projectId}_${classId}.csv"`);
  res.send(csv);
});

module.exports = { router, requireTeacher };
