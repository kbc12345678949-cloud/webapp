// server/db/ordinance_seed.js
// '생활 속 문제, 조례로 답하다' 수행평가의 기본 틀(프로젝트·주제 6개·단계·채점 요소)을 DB에 넣는다.
// 서버가 켜질 때마다 실행되지만, 이미 있으면 내용만 최신으로 맞추고 학생 답안은 절대 건드리지 않는다.
// 자료·발문 같은 화면 내용은 client/src/ordinance/content.js에 있다(DB에 넣지 않음).

const ORDINANCE_CODE = 'ordinance';

const TRACKS = [
  ['noise', '① 오토바이·확성기 소음 규제', 1],
  ['curfew', '② 심야 청소년 출입 제한 구역', 2],
  ['pet', '③ 반려동물 동반 공공장소 확대', 3],
  ['bike', '④ 자전거 전용도로 확충', 4],
  ['schoolzone', '⑤ 등하교 안전 존(스쿨존) 강화', 5],
  ['disposable', '⑥ 일회용품 사용 제한', 6],
];

// 3~8단계: 단계마다 답안 한 묶음(JSON)으로 저장한다.
const STEPS = [
  ['o3', 3, 'writing', '3단계 문제 인식'],
  ['o4', 4, 'writing', '4단계 정책 대안'],
  ['o5', 5, 'writing', '5단계 이해관계자'],
  ['o6', 6, 'writing', '6단계 근거 정리'],
  ['o7', 7, 'writing', '7단계 정치 과정과 지방 자치'],
  ['o8', 8, 'reflection', '8단계 성찰'],
];

// 학교 제출 기준 A~E 5단계. scale = [A, B, C, D, E]
const RUBRIC = [
  ['problem', '① 문제 인식 및 진단', [20, 16, 12, 8, 5], 1],
  ['policy', '② 정책 대안 수립', [25, 21, 17, 13, 10], 2],
  ['stakeholder', '③ 이해관계 분석 및 설득 전략', [25, 21, 17, 13, 10], 3],
  ['evidence', '④ 근거 활용', [20, 16, 12, 8, 5], 4],
  ['reflection', '⑤ 성찰', [10, 8, 6, 3, 0], 5],
];

async function seedOrdinance(db) {
  await db.query(
    `INSERT INTO projects (code, title, base_score, max_score)
     VALUES ($1, '생활 속 문제, 조례로 답하다', 30, 100)
     ON CONFLICT (code) DO NOTHING`,
    [ORDINANCE_CODE]
  );
  const { rows } = await db.query('SELECT id FROM projects WHERE code = $1', [ORDINANCE_CODE]);
  const projectId = rows[0].id;

  for (const [code, title, order] of TRACKS) {
    await db.query(
      `INSERT INTO tracks (project_id, code, title, display_order) VALUES ($1, $2, $3, $4)
       ON CONFLICT (project_id, code) DO UPDATE SET title = EXCLUDED.title, display_order = EXCLUDED.display_order`,
      [projectId, code, title, order]
    );
  }
  for (const [key, order, type, title] of STEPS) {
    await db.query(
      `INSERT INTO steps (project_id, step_key, display_order, step_type, title) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (project_id, step_key) DO UPDATE
         SET display_order = EXCLUDED.display_order, step_type = EXCLUDED.step_type, title = EXCLUDED.title`,
      [projectId, key, order, type, title]
    );
  }
  for (const [key, title, scale, order] of RUBRIC) {
    await db.query(
      `INSERT INTO rubric_items (project_id, item_key, title, max_score, mid_score, base_score, display_order, scale)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (project_id, item_key) DO UPDATE
         SET title = EXCLUDED.title, max_score = EXCLUDED.max_score, mid_score = EXCLUDED.mid_score,
             base_score = EXCLUDED.base_score, display_order = EXCLUDED.display_order, scale = EXCLUDED.scale`,
      [projectId, key, title, scale[0], scale[2], scale[4], order, JSON.stringify(scale)]
    );
  }
  return projectId;
}

module.exports = { seedOrdinance, ORDINANCE_CODE };
