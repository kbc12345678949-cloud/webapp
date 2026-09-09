// server/test_seed_production.js
const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');

async function main() {
  const mem = newDb({ autoCreateForeignKeyIndices: true });
  mem.public.registerFunction({ name: 'now', returns: 'timestamptz', implementation: () => new Date() });
  const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
  mem.public.none(schema);

  const pgMemAdapter = mem.adapters.createPg();
  const { Pool } = pgMemAdapter;
  const pool = new Pool();

  const { seed } = require('./db/seed_production');
  const result = await seed(pool);

  let pass = 0, fail = 0;
  const check = (name, cond) => { if (cond) { console.log('✅', name); pass++; } else { console.log('❌', name); fail++; } };

  const steps = await pool.query('SELECT * FROM steps WHERE project_id = $1 ORDER BY display_order', [result.projectId]);
  check('스텝 9개 생성', steps.rows.length === 9);
  check('스텝 순서 정확(step0가 첫번째)', steps.rows[0].step_key === 'step0');
  check('스텝 순서 정확(step9가 마지막)', steps.rows[8].step_key === 'step9');

  const step1Materials = await pool.query(
    'SELECT * FROM materials WHERE project_id = $1 AND step_id = $2 ORDER BY display_order',
    [result.projectId, result.stepIds.step1]
  );
  check('STEP1 자료 7개', step1Materials.rows.length === 7);
  check('STEP1 자료1 제목 정확', step1Materials.rows[0].title === '자료 1. 방문객 수 추이');
  check('STEP1 자료3 아이콘=person(interview)', step1Materials.rows[2].material_type === 'interview');

  const step4Materials = await pool.query(
    'SELECT * FROM materials WHERE project_id = $1 AND step_id = $2 ORDER BY display_order',
    [result.projectId, result.stepIds.step4]
  );
  check('STEP4 자료 3개', step4Materials.rows.length === 3);
  check('STEP4 자료1 제목 정확', step4Materials.rows[0].title === '임대료 추이 자료');

  let totalQuestions = 0;
  for (const m of step1Materials.rows) {
    const q = await pool.query('SELECT * FROM check_questions WHERE material_id = $1', [m.id]);
    totalQuestions += q.rows.length;
  }
  check('STEP1 확인 문제 총 10개', totalQuestions === 10);

  const m1Questions = await pool.query('SELECT * FROM check_questions WHERE material_id = $1 ORDER BY id', [
    step1Materials.rows[0].id,
  ]);
  check('자료1 Q1 정답 인덱스=2', m1Questions.rows[0].answer === '2');
  check('자료1 Q1 보기 4개 JSON 정상', m1Questions.rows[0].options.length === 4);

  const stakeholders = await pool.query('SELECT * FROM stakeholders WHERE project_id = $1 ORDER BY display_order', [
    result.projectId,
  ]);
  check('이해관계자 6명', stakeholders.rows.length === 6);
  check('이해관계자1 이름 정확', stakeholders.rows[0].name === '원도심 임차 상인');
  check('이해관계자1 연결자료 라벨 정확', stakeholders.rows[0].linked_material_label === '자료 3에서 만난 분');
  check('이해관계자2(건물주) 연결자료 없음(NULL)', stakeholders.rows[1].linked_material_label === null);

  const rubric = await pool.query('SELECT * FROM rubric_items WHERE project_id = $1 ORDER BY display_order', [
    result.projectId,
  ]);
  check('루브릭 6개 항목', rubric.rows.length === 6);
  check('루브릭 하 점수 합계 30점', rubric.rows.reduce((s, r) => s + r.base_score, 0) === 30);
  check('루브릭 상 점수 합계 100점', rubric.rows.reduce((s, r) => s + r.max_score, 0) === 100);

  console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('테스트 실행 중 오류:', e);
  process.exit(1);
});
