// server/db/seed_production.js
// 실제 배포 후 딱 한 번 실행하는 운영용 시드 스크립트.
// client/src/data/*.js 원본을 그대로 불러와 심으므로, 화면에 보이는 내용과 항상 동일함이 보장된다.
// 실행: DATABASE_URL=postgres://... node db/seed_production.js
const path = require('path');

async function seed(pool) {
  const clientSrc = path.resolve(__dirname, '../../client/src');
  const { materials: step1Materials } = await import(path.join(clientSrc, 'data/step1Materials.js'));
  const { step4Materials } = await import(path.join(clientSrc, 'data/step4Materials.js'));
  const { mockStakeholders } = await import(path.join(clientSrc, 'data/stakeholders.test-fixture.js'));

  const project = await pool.query(
    `INSERT INTO projects (code, title, base_score, max_score)
     VALUES ('tourism', '관광 정책 결정 시뮬레이션', 30, 100) RETURNING id`
  );
  const projectId = project.rows[0].id;

  const stepRows = [
    ['step0', 0, 'intro', '역할·상황 소개', null],
    ['step1', 1, 'materials', '자료 탐색 + 확인 문제', null],
    ['step3', 2, 'choice', '1차 판단', 100],
    ['step4', 3, 'intro', '새로운 상황', null],
    ['step5', 4, 'choice', '재판단', 50],
    ['step6', 5, 'materials', '이해관계자 분석', null],
    ['step7', 6, 'classify', '트레이드오프 분석', null],
    ['step8', 7, 'writing', '최종 결정', null],
    ['step9', 8, 'reflection', '성찰', null],
  ];
  const stepIds = {};
  for (const [key, order, type, title, minChars] of stepRows) {
    const r = await pool.query(
      `INSERT INTO steps (project_id, step_key, display_order, step_type, title, min_chars)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [projectId, key, order, type, title, minChars]
    );
    stepIds[key] = r.rows[0].id;
  }

  // STEP1 자료 7종 + 확인 문제
  for (let i = 0; i < step1Materials.length; i++) {
    const m = step1Materials[i];
    const materialType = m.icon === 'person' ? 'interview' : 'stat';
    const mat = await pool.query(
      `INSERT INTO materials (project_id, step_id, track_id, material_key, display_order, material_type, title, body, icon)
       VALUES ($1,$2,NULL,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [projectId, stepIds.step1, m.key, i + 1, materialType, m.title, m.body, m.icon]
    );
    for (const q of m.questions) {
      const answer = q.type === 'mc' ? String(q.answerIndex) : String(q.answer);
      const options = q.options ? JSON.stringify(q.options) : null;
      await pool.query(
        `INSERT INTO check_questions (material_id, question_type, prompt, options, answer)
         VALUES ($1,$2,$3,$4,$5)`,
        [mat.rows[0].id, q.type, q.prompt, options, answer]
      );
    }
  }

  // STEP4 자료 3종
  for (let i = 0; i < step4Materials.length; i++) {
    const m = step4Materials[i];
    await pool.query(
      `INSERT INTO materials (project_id, step_id, track_id, material_key, display_order, material_type, title, body, icon)
       VALUES ($1,$2,NULL,$3,$4,'context',$5,$6,'doc')`,
      [projectId, stepIds.step4, m.key, i + 1, m.title, m.body]
    );
  }

  // 이해관계자 6명
  for (let i = 0; i < mockStakeholders.length; i++) {
    const s = mockStakeholders[i];
    await pool.query(
      `INSERT INTO stakeholders (project_id, track_id, stakeholder_key, display_order, name, wants, benefit, harm, core_value, linked_material_label)
       VALUES ($1,NULL,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [projectId, s.stakeholder_key, i + 1, s.name, s.wants, s.benefit, s.harm, s.core_value, s.linked_material_label]
    );
  }

  // 채점 루브릭 6개 항목
  const rubric = [
    ['materials', '자료 활용 및 이해관계자 파악', 20, 15, 5, 1],
    ['first_judgment', '1차 판단의 논리성', 20, 15, 5, 2],
    ['reconsider', '재판단', 10, 8, 5, 3],
    ['tradeoff', '트레이드오프 분석', 20, 15, 5, 4],
    ['final_decision', '최종 결정 및 보완방안', 20, 15, 5, 5],
    ['reflection', '성찰', 10, 8, 5, 6],
  ];
  for (const [key, title, max, mid, base, order] of rubric) {
    await pool.query(
      `INSERT INTO rubric_items (project_id, item_key, title, max_score, mid_score, base_score, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [projectId, key, title, max, mid, base, order]
    );
  }

  return { projectId, stepIds, materialCount: step1Materials.length + step4Materials.length, stakeholderCount: mockStakeholders.length };
}

module.exports = { seed };

// 직접 실행 시(node db/seed_production.js): 실제 DATABASE_URL로 접속해서 시딩
if (require.main === module) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  seed(pool)
    .then((result) => {
      console.log('시딩 완료:', result);
      return pool.end();
    })
    .catch((e) => {
      console.error('시딩 실패:', e);
      process.exit(1);
    });
}
