// server/test_server_fullflow.js
// STEP0~9 전체 여정 테스트 전용. 자료는 실제 운영용 7개 대신 대표로 2개만 심어
// (플로우 검증이 목적이라 자료 개수 자체는 중요하지 않음) 테스트를 가볍게 유지한다.
const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function main() {
  const port = process.env.TEST_PORT || 3996;
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

  await pool.query(`INSERT INTO classes (name) VALUES ('2학년 1반')`);
  await pool.query(`INSERT INTO students (class_id, student_no, name) VALUES (1, '2103', '김예지')`);
  await pool.query(
    `INSERT INTO projects (code, title, base_score, max_score) VALUES ('tourism','관광 정책 결정 시뮬레이션',30,100)`
  );

  await pool.query(`
    INSERT INTO steps (project_id, step_key, display_order, step_type, title, min_chars) VALUES
    (1,'step0',0,'intro','역할 소개',NULL),
    (1,'step1',1,'materials','자료 탐색',NULL),
    (1,'step3',2,'choice','1차 판단',100),
    (1,'step4',3,'intro','새로운 상황',NULL),
    (1,'step5',4,'choice','재판단',50),
    (1,'step6',5,'materials','이해관계자',NULL),
    (1,'step7',6,'classify','트레이드오프',NULL),
    (1,'step8',7,'writing','최종 결정',NULL),
    (1,'step9',8,'reflection','성찰',NULL)
  `);

  const step1Id = 2; // steps 삽입 순서상 step1의 id

  const m1 = await pool.query(
    `INSERT INTO materials (project_id, step_id, track_id, material_key, display_order, material_type, title, body, icon)
     VALUES (1, $1, NULL, 'm1', 1, 'stat', '자료 1. 방문객 수 추이', '2026년 490만 명, 인구의 24배 규모.', 'doc') RETURNING id`,
    [step1Id]
  );
  await pool.query(
    `INSERT INTO check_questions (material_id, question_type, prompt, options, answer)
     VALUES ($1, 'ox', '방문객 수는 계속 늘고 있다.', NULL, 'true')`,
    [m1.rows[0].id]
  );

  const m2 = await pool.query(
    `INSERT INTO materials (project_id, step_id, track_id, material_key, display_order, material_type, title, body, icon)
     VALUES (1, $1, NULL, 'm2', 2, 'interview', '자료 2. 임차 상인 인터뷰', '매출은 늘었지만 임대료가 걱정입니다.', 'person') RETURNING id`,
    [step1Id]
  );
  await pool.query(
    `INSERT INTO check_questions (material_id, question_type, prompt, options, answer)
     VALUES ($1, 'mc', '상인이 가장 걱정하는 것은?', '["매출 감소","임대료 상승","관광객 감소","경쟁 심화"]', '1')`,
    [m2.rows[0].id]
  );

  // STEP4 전용 자료 (STEP1과 같은 프로젝트지만 step_id로 구분되어 섞이지 않는다)
  const step4Id = 4; // steps 삽입 순서상 step4의 id
  await pool.query(
    `INSERT INTO materials (project_id, step_id, track_id, material_key, display_order, material_type, title, body, icon) VALUES
     (1, $1, NULL, 'n1', 1, 'stat', '임대료 추이 자료', '최근 3년간 원도심 임대료가 평균 2.4배 상승했다.', 'doc'),
     (1, $1, NULL, 'n2', 2, 'context', '재정 부서 메모', '공모 사업비 30억 원은 시설 조성용 1회성 예산이다.', 'doc')`,
    [step4Id]
  );

  // 이해관계자 6명 (STEP6·7 공용)
  await pool.query(`
    INSERT INTO stakeholders (project_id, track_id, stakeholder_key, display_order, name, wants, benefit, harm, core_value, linked_material_label) VALUES
    (1, NULL, 's1', 1, '원도심 임차 상인', '손님이 꾸준히 오는 것', '매출 상승', '임대료 상승 위험', '생계 안정, 경제성', '자료 2에서 만난 분'),
    (1, NULL, 's2', 2, '건물주(임대인)', '건물 가치 상승', '임대료·자산 가치 상승', '빈 상가 증가 위험', '재산권, 투자 회수', NULL),
    (1, NULL, 's3', 3, '오래 거주한 주민', '조용한 생활', '편의시설 정비', '야간 소음, 사생활 침해', '주거 안정, 생활권', NULL),
    (1, NULL, 's4', 4, '지역 청년', '지역에서 자리 잡는 것', '일자리·창업 기회', '임대료 상승으로 창업 장벽', '기회, 지역 정착', NULL),
    (1, NULL, 's5', 5, '숙박업 종사자', '영업 지속', '매출 증가', '신규 허가 제한 시 확장 제약', '영업의 자유', NULL),
    (1, NULL, 's6', 6, '시 재정 담당 부서', '예산의 지속 가능한 배분', '세수 증가', '경상비 부담', '예산 효율성', NULL)
  `);

  const start = new Date(Date.now() - 60000).toISOString();
  const end = new Date(Date.now() + 3600000).toISOString();
  await pool.query(
    `INSERT INTO class_schedules (project_id, class_id, session_no, starts_at, ends_at) VALUES (1,1,1,$1,$2)`,
    [start, end]
  );

  const pwHash = await bcrypt.hash('teacher1234', 10);
  await pool.query(`INSERT INTO teachers (username, password_hash) VALUES ('kim', $1)`, [pwHash]);

  // 루브릭 6개 항목 (상/중/하 점수, 하 합계=30점 기본점수 원칙)
  await pool.query(`
    INSERT INTO rubric_items (project_id, item_key, title, max_score, mid_score, base_score, display_order) VALUES
    (1, 'materials', '자료 활용 및 이해관계자 파악', 20, 15, 5, 1),
    (1, 'first_judgment', '1차 판단의 논리성', 20, 15, 5, 2),
    (1, 'reconsider', '재판단', 10, 8, 5, 3),
    (1, 'tradeoff', '트레이드오프 분석', 20, 15, 5, 4),
    (1, 'final_decision', '최종 결정 및 보완방안', 20, 15, 5, 5),
    (1, 'reflection', '성찰', 10, 8, 5, 6)
  `);

  app.listen(port, () => console.log(`TEST_SERVER_READY:${port}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
