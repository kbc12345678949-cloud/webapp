// server/db/migrate.js
// 서버가 켜질 때마다 자동으로 실행되는 "부족한 컬럼 채워넣기".
// 이미 운영 중인 DB(Render)는 schema.sql을 다시 돌리지 않으므로, 나중에 추가된 컬럼은 여기서 만들어준다.
// IF NOT EXISTS라서 여러 번 실행돼도 안전하고, 기존 데이터(학생 답안 등)는 전혀 건드리지 않는다.
async function ensureSchema(db) {
  await db.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS review_only BOOLEAN NOT NULL DEFAULT false');
}

module.exports = { ensureSchema };
