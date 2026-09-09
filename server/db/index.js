// server/db/index.js
// 실제 배포 시에는 pg.Pool을 그대로 쓰고, 환경변수(DATABASE_URL)만 연결하면 됩니다.
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render')
    ? { rejectUnauthorized: false }
    : false,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
