// server/routes/student.js
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// ---------- 인증 미들웨어 ----------
function requireStudent(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: '로그인이 필요합니다.' });
  try {
    req.student = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: '로그인 정보가 유효하지 않습니다.' });
  }
}

// ---------- 학번으로 로그인 ----------
router.post('/login', async (req, res) => {
  const { className, studentNo } = req.body;
  if (!className || !studentNo) {
    return res.status(400).json({ error: '반과 학번을 모두 입력해주세요.' });
  }
  const { rows } = await db.query(
    `SELECT s.id, s.name, s.class_id, c.name AS class_name
     FROM students s JOIN classes c ON c.id = s.class_id
     WHERE c.name = $1 AND s.student_no = $2`,
    [className, studentNo]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: '일치하는 학생 정보를 찾을 수 없습니다. 반과 학번을 다시 확인해주세요.' });
  }
  const student = rows[0];
  const token = jwt.sign(
    { studentId: student.id, name: student.name, classId: student.class_id },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({ token, name: student.name, className: student.class_name });
});

// ---------- 응시 가능 여부 확인 (반별 예약 시간 체크) ----------
async function checkWindow(projectId, classId) {
  const { rows } = await db.query(
    `SELECT * FROM class_schedules
     WHERE project_id = $1 AND class_id = $2
     ORDER BY session_no`,
    [projectId, classId]
  );
  const now = new Date();
  const openSession = rows.find(
    (r) => r.manually_opened || (now >= new Date(r.starts_at) && now <= new Date(r.ends_at))
  );
  return { isOpen: !!openSession, schedules: rows };
}

// ---------- 프로젝트 진입: 스텝 목록 + 현재 진행상태 ----------
router.get('/projects/:code', requireStudent, async (req, res) => {
  const { code } = req.params;
  const { rows: projectRows } = await db.query('SELECT * FROM projects WHERE code = $1', [code]);
  if (projectRows.length === 0) return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
  const project = projectRows[0];

  const { isOpen, schedules } = await checkWindow(project.id, req.student.classId);
  if (!isOpen) {
    return res.status(403).json({ error: '지금은 응시 시간이 아닙니다.', schedules });
  }

  const { rows: steps } = await db.query(
    'SELECT * FROM steps WHERE project_id = $1 ORDER BY display_order',
    [project.id]
  );
  const { rows: tracks } = await db.query(
    'SELECT * FROM tracks WHERE project_id = $1 ORDER BY display_order',
    [project.id]
  );

  // 학생의 enrollment 없으면 새로 생성
  let { rows: enrollRows } = await db.query(
    'SELECT * FROM enrollments WHERE project_id = $1 AND student_id = $2',
    [project.id, req.student.studentId]
  );
  if (enrollRows.length === 0) {
    const inserted = await db.query(
      'INSERT INTO enrollments (project_id, student_id) VALUES ($1, $2) RETURNING *',
      [project.id, req.student.studentId]
    );
    enrollRows = inserted.rows;
  }
  const enrollment = enrollRows[0];

  const { rows: responses } = await db.query(
    'SELECT step_id, answer FROM responses WHERE enrollment_id = $1',
    [enrollment.id]
  );

  res.json({ project, steps, tracks, enrollment, responses });
});

// ---------- 트랙 선택 (조례처럼 트랙이 있는 프로젝트 전용) ----------
router.post('/enrollments/:enrollmentId/track', requireStudent, async (req, res) => {
  const { enrollmentId } = req.params;
  const { trackId } = req.body;

  const { rows } = await db.query('SELECT * FROM enrollments WHERE id = $1', [enrollmentId]);
  if (rows.length === 0) return res.status(404).json({ error: '진행 정보를 찾을 수 없습니다.' });
  if (rows[0].student_id !== req.student.studentId) {
    return res.status(403).json({ error: '본인의 진행 정보만 수정할 수 있습니다.' });
  }
  if (rows[0].track_locked) {
    return res.status(409).json({ error: '이미 트랙이 확정되어 변경할 수 없습니다.' });
  }
  const updated = await db.query(
    'UPDATE enrollments SET track_id = $1 WHERE id = $2 RETURNING *',
    [trackId, enrollmentId]
  );
  res.json(updated.rows[0]);
});

// ---------- 자료 목록 조회 (스텝·트랙 유무에 따라 필터링) ----------
router.get('/projects/:projectId/materials', requireStudent, async (req, res) => {
  const { projectId } = req.params;
  const { trackId, stepId } = req.query;
  const { rows } = await db.query(
    `SELECT * FROM materials
     WHERE project_id = $1
       AND (track_id IS NULL OR track_id = $2)
       AND ($3::int IS NULL OR step_id = $3)
     ORDER BY display_order`,
    [projectId, trackId || null, stepId || null]
  );
  // 각 자료의 확인 문제도 함께
  for (const m of rows) {
    const q = await db.query('SELECT id, question_type, prompt, options FROM check_questions WHERE material_id = $1', [m.id]);
    m.questions = q.rows;
  }
  res.json(rows);
});

// ---------- 이해관계자 목록 조회 ----------
router.get('/projects/:projectId/stakeholders', requireStudent, async (req, res) => {
  const { projectId } = req.params;
  const { trackId } = req.query;
  const { rows } = await db.query(
    `SELECT * FROM stakeholders
     WHERE project_id = $1 AND (track_id IS NULL OR track_id = $2)
     ORDER BY display_order`,
    [projectId, trackId || null]
  );
  res.json(rows);
});

// ---------- 답안 자동 저장 ----------
router.put('/enrollments/:enrollmentId/responses/:stepId', requireStudent, async (req, res) => {
  const { enrollmentId, stepId } = req.params;
  const { answer } = req.body;

  const enroll = await db.query('SELECT * FROM enrollments WHERE id = $1', [enrollmentId]);
  if (enroll.rows.length === 0) return res.status(404).json({ error: '진행 정보를 찾을 수 없습니다.' });
  if (enroll.rows[0].student_id !== req.student.studentId) {
    return res.status(403).json({ error: '본인의 진행 정보에만 답안을 저장할 수 있습니다.' });
  }
  if (enroll.rows[0].submitted_at) {
    return res.status(409).json({ error: '이미 제출을 완료하여 답안을 수정할 수 없습니다.' });
  }

  // 트랙 잠금: 서술형 첫 입력 시 잠금 처리 (조례 프로젝트 등)
  if (!enroll.rows[0].track_locked && enroll.rows[0].track_id) {
    await db.query('UPDATE enrollments SET track_locked = true WHERE id = $1', [enrollmentId]);
  }

  await db.query(
    `INSERT INTO responses (enrollment_id, step_id, answer, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (enrollment_id, step_id)
     DO UPDATE SET answer = $3, updated_at = now()`,
    [enrollmentId, stepId, JSON.stringify(answer)]
  );
  res.json({ saved: true, savedAt: new Date().toISOString() });
});

// ---------- 최종 제출 ----------
router.post('/enrollments/:enrollmentId/submit', requireStudent, async (req, res) => {
  const { enrollmentId } = req.params;
  const enroll = await db.query('SELECT * FROM enrollments WHERE id = $1', [enrollmentId]);
  if (enroll.rows.length === 0) return res.status(404).json({ error: '진행 정보를 찾을 수 없습니다.' });
  if (enroll.rows[0].student_id !== req.student.studentId) {
    return res.status(403).json({ error: '본인의 진행 정보만 제출할 수 있습니다.' });
  }
  if (enroll.rows[0].submitted_at) {
    return res.status(409).json({ error: '이미 제출되었습니다.' });
  }
  const updated = await db.query(
    'UPDATE enrollments SET submitted_at = now() WHERE id = $1 RETURNING *',
    [enrollmentId]
  );
  res.json(updated.rows[0]);
});

module.exports = { router, requireStudent, checkWindow, JWT_SECRET };
