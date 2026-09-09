-- ============================================================
-- 같은 스키마에 두 프로젝트를 실제로 넣어보는 예시
-- (코드는 하나도 안 바뀌고, 데이터만 다르게 들어간다는 걸 보여주는 샘플)
-- ============================================================

-- 1. 프로젝트 등록 — 이 두 줄만 다르면 서로 다른 수행평가가 됨
INSERT INTO projects (code, title, base_score, max_score) VALUES
  ('tourism',  '관광 정책 결정 시뮬레이션',  30, 100),
  ('ordinance', '생활 속 문제, 조례로 답하다', 30, 100);

-- 2. 스텝 등록 — 관광정책은 10개, 조례는 7개. 개수가 달라도 테이블 구조는 동일
INSERT INTO steps (project_id, step_key, display_order, step_type, title, min_chars) VALUES
  -- 관광정책 (project_id = 1)
  (1, 'step0', 0, 'intro',      '역할·상황 소개',        NULL),
  (1, 'step1', 1, 'materials',  '자료 탐색 + 확인 문제',  NULL),
  (1, 'step3', 2, 'choice',     '1차 판단',              100),
  (1, 'step4', 3, 'intro',      '새로운 상황',           NULL),
  (1, 'step5', 4, 'choice',     '재판단',                50),
  (1, 'step6', 5, 'materials',  '이해관계자 분석',        NULL),
  (1, 'step7', 6, 'classify',   '트레이드오프 분석',      NULL),
  (1, 'step8', 7, 'writing',    '최종 결정',             NULL),
  (1, 'step9', 8, 'reflection', '성찰',                  30),

  -- 조례 (project_id = 2) — 트랙 선택이 1번으로 추가되고, STEP4(반전) 자체가 없음
  (2, 'track_select', 0, 'intro',      '주제 트랙 선택',    NULL),
  (2, 'step2',  1, 'materials',  '배경 자료 제시',         NULL),
  (2, 'step3',  2, 'writing',    '문제 인식 서술',         120),
  (2, 'step4',  3, 'writing',    '정책 대안 제안',         NULL),
  (2, 'step5',  4, 'writing',    '이해관계자 분석',        NULL),
  (2, 'step6',  5, 'writing',    '근거 정리',              NULL),
  (2, 'step7',  6, 'reflection', '성찰',                   NULL);

-- 3. 트랙 등록 — 조례에만 존재. 관광정책은 이 테이블에 아무 것도 안 넣음
INSERT INTO tracks (project_id, code, title, display_order) VALUES
  (2, 'noise',   '오토바이·확성기 소음 규제 조례',       1),
  (2, 'curfew',  '심야 청소년 출입 제한 구역 지정',      2),
  (2, 'pet',     '반려동물 동반 공공장소 확대',          3);
  -- (자전거·스쿨존·일회용품 트랙도 동일한 형태로 3줄만 더 추가하면 됨)

-- 4. 자료 등록 — track_id가 있으면 그 트랙 전용, NULL이면 프로젝트 공통
--    step_id는 이 자료가 어느 스텝에서 등장하는지를 나타냄 (예: STEP1 자료 vs STEP4 자료)
--    관광정책 steps 삽입 순서상 step0=1, step1=2 이므로 아래는 STEP1용 자료의 예시
INSERT INTO materials (project_id, step_id, track_id, material_key, display_order, material_type, title, body, icon) VALUES
  -- 관광정책: 트랙이 없으므로 track_id는 전부 NULL (공통 자료), STEP1(id=2) 소속
  (1, 2, NULL, 'm1', 1, 'stat', '방문객 수 추이',
   '2024년 250만 명 → 2025년 350만 명 → 2026년 490만 명(각 40% 증가). ☆☆시 인구 20만 명의 24배가 넘는 규모.', 'chart'),

  -- 조례: track_id가 있어 '소음 규제' 트랙에서만 보이는 자료, 조례 프로젝트의 해당 스텝(id는 실제 삽입 순서에 맞게 지정)
  (2, NULL, 1, 'm1', 1, 'stat', '소음 민원 통계',
   '□□시 연간 소음 민원: 2024년 800건 → 2025년 1,200건(50% 증가). 이 중 60%가 오토바이·확성기 관련.', 'chart');

-- 5. 이해관계자 등록 예시 (STEP6·7 공용, project_id + track_id로만 구분됨)
INSERT INTO stakeholders (project_id, track_id, stakeholder_key, display_order, name, wants, benefit, harm, core_value, linked_material_label) VALUES
  (1, NULL, 's1', 1, '원도심 임차 상인', '손님이 꾸준히 오는 것', '매출 상승', '임대료 상승 위험', '생계 안정, 경제성', '자료 3에서 만난 분');
  -- (나머지 5명도 같은 형태로 추가)

-- ============================================================
-- 확인: 프로젝트별로 몇 개의 스텝·자료가 들어갔는지
-- ============================================================
-- SELECT p.title, COUNT(DISTINCT s.id) AS 스텝수, COUNT(DISTINCT m.id) AS 자료수
-- FROM projects p
-- LEFT JOIN steps s ON s.project_id = p.id
-- LEFT JOIN materials m ON m.project_id = p.id
-- GROUP BY p.title;
