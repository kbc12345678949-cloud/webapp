-- ============================================================
-- 정치 수행평가 웹앱 데이터베이스 스키마
-- 관광정책결정 시뮬레이션 + 생활 속 문제, 조례로 답하다
-- "틀은 하나, 내용은 프로젝트별로 다르게 불러온다" 설계 원칙
-- ============================================================

-- 1. 프로젝트: 두 수행평가(관광정책 / 조례)를 구분하는 최상위 단위
CREATE TABLE projects (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(50) UNIQUE NOT NULL,   -- 'tourism' | 'ordinance'
  title         VARCHAR(200) NOT NULL,          -- '관광 정책 결정 시뮬레이션'
  base_score    INTEGER NOT NULL DEFAULT 30,    -- 기본점수 합계 (관광정책=30, 조례=30)
  max_score     INTEGER NOT NULL DEFAULT 100,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 트랙: 조례 프로젝트처럼 주제 선택이 있는 경우에만 사용
--    관광정책 프로젝트는 트랙이 1개(고정 시나리오)이거나 아예 없어도 됨
CREATE TABLE tracks (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code          VARCHAR(50) NOT NULL,           -- 'noise' | 'curfew' | 'pet' ...
  title         VARCHAR(200) NOT NULL,          -- '오토바이·확성기 소음 규제 조례'
  display_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (project_id, code)
);

-- 3. 스텝: 프로젝트마다 스텝 개수·순서가 달라도 되도록 설계
--    관광정책: STEP0~9 (10개) / 조례: STEP1~7 (7개)
CREATE TABLE steps (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step_key      VARCHAR(50) NOT NULL,           -- 'step0' | 'step1' ...
  display_order INTEGER NOT NULL,               -- 화면에 보여줄 순서
  step_type     VARCHAR(30) NOT NULL,           -- 'intro' | 'materials' | 'choice' | 'writing' | 'classify' | 'reflection'
  title         VARCHAR(200) NOT NULL,
  min_chars     INTEGER,                        -- 서술형 최소 글자 수 (없으면 NULL)
  config        JSONB NOT NULL DEFAULT '{}',    -- 스텝별 세부 설정(선택지, 발문 등 자유 구조)
  UNIQUE (project_id, step_key)
);

-- 4. 자료: STEP1처럼 여러 개의 읽기 자료가 붙는 경우
--    조례는 트랙별로 자료가 다르므로 track_id를 둠 (관광정책은 track_id = NULL)
--    step_id: 같은 프로젝트 안에서도 STEP1 자료와 STEP4 자료처럼 등장 스텝이 다르므로 구분
CREATE TABLE materials (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step_id       INTEGER REFERENCES steps(id) ON DELETE CASCADE,
  track_id      INTEGER REFERENCES tracks(id) ON DELETE CASCADE,  -- NULL이면 트랙 공통 자료
  material_key  VARCHAR(50) NOT NULL,           -- 'm1' | 'm2' ...
  display_order INTEGER NOT NULL,
  material_type VARCHAR(30) NOT NULL,           -- 'stat' | 'interview' | 'context' | 'law'
  title         VARCHAR(200) NOT NULL,
  body          TEXT NOT NULL,
  icon          VARCHAR(30)                     -- 'chart' | 'person' | 'doc' | 'scale' (아이콘 종류)
);

-- 5. 확인 문제: 자료 하나당 0~2문항
CREATE TABLE check_questions (
  id            SERIAL PRIMARY KEY,
  material_id   INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  question_type VARCHAR(20) NOT NULL,           -- 'mc' | 'ox' | 'short'
  prompt        TEXT NOT NULL,
  options       JSONB,                          -- mc일 때 ['보기1','보기2',...]
  answer        VARCHAR(200) NOT NULL
);

-- 6. 이해관계자: STEP6처럼 인물 카드가 여러 개 붙는 경우 (조례는 트랙별로 1명)
CREATE TABLE stakeholders (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  track_id        INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
  stakeholder_key VARCHAR(50) NOT NULL,
  display_order   INTEGER NOT NULL,
  name            VARCHAR(100) NOT NULL,         -- '원도심 임차 상인'
  wants           TEXT,
  benefit         TEXT,
  harm            TEXT,
  core_value      VARCHAR(100),                  -- '생계 안정, 경제성'
  quote           TEXT,
  linked_material_label VARCHAR(100)              -- '자료 3에서 만난 분' (없으면 NULL)
);

-- 7. 학급: 반별 예약 오픈 시간을 관리
CREATE TABLE classes (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(50) NOT NULL             -- '2학년 1반'
);

-- 8. 학생: 반별 명단 (CSV 업로드로 채움)
CREATE TABLE students (
  id            SERIAL PRIMARY KEY,
  class_id      INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_no    VARCHAR(20) NOT NULL,            -- 학번
  name          VARCHAR(50) NOT NULL,
  UNIQUE (class_id, student_no)
);

-- 9. 반별 예약 오픈 일정 (프로젝트마다, 학급마다 다름)
CREATE TABLE class_schedules (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  class_id      INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_no    INTEGER NOT NULL DEFAULT 1,      -- 1교시/2교시 등 여러 세션 대비
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ NOT NULL,
  manually_opened  BOOLEAN NOT NULL DEFAULT false,  -- 교사가 "지금 바로 열기" 눌렀는지
  UNIQUE (project_id, class_id, session_no)
);

-- 10. 학생별 진행 상태 및 트랙 선택 (조례처럼 트랙이 있는 경우)
CREATE TABLE enrollments (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  student_id    INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  track_id      INTEGER REFERENCES tracks(id),   -- 트랙 확정 시 채움, 확정 전엔 NULL
  track_locked  BOOLEAN NOT NULL DEFAULT false,  -- 트랙 잠금 여부 (서술 첫 입력 시 true)
  submitted_at  TIMESTAMPTZ,                     -- 최종 제출 시각 (NULL이면 미제출)
  UNIQUE (project_id, student_id)
);

-- 11. 답안: 학생이 각 스텝에 입력한 내용 (자동 저장)
CREATE TABLE responses (
  id              SERIAL PRIMARY KEY,
  enrollment_id   INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  step_id         INTEGER NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  answer          JSONB NOT NULL DEFAULT '{}',   -- 스텝 유형에 따라 자유 구조로 저장
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, step_id)
);

-- 12. 채점: 교사가 채점요소별 등급/점수를 기록 (수동 채점 지원용)
CREATE TABLE rubric_items (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_key      VARCHAR(50) NOT NULL,           -- 'materials' | 'first_judgment' ...
  title         VARCHAR(200) NOT NULL,
  max_score     INTEGER NOT NULL,               -- '상' 점수
  mid_score     INTEGER NOT NULL,               -- '중' 점수
  base_score    INTEGER NOT NULL,               -- '하' 점수 (제출만 해도 받는 기본점수)
  display_order INTEGER NOT NULL,
  UNIQUE (project_id, item_key)
);

CREATE TABLE grades (
  id              SERIAL PRIMARY KEY,
  enrollment_id   INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  rubric_item_id  INTEGER NOT NULL REFERENCES rubric_items(id) ON DELETE CASCADE,
  score           INTEGER NOT NULL,
  graded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, rubric_item_id)
);

-- 13. 교사 계정 (간단한 비밀번호 로그인)
CREATE TABLE teachers (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL
);

-- ============================================================
-- 인덱스 (자주 조회하는 조합)
-- ============================================================
CREATE INDEX idx_materials_project_track ON materials(project_id, step_id, track_id);
CREATE INDEX idx_steps_project_order ON steps(project_id, display_order);
CREATE INDEX idx_enrollments_project_student ON enrollments(project_id, student_id);
CREATE INDEX idx_responses_enrollment ON responses(enrollment_id);
CREATE INDEX idx_class_schedules_lookup ON class_schedules(project_id, class_id);
