// server/db/resync_materials.js
// STEP1(자료1~7)·STEP4(자료 3종)·이해관계자 6명 내용을, client/src/data 파일의
// "지금" 내용으로 운영 DB에 다시 맞춘다. seed_production.js와 마찬가지로 client/src/data/*.js
// 원본을 실행 시점에 그대로 불러오므로, 화면에 보이는 내용과 항상 동일함이 보장된다
// (따로 복사해둔 사본이 없어서, 나중에 자료 문구를 고쳐도 이 파일을 별도로 고칠 필요가 없다).
//
// 새 자료를 "추가"하는 게 아니라, key가 이미 일치하는 항목의 문구만 최신 내용으로
// 덮어쓴다. 학생 응답(responses)에는 전혀 손대지 않는다.
//
// 실행: DATABASE_URL=postgres://... node db/resync_materials.js
const path = require('path');

async function resyncMaterials(pool, projectCode = 'tourism') {
  const clientSrc = path.resolve(__dirname, '../../client/src');
  const { materials: step1Materials } = await import(path.join(clientSrc, 'data/step1Materials.js'));
  const { step4Materials } = await import(path.join(clientSrc, 'data/step4Materials.js'));
  const { mockStakeholders } = await import(path.join(clientSrc, 'data/stakeholders.test-fixture.js'));

  const proj = await pool.query('SELECT id FROM projects WHERE code = $1', [projectCode]);
  if (proj.rows.length === 0) throw new Error(`프로젝트(${projectCode})를 찾을 수 없습니다.`);
  const projectId = proj.rows[0].id;

  let materialsUpdated = 0;
  let questionsUpdated = 0;
  let stakeholdersUpdated = 0;
  let notFound = [];

  for (const m of [...step1Materials, ...step4Materials]) {
    const mat = await pool.query(
      `UPDATE materials SET title = $1, body = $2 WHERE project_id = $3 AND material_key = $4 RETURNING id`,
      [m.title, m.body, projectId, m.key]
    );
    if (mat.rows.length === 0) {
      notFound.push(m.key);
      continue;
    }
    materialsUpdated++;
    const materialId = mat.rows[0].id;

    for (const q of m.questions || []) {
      const answer = q.type === 'mc' ? String(q.answerIndex) : String(q.answer);
      const options = q.options ? JSON.stringify(q.options) : null;
      const result = await pool.query(
        `UPDATE check_questions SET prompt = $1, options = $2, answer = $3
         WHERE material_id = $4 AND question_type = $5 RETURNING id`,
        [q.prompt, options, answer, materialId, q.type]
      );
      questionsUpdated += result.rows.length;
    }
  }

  for (const s of mockStakeholders) {
    const result = await pool.query(
      `UPDATE stakeholders SET name = $1, wants = $2, benefit = $3, harm = $4, core_value = $5, linked_material_label = $6
       WHERE project_id = $7 AND stakeholder_key = $8 RETURNING id`,
      [s.name, s.wants, s.benefit, s.harm, s.core_value, s.linked_material_label ?? null, projectId, s.stakeholder_key]
    );
    if (result.rows.length === 0) notFound.push(s.stakeholder_key);
    else stakeholdersUpdated++;
  }

  return { materialsUpdated, questionsUpdated, stakeholdersUpdated, notFound };
}

module.exports = { resyncMaterials };

if (require.main === module) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  resyncMaterials(pool)
    .then((result) => {
      console.log(
        `자료 ${result.materialsUpdated}개, 확인 문제 ${result.questionsUpdated}개, 이해관계자 ${result.stakeholdersUpdated}명 최신화 완료.`
      );
      if (result.notFound.length > 0) {
        console.log('DB에서 못 찾은 key(운영 DB에 아예 없던 항목):', result.notFound.join(', '));
      }
      return pool.end();
    })
    .catch((e) => {
      console.error('실패:', e.message);
      process.exit(1);
    });
}
