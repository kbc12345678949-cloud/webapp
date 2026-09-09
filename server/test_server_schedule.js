// server/test_server_schedule.js
// 반 3개(2학년 1~3반)가 필요한 예약 시간표 테스트 전용 서버.
const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function main() {
  const port = process.env.TEST_PORT || 3993;
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

  // 반을 일부러 뒤죽박죽 순서(테스트반이 먼저)로 만들어, ID가 1·2·3반과 안 맞는 상태에서 시작한다.
  // 이름 기반으로 실제 ID를 찾는 방식이 순서와 무관하게 안전한지 이 파일 전체가 이 상태로 검증한다.
  await pool.query(
    `INSERT INTO classes (name) VALUES ('테스트반'), ('2학년 1반'), ('2학년 2반'), ('2학년 3반')`
  );
  await pool.query(
    `INSERT INTO projects (code, title, base_score, max_score) VALUES ('tourism','관광 정책 결정 시뮬레이션',30,100)`
  );

  const pwHash = await bcrypt.hash('teacher1234', 10);
  await pool.query(`INSERT INTO teachers (username, password_hash) VALUES ('kim', $1)`, [pwHash]);

  app.listen(port, () => console.log(`TEST_SERVER_READY:${port}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
