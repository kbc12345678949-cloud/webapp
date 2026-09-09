// server/test_server_standalone.js
// pg-mem으로 가짜 DB를 띄우고, 실제 Express 서버를 지정된 포트에서 실행한다.
// 프런트엔드 통합 테스트가 이 서버에 진짜 HTTP 요청을 보낸다.
const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function main() {
  const port = process.env.TEST_PORT || 3999;
  const mem = newDb({ autoCreateForeignKeyIndices: true });
  mem.public.registerFunction({ name: 'now', returns: 'timestamptz', implementation: () => new Date() });
  const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
  mem.public.none(schema);

  const pgMemAdapter = mem.adapters.createPg();
  const Module = require('module');
  const originalLoad = Module._load;
  Module._load = function (request, ...args) {
    if (request === 'pg') return pgMemAdapter;
    return originalLoad.call(this, request, ...args);
  };

  const { createApp } = require('./app');
  const app = createApp();

  const { Pool } = pgMemAdapter;
  const pool = new Pool();

  // 시드 데이터: 교사 1명, 프로젝트 1개, 반 1개, STEP3/STEP8 응답 여러 개
  await pool.query(`INSERT INTO classes (name) VALUES ('2학년 1반')`);
  await pool.query(
    `INSERT INTO projects (code, title, base_score, max_score) VALUES ('tourism','관광 정책 결정 시뮬레이션',30,100)`
  );
  await pool.query(
    `INSERT INTO steps (project_id, step_key, display_order, step_type, title) VALUES
     (1,'step3',0,'choice','1차 판단'), (1,'step8',1,'writing','최종 결정')`
  );
  const start = new Date(Date.now() - 60000).toISOString();
  const end = new Date(Date.now() + 3600000).toISOString();
  await pool.query(
    `INSERT INTO class_schedules (project_id, class_id, session_no, starts_at, ends_at) VALUES (1,1,1,$1,$2)`,
    [start, end]
  );
  const pwHash = await bcrypt.hash('teacher1234', 10);
  await pool.query(`INSERT INTO teachers (username, password_hash) VALUES ('kim', $1)`, [pwHash]);

  // 가상 학생 5명의 STEP3 응답(A:1, B:3, C:1)과 STEP8 응답(A:0, B:2, C:3) 시딩
  const step3Choices = ['A', 'B', 'B', 'B', 'C'];
  const step8Choices = ['B', 'B', 'C', 'C', 'C'];
  for (let i = 0; i < 5; i++) {
    await pool.query(`INSERT INTO students (class_id, student_no, name) VALUES (1, $1, $2)`, [
      `1010${i}`,
      `학생${i}`,
    ]);
    const enroll = await pool.query(`INSERT INTO enrollments (project_id, student_id) VALUES (1, $1) RETURNING id`, [
      i + 1,
    ]);
    const enrollId = enroll.rows[0].id;
    await pool.query(`INSERT INTO responses (enrollment_id, step_id, answer) VALUES ($1, 1, $2)`, [
      enrollId,
      JSON.stringify({ choice: step3Choices[i] }),
    ]);
    await pool.query(`INSERT INTO responses (enrollment_id, step_id, answer) VALUES ($1, 2, $2)`, [
      enrollId,
      JSON.stringify({ choice: step8Choices[i] }),
    ]);
  }

  app.listen(port, () => {
    console.log(`TEST_SERVER_READY:${port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
