// server/db/migrate.js
// 서버가 켜질 때 한 번 실행된다. 나중에 추가된 컬럼·표를 "없을 때만" 만들어 넣는다.
// 몇 번을 실행해도 결과가 같고(멱등), 기존 학생 답안·점수는 건드리지 않는다.
const { seedOrdinance } = require('./ordinance_seed');

async function ensureSchema(db) {
  // 열람 모드(수행평가 종료 후 보기 전용)
  await db.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS review_only BOOLEAN NOT NULL DEFAULT false');

  // 채점 단계 점수표(조례: A~E 5단계). 없으면 기존 상/중/하 방식으로 채점한다.
  await db.query('ALTER TABLE rubric_items ADD COLUMN IF NOT EXISTS scale JSONB');

  // 주제 변경 전 답안 보관(교사만 열람·복구)
  await db.query(`
    CREATE TABLE IF NOT EXISTS response_archives (
      id            SERIAL PRIMARY KEY,
      enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      track_id      INTEGER REFERENCES tracks(id),
      answers       JSONB NOT NULL DEFAULT '{}',
      reason        VARCHAR(30) NOT NULL DEFAULT 'track_change',
      archived_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      restored_at   TIMESTAMPTZ
    )`);
  await db.query('CREATE INDEX IF NOT EXISTS idx_response_archives_enrollment ON response_archives(enrollment_id)');

  // 조례 수행평가 기본 틀
  await seedOrdinance(db);
}

module.exports = { ensureSchema };
