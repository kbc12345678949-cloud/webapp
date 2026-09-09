// server/test_api.js
// pg-mem으로 가짜 PostgreSQL을 메모리에 띄우고, 실제 Express 서버에 진짜 HTTP 요청을 보내 검증한다.
const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function main() {
  // 1. 메모리 DB 생성 + 우리 스키마 그대로 적용
  const mem = newDb({ autoCreateForeignKeyIndices: true });
  mem.public.registerFunction({ name: 'now', returns: 'timestamptz', implementation: () => new Date() });

  const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
  mem.public.none(schema);
  console.log('✅ 스키마 적용 성공');

  // 2. pg 모듈을 pg-mem 버전으로 교체 (실제 소스 코드는 전혀 안 건드림)
  const pgMemAdapter = mem.adapters.createPg();
  const Module = require('module');
  const originalResolve = Module._resolveFilename;
  const originalLoad = Module._load;
  Module._load = function (request, ...args) {
    if (request === 'pg') return pgMemAdapter;
    return originalLoad.call(this, request, ...args);
  };

  const { createApp } = require('./app');
  const app = createApp();
  const request = require('supertest')(app);

  // 3. 기초 데이터 시딩
  const { Pool } = pgMemAdapter;
  const pool = new Pool();

  await pool.query(`INSERT INTO classes (name) VALUES ('2학년 1반')`);
  await pool.query(`INSERT INTO students (class_id, student_no, name) VALUES (1, '10115', '홍길동')`);
  await pool.query(`INSERT INTO students (class_id, student_no, name) VALUES (1, '10116', '김철수')`); // 교차 접근 테스트용
  await pool.query(
    `INSERT INTO projects (code, title, base_score, max_score) VALUES ('tourism','관광 정책 결정 시뮬레이션',30,100)`
  );
  await pool.query(
    `INSERT INTO steps (project_id, step_key, display_order, step_type, title, min_chars) VALUES
     (1,'step0',0,'intro','역할 소개',NULL),
     (1,'step3',1,'choice','1차 판단',100)`
  );
  await pool.query(
    `INSERT INTO materials (project_id, track_id, material_key, display_order, material_type, title, body, icon)
     VALUES (1, NULL, 'm1', 1, 'stat', '방문객 수 추이', '2026년 490만 명', 'chart')`
  );
  // 응시 시간: 지금부터 1시간 열려있는 것으로 설정
  const start = new Date(Date.now() - 60000).toISOString();
  const end = new Date(Date.now() + 3600000).toISOString();
  await pool.query(
    `INSERT INTO class_schedules (project_id, class_id, session_no, starts_at, ends_at) VALUES (1,1,1,$1,$2)`,
    [start, end]
  );
  const pwHash = await bcrypt.hash('teacher1234', 10);
  await pool.query(`INSERT INTO teachers (username, password_hash) VALUES ('kim', $1)`, [pwHash]);

  console.log('✅ 테스트 데이터 시딩 성공');

  // 4. 실제 HTTP 요청 테스트
  let pass = 0, fail = 0;
  const check = (name, cond) => { if (cond) { console.log('✅', name); pass++; } else { console.log('❌', name); fail++; } };

  // 4-1. 학생 로그인
  const loginRes = await request.post('/api/student/login').send({ className: '2학년 1반', studentNo: '10115' });
  check('학생 로그인 200', loginRes.status === 200 && loginRes.body.token);
  const studentToken = loginRes.body.token;

  // 4-2. 잘못된 학번으로 로그인 실패
  const badLogin = await request.post('/api/student/login').send({ className: '2학년 1반', studentNo: '99999' });
  check('잘못된 학번 → 404', badLogin.status === 404);

  // 4-3. 프로젝트 진입 (응시 시간 열려있음 → 성공)
  const enterRes = await request.get('/api/student/projects/tourism').set('Authorization', `Bearer ${studentToken}`);
  check('프로젝트 진입 200', enterRes.status === 200);
  check('스텝 2개 반환', enterRes.body.steps && enterRes.body.steps.length === 2);
  const enrollmentId = enterRes.body.enrollment.id;

  // 4-4. 자료 목록 조회
  const matRes = await request.get('/api/student/projects/1/materials').set('Authorization', `Bearer ${studentToken}`);
  check('자료 목록 200, 1개', matRes.status === 200 && matRes.body.length === 1);

  // 4-5. 답안 저장 (자동저장)
  const step3 = enterRes.body.steps.find((s) => s.step_key === 'step3');
  const saveRes = await request
    .put(`/api/student/enrollments/${enrollmentId}/responses/${step3.id}`)
    .set('Authorization', `Bearer ${studentToken}`)
    .send({ answer: { choice: 'B', text: 'B안을 선택하는 근거는...' } });
  check('답안 저장 200', saveRes.status === 200 && saveRes.body.saved === true);

  // 4-5b. 다른 학생(김철수)이 아직 제출 전인 홍길동의 enrollment를 건드리려는 시도 → 소유권 검증만으로 차단되어야 함
  const otherLoginRes = await request.post('/api/student/login').send({ className: '2학년 1반', studentNo: '10116' });
  const otherToken = otherLoginRes.body.token;

  const crossSaveRes = await request
    .put(`/api/student/enrollments/${enrollmentId}/responses/${step3.id}`)
    .set('Authorization', `Bearer ${otherToken}`)
    .send({ answer: { choice: '해킹시도' } });
  check('다른 학생이 남의 답안 저장 시도 → 차단(403)', crossSaveRes.status === 403);

  const crossSubmitRes = await request
    .post(`/api/student/enrollments/${enrollmentId}/submit`)
    .set('Authorization', `Bearer ${otherToken}`);
  check('다른 학생이 남의 것을 대신 제출 시도 → 차단(403)', crossSubmitRes.status === 403);

  // 원래 학생 답안이 "해킹시도"로 덮어써지지 않고 그대로인지 확인
  const teacherLoginForCheck = await request.post('/api/teacher/login').send({ username: 'kim', password: 'teacher1234' });
  const checkNotOverwritten = await request
    .get(`/api/teacher/responses/${enrollmentId}`)
    .set('Authorization', `Bearer ${teacherLoginForCheck.body.token}`);
  const step3Response = checkNotOverwritten.body.find((r) => r.step_key === 'step3');
  check('교차 접근 시도 이후에도 원래 답안이 그대로 보존됨', step3Response.answer.choice === 'B');

  // 4-6. 최종 제출
  const submitRes = await request
    .post(`/api/student/enrollments/${enrollmentId}/submit`)
    .set('Authorization', `Bearer ${studentToken}`);
  check('최종 제출 200', submitRes.status === 200 && submitRes.body.submitted_at);

  // 4-7. 제출 후 재수정 시도 → 차단되어야 함
  const reSaveRes = await request
    .put(`/api/student/enrollments/${enrollmentId}/responses/${step3.id}`)
    .set('Authorization', `Bearer ${studentToken}`)
    .send({ answer: { choice: 'C' } });
  check('제출 후 수정 차단(409)', reSaveRes.status === 409);

  // 4-8. 교사 로그인
  const teacherLogin = await request.post('/api/teacher/login').send({ username: 'kim', password: 'teacher1234' });
  check('교사 로그인 200', teacherLogin.status === 200 && teacherLogin.body.token);
  const teacherToken = teacherLogin.body.token;

  // 4-9. 틀린 비밀번호
  const badTeacherLogin = await request.post('/api/teacher/login').send({ username: 'kim', password: 'wrong' });
  check('교사 잘못된 비밀번호 401', badTeacherLogin.status === 401);

  // 4-10. 실시간 집계 (STEP3에 B안 1명 제출됨)
  const distRes = await request
    .get('/api/teacher/distribution/1/step3')
    .set('Authorization', `Bearer ${teacherToken}`);
  check('실시간 집계 200', distRes.status === 200);
  check('집계에 B안 1명 포함', distRes.body.distribution.some((d) => d.choice === 'B' && Number(d.count) === 1));

  // 4-11. 반별 진행 현황
  const progRes = await request
    .get('/api/teacher/progress/1/1')
    .set('Authorization', `Bearer ${teacherToken}`);
  check('진행 현황 200, 2명', progRes.status === 200 && progRes.body.length === 2);

  // 4-12. 학생 토큰으로 교사 API 접근 시도 → 차단
  const forbidden = await request.get('/api/teacher/progress/1/1').set('Authorization', `Bearer ${studentToken}`);
  check('학생이 교사 API 접근 시 차단(401)', forbidden.status === 401);

  console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
  Module._load = originalLoad;
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('테스트 실행 중 오류:', e);
  process.exit(1);
});
