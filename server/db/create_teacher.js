// server/db/create_teacher.js
// 실제 배포 후, 선생님 본인의 교사 계정을 만드는 스크립트.
// 아이디·비밀번호를 코드에 적지 않고, 실행할 때 직접 입력받는다.
//
// 실행: DATABASE_URL=postgres://... node db/create_teacher.js <아이디> <비밀번호>
const bcrypt = require('bcryptjs');

async function createTeacher(pool, username, password) {
  if (!username || !password) {
    throw new Error('아이디와 비밀번호를 모두 입력해주세요.');
  }
  if (password.length < 8) {
    throw new Error('비밀번호는 최소 8자 이상으로 설정해주세요.');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO teachers (username, password_hash) VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = $2
     RETURNING id, username`,
    [username, passwordHash]
  );
  return rows[0];
}

module.exports = { createTeacher };

if (require.main === module) {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error('사용법: node db/create_teacher.js <아이디> <비밀번호>');
    process.exit(1);
  }
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  createTeacher(pool, username, password)
    .then((teacher) => {
      console.log(`교사 계정이 생성/갱신되었습니다: ${teacher.username}`);
      return pool.end();
    })
    .catch((e) => {
      console.error('실패:', e.message);
      process.exit(1);
    });
}
