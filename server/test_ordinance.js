// server/test_ordinance.js
// 조례 수행평가 API 점검 (실제 PostgreSQL 필요)
// 실행: DATABASE_URL=postgres://.../빈DB node test_ordinance.js
// 빈 DB에 schema.sql을 적용한 뒤 ensureSchema를 두 번 돌려(멱등성) 흐름 전체를 확인한다.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) {
    pass++;
    console.log(`✅ ${name}`);
  } else {
    fail++;
    console.log(`❌ ${name}`, extra ?? '');
  }
}

async function main() {
  const db = require('./db');
  await db.query(fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8'));
  const { ensureSchema } = require('./db/migrate');
  await ensureSchema(db);
  await ensureSchema(db); // 두 번 실행해도 안전해야 함
  const projects = (await db.query("SELECT id FROM projects WHERE code='ordinance'")).rows;
  check('조례 프로젝트 1개만 생성(멱등)', projects.length === 1);
  const pid = projects[0].id;
  const trackRows = (await db.query('SELECT * FROM tracks WHERE project_id=$1 ORDER BY display_order', [pid])).rows;
  check('주제 6개', trackRows.length === 6);
  const stepRows = (await db.query('SELECT * FROM steps WHERE project_id=$1', [pid])).rows;
  check('단계 6개(o3~o8)', stepRows.length === 6);
  const rubric = (await db.query('SELECT * FROM rubric_items WHERE project_id=$1 ORDER BY display_order', [pid])).rows;
  check('채점 요소 5개, A 합 100 / E 합 30',
    rubric.length === 5 &&
      rubric.reduce((s, r) => s + r.scale[0], 0) === 100 &&
      rubric.reduce((s, r) => s + r.scale[4], 0) === 30);

  await db.query("INSERT INTO classes (name) VALUES ('2학년 1반'), ('테스트반')");
  await db.query("INSERT INTO students (class_id, student_no, name) VALUES (1,'2101','가학생'), (1,'2102','나학생'), (2,'10101','테스트1')");
  await db.query("INSERT INTO teachers (username, password_hash) VALUES ('kim', $1)", [await bcrypt.hash('pw', 4)]);

  const { createApp } = require('./app');
  const request = require('supertest')(createApp());

  const login = async (cls, no) => (await request.post('/api/student/login').send({ className: cls, studentNo: no })).body.token;
  const t1 = await login('2학년 1반', '2101');
  const t2 = await login('2학년 1반', '2102');
  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  let r = await request.get('/api/student/projects/ordinance').set(auth(t1));
  check('응시 시간 밖이면 403', r.status === 403);

  await db.query(
    `INSERT INTO class_schedules (project_id, class_id, session_no, starts_at, ends_at) VALUES ($1, 1, 1, now() - interval '1 minute', now() + interval '1 hour')`,
    [pid]
  );
  r = await request.get('/api/student/projects/ordinance').set(auth(t1));
  check('응시 시간 안이면 200 + 주제 6개', r.status === 200 && r.body.tracks.length === 6, r.body);
  const enr = r.body.enrollment;
  const stepId = Object.fromEntries(r.body.steps.map((s) => [s.step_key, s.id]));
  const noise = trackRows[0];
  const pet = trackRows[2];

  r = await request.post(`/api/student/enrollments/${enr.id}/lock-track`).set(auth(t1));
  check('주제 없이 고정 불가(400)', r.status === 400);

  r = await request.post(`/api/student/enrollments/${enr.id}/track`).set(auth(t1)).send({ trackId: 99999 });
  check('없는 주제 선택 불가(400)', r.status === 400);

  r = await request.post(`/api/student/enrollments/${enr.id}/track`).set(auth(t1)).send({ trackId: pet.id });
  r = await request.post(`/api/student/enrollments/${enr.id}/track`).set(auth(t1)).send({ trackId: noise.id });
  check('고정 전에는 주제를 몇 번이든 바꿀 수 있음', r.status === 200 && r.body.track_id === noise.id);

  r = await request.post(`/api/student/enrollments/${enr.id}/lock-track`).set(auth(t2));
  check('남의 진행 정보 고정 불가(403)', r.status === 403);

  r = await request.post(`/api/student/enrollments/${enr.id}/lock-track`).set(auth(t1));
  check('주제 고정', r.status === 200 && r.body.track_locked === true);

  r = await request.post(`/api/student/enrollments/${enr.id}/track`).set(auth(t1)).send({ trackId: pet.id });
  check('고정 후 그냥 바꾸기는 불가(409)', r.status === 409);

  const o3 = { q1: '소음 문제가 심각합니다'.repeat(3), q2: 'b', q3: 'c' };
  r = await request.put(`/api/student/enrollments/${enr.id}/responses/${stepId.o3}`).set(auth(t1)).send({ answer: o3, trackId: noise.id });
  check('답안 저장', r.status === 200);
  r = await request.put(`/api/student/enrollments/${enr.id}/responses/${stepId.o4}`).set(auth(t1)).send({ answer: { q1: '조항' }, trackId: noise.id });
  r = await request.put(`/api/student/enrollments/${enr.id}/responses/${stepId.o4}`).set(auth(t1)).send({ answer: { q1: 'x' }, trackId: pet.id });
  check('다른 주제 번호로 저장 시도 거절(409 TRACK_MISMATCH)', r.status === 409 && r.body.code === 'TRACK_MISMATCH');

  // 주제 변경 → 보관 + 삭제
  r = await request.post(`/api/student/enrollments/${enr.id}/change-track`).set(auth(t1));
  check('주제 변경: 고정 풀림, 주제 비움', r.status === 200 && r.body.track_id === null && r.body.track_locked === false);
  let cnt = (await db.query('SELECT COUNT(*)::int AS n FROM responses WHERE enrollment_id=$1', [enr.id])).rows[0].n;
  check('주제 변경 후 학생 답안 0개', cnt === 0);
  let arch = (await db.query('SELECT * FROM response_archives WHERE enrollment_id=$1', [enr.id])).rows;
  check('변경 전 기록 1개 보관(o3·o4 포함, 주제=소음)',
    arch.length === 1 && arch[0].answers.o3.q1 === o3.q1 && arch[0].answers.o4.q1 === '조항' && arch[0].track_id === noise.id);

  r = await request.put(`/api/student/enrollments/${enr.id}/responses/${stepId.o3}`).set(auth(t1)).send({ answer: o3, trackId: noise.id });
  check('변경 직후 예전 화면의 저장 요청 거절(409)', r.status === 409);

  r = await request.post(`/api/student/enrollments/${enr.id}/change-track`).set(auth(t1));
  arch = (await db.query('SELECT * FROM response_archives WHERE enrollment_id=$1', [enr.id])).rows;
  check('답안이 없을 때 다시 변경해도 빈 기록은 만들지 않음', r.status === 200 && arch.length === 1);

  // 새 주제로 진행
  await request.post(`/api/student/enrollments/${enr.id}/track`).set(auth(t1)).send({ trackId: pet.id });
  await request.post(`/api/student/enrollments/${enr.id}/lock-track`).set(auth(t1));
  await request.put(`/api/student/enrollments/${enr.id}/responses/${stepId.o3}`).set(auth(t1)).send({ answer: { q1: '반려동물 답' }, trackId: pet.id });
  await request.put(`/api/student/enrollments/${enr.id}/responses/${stepId.o6}`).set(auth(t1))
    .send({ answer: { checked: ['m1', 'm3'], reasons: { m1: '통계 설명', m3: '반대 설명, "따옴표"' } }, trackId: pet.id });

  // 교사
  const tt = (await request.post('/api/teacher/login').send({ username: 'kim', password: 'pw' })).body.token;
  r = await request.get('/api/teacher/projects').set(auth(tt));
  check('교사: 수행평가 목록에 조례 포함', r.status === 200 && r.body.some((p) => p.code === 'ordinance'));
  r = await request.get(`/api/teacher/track-distribution/${pid}`).set(auth(tt));
  const petRow = r.body.distribution?.find((d) => d.code === 'pet');
  check('교사: 주제 분포(반려동물 1명, 고정 1)', r.status === 200 && petRow.count === 1 && petRow.locked === 1, r.body);
  r = await request.get(`/api/teacher/track-distribution/${pid}?classId=2`).set(auth(tt));
  check('교사: 반별 분포(테스트반 0명)', r.status === 200 && r.body.total === 0);
  r = await request.get(`/api/teacher/progress/${pid}/1`).set(auth(tt));
  const row = r.body.find((x) => x.student_no === '2101');
  check('교사: 진행 현황에 주제 표시', row.track_code === 'pet' && Number(row.steps_done) === 2, row);
  r = await request.get(`/api/teacher/archives/${enr.id}`).set(auth(tt));
  check('교사: 변경 전 기록 열람', r.status === 200 && r.body.length === 1 && r.body[0].track_code === 'noise');
  const archiveId = r.body[0].id;

  r = await request.get(`/api/teacher/export-answers/${pid}/1`).set(auth(tt));
  check('교사: 답안 CSV에 최종 답안만(반려동물), 변경 전 답 없음',
    r.status === 200 && r.text.includes('반려동물 답') && !r.text.includes('소음 문제가 심각합니다') && r.text.includes('자료1 통계, 자료3 반대 인터뷰'));

  r = await request.get(`/api/teacher/archives/${archiveId}`).set(auth(t1));
  check('학생 토큰으로 보관 기록 열람 불가(401)', r.status === 401);

  r = await request.post(`/api/teacher/archives/${archiveId}/restore`).set(auth(tt));
  check('교사: 되돌리기', r.status === 200);
  const e2 = (await db.query('SELECT * FROM enrollments WHERE id=$1', [enr.id])).rows[0];
  const resp = (await db.query('SELECT s.step_key, r.answer FROM responses r JOIN steps s ON s.id=r.step_id WHERE enrollment_id=$1', [enr.id])).rows;
  check('되돌린 뒤 주제=소음(고정), 소음 답안 복구',
    e2.track_id === noise.id && e2.track_locked && resp.find((x) => x.step_key === 'o3').answer.q1 === o3.q1 && !resp.some((x) => x.step_key === 'o6'));
  arch = (await db.query('SELECT * FROM response_archives WHERE enrollment_id=$1 ORDER BY id', [enr.id])).rows;
  check('되돌리기 직전 답안(반려동물)도 보관됨', arch.length === 2 && arch[1].reason === 'before_restore' && arch[1].answers.o6.checked.length === 2 && arch[0].restored_at);

  // A~E 채점
  r = await request.get(`/api/teacher/grades/${pid}/${enr.id}`).set(auth(tt));
  check('교사: 채점 항목에 A~E 점수표 포함', r.status === 200 && Array.isArray(r.body.items[0].scale));
  await request.put(`/api/teacher/grades/${enr.id}/${r.body.items[0].id}`).set(auth(tt)).send({ score: 16 });
  r = await request.get(`/api/teacher/export/${pid}/1`).set(auth(tt));
  check('교사: 결과 CSV 총점 반영', r.status === 200 && r.text.includes('"16"'));

  // 제출 후 잠금
  r = await request.post(`/api/student/enrollments/${enr.id}/submit`).set(auth(t1));
  check('제출', r.status === 200);
  r = await request.post(`/api/student/enrollments/${enr.id}/change-track`).set(auth(t1));
  check('제출 후 주제 변경 불가(409)', r.status === 409);
  r = await request.put(`/api/student/enrollments/${enr.id}/responses/${stepId.o3}`).set(auth(t1)).send({ answer: {}, trackId: noise.id });
  check('제출 후 저장 불가(409)', r.status === 409);

  // 교사 제출 취소 → 다시 고치고 재제출
  r = await request.post(`/api/teacher/enrollments/${enr.id}/unsubmit`).set(auth(t1));
  check('학생 토큰으로 제출 취소 불가(401)', r.status === 401);
  r = await request.post(`/api/teacher/enrollments/${enr.id}/unsubmit`).set(auth(tt));
  check('교사: 제출 취소', r.status === 200 && r.body.submitted_at === null);
  const g = (await db.query('SELECT COUNT(*)::int AS n FROM grades WHERE enrollment_id=$1', [enr.id])).rows[0].n;
  check('제출 취소해도 점수는 그대로', g === 1);
  r = await request.put(`/api/student/enrollments/${enr.id}/responses/${stepId.o3}`).set(auth(t1)).send({ answer: { q1: '다시 고침' }, trackId: noise.id });
  check('제출 취소 후 다시 저장 가능', r.status === 200);
  r = await request.post(`/api/student/enrollments/${enr.id}/submit`).set(auth(t1));
  check('다시 제출 가능', r.status === 200);

  // 열람 모드
  await db.query('UPDATE projects SET review_only = true WHERE id=$1', [pid]);
  await db.query('DELETE FROM class_schedules');
  r = await request.get('/api/student/projects/ordinance').set(auth(t1));
  check('열람 모드: 응시 시간 밖에도 기록 열람 + 주제 목록 포함', r.status === 200 && r.body.reviewOnly && r.body.tracks.length === 6);
  r = await request.post(`/api/student/enrollments/${enr.id}/change-track`).set(auth(t1));
  check('열람 모드: 주제 변경 불가(423)', r.status === 423);

  // 관광정책은 그대로
  const tour = (await db.query("SELECT COUNT(*)::int AS n FROM projects WHERE code='tourism'")).rows[0].n;
  check('관광정책 프로젝트는 건드리지 않음(없으면 0)', tour === 0);

  console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
  await db.pool.end();
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
