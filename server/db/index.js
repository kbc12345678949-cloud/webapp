// server/db/index.js
// 실제 배포 시에는 pg.Pool을 그대로 쓰고, 환경변수(DATABASE_URL)만 연결하면 됩니다.
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render')
    ? { rejectUnauthorized: false }
    : false,
  // 기본값(10)은 가장 인원이 많은 반(22명)이 동시에 접속할 때 병목이 될 수 있어
  // 실제 최대 학급 인원보다 여유 있게 25로 늘려둔다. (Render Postgres 인스턴스 자체의 최대 연결 수 안에서 설정)
  max: 25,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
