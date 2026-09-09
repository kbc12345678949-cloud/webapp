// server/test_server_login.js
// 학생 로그인 흐름 테스트 전용. test_server_standalone.js와 달리
// STEP 응답을 미리 심어두지 않는다(로그인 직후 STEP0으로 가는지가 검증 대상이므로).
const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function main() {
  const port = process.env.TEST_PORT || 3992;
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

  await pool.query(`INSERT INTO classes (name) VALUES ('2학년 1반'), ('2학년 2반')`);
  await pool.query(
    `INSERT INTO projects (code, title, base_score, max_score) VALUES ('tourism','관광 정책 결정 시뮬레이션',30,100)`
  );
  await pool.query(
    `INSERT INTO steps (project_id, step_key, display_order, step_type, title) VALUES (1,'step0',0,'intro','역할 소개')`
  );
  await pool.query(`INSERT INTO students (class_id, student_no, name) VALUES (1, '10100', '학생0')`);

  const start = new Date(Date.now() - 60000).toISOString();
  const end = new Date(Date.now() + 3600000).toISOString();
  await pool.query(
    `INSERT INTO class_schedules (project_id, class_id, session_no, starts_at, ends_at) VALUES (1,1,1,$1,$2)`,
    [start, end]
  );
  const pwHash = await bcrypt.hash('teacher1234', 10);
  await pool.query(`INSERT INTO teachers (username, password_hash) VALUES ('kim', $1)`, [pwHash]);

  app.listen(port, () => console.log(`TEST_SERVER_READY:${port}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
