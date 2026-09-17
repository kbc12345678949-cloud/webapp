// server/db/resync_materials.js
// STEP1(자료1~7)·STEP4(자료 3종) 내용을 client/src/data 파일의 "지금" 내용으로
// 운영 DB에 다시 맞춘다. 처음 시딩(seed_production.js) 이후 자료 문구를 수정했을 때,
// 그 수정이 이미 심어진 운영 DB에는 반영이 안 되는 문제를 해결하기 위한 스크립트다.
//
// 새 자료를 "추가"하는 게 아니라, material_key가 이미 일치하는 자료의
// title·body·문제(prompt·정답)만 최신 내용으로 덮어쓴다. 학생 응답(responses)에는
// 전혀 손대지 않는다.
//
// 실행: DATABASE_URL=postgres://... node db/resync_materials.js

// client/src/data 파일들과 100% 동일한 내용 (ES module이라 require를 못 써서 그대로 옮겨 적음)
const step1Materials = [
  {
    key: 'm1',
    title: '자료 1. 방문객 수 추이',
    body:
      '2024년 250만 명 → 2025년 350만 명 → 2026년 490만 명(각각 전년 대비 40% 증가). ' +
      '☆☆시 인구 20만 명의 24배가 넘는 규모이며, 하루 평균 약 1만 3천 명이 원도심을 오가는 셈이다.',
    questions: [
      {
        type: 'mc',
        prompt: '올해 예상 방문객 수는 ☆☆시 인구의 몇 배 정도인가?',
        options: ['약 5배', '약 15배', '약 24배', '약 35배'],
        answerIndex: 2,
      },
      { type: 'ox', prompt: '방문객 수는 2025년과 2026년 모두 전년 대비 비슷한 비율로 늘었다.', answer: true },
    ],
  },
  {
    key: 'm2',
    title: '자료 2. 원도심 상권 분위기',
    body:
      '요즘 원도심 골목에 새로운 카페와 소품 가게가 하나둘 생기고 있다. 그런데 동시에, ' +
      '‘임대 문의’라는 종이가 붙은 빈 상가도 보이기 시작했다. 다만 임대료가 실제로 몇 % 올랐는지 ' +
      '보여주는 정확한 통계는 아직 나오지 않았다.',
    questions: [
      {
        type: 'mc',
        prompt: '이 자료에서 확인할 수 없는 것은?',
        options: ['새 간판을 단 가게가 생겼다', '빈 상가가 보이기 시작했다', '임대료가 정확히 몇 % 올랐다', '상인들이 임대료 이야기에 날카로워졌다'],
        answerIndex: 2,
      },
    ],
  },
  {
    key: 'm3',
    title: '자료 3. 임차 상인 인터뷰',
    body:
      '“이 자리에서 3년째 카페를 하고 있어요. 손님은 확실히 늘었죠. 그런데 매출이 두 배 넘게 늘었다고 ' +
      '마음이 편한 건 아니에요. 다음 계약 때 얼마를 부르실지가 더 걱정입니다.”',
    questions: [
      {
        type: 'mc',
        prompt: '이 상인이 가장 걱정하는 것은?',
        options: ['손님이 줄어드는 것', '다음 계약 때 임대료가 오르는 것', '정책이 자주 바뀌는 것', '관광객이 줄어드는 것'],
        answerIndex: 1,
      },
    ],
  },
  {
    key: 'm4',
    title: '자료 4. 거주 주민 인터뷰',
    body:
      '“이 동네서 산 지 40년이 넘었어요. 예전엔 다 낡았던 골목길이 요즘은 깔끔하게 정비됐거든요. ' +
      '근데 저희 집 마당까지 사진에 찍히는 건 좀 불편하네요.”',
    questions: [
      { type: 'ox', prompt: '이 주민은 관광 활성화로 인한 변화를 전부 부정적으로만 이야기한다.', answer: false },
      {
        type: 'mc',
        prompt: '이 주민이 불편하다고 말한 것은?',
        options: ['소음', '쓰레기', '집 마당까지 사진에 찍히는 것', '주차 공간 부족'],
        answerIndex: 2,
      },
    ],
  },
  {
    key: 'm5',
    title: '자료 5. 지역 청년 인터뷰',
    body:
      '“카페 하나 차려보고 싶어서 자리를 알아보고 있어요. 그런데 3년 전에 같은 골목 다른 자리 ' +
      '보증금이 2천만 원이었다는데, 지금은 그 두 배래요.”',
    questions: [
      { type: 'short', prompt: '3년 전과 비교해 지금 보증금은 몇 배 정도로 올랐다고 하는가? (숫자만 쓰세요)', answer: '2' },
      { type: 'ox', prompt: '이 청년은 관광 활성화를 기회이면서 동시에 부담으로 느끼고 있다.', answer: true },
    ],
  },
  {
    key: 'm6',
    title: '자료 6. 예산 자료',
    body:
      '☆☆시 전체 연간 예산은 약 4,200억 원, 이 중 관광 관련 예산은 약 50억 원(전체의 약 1.2%)이다. ' +
      '100만 원짜리 살림이라면 관광에 쓰는 돈은 만 2천 원 정도인 셈이다.',
    questions: [{ type: 'ox', prompt: '관광 예산은 ☆☆시 전체 예산의 절반이 넘는다.', answer: false }],
  },
  {
    key: 'm7',
    title: '자료 7. 타 도시 사례',
    body:
      '◇◇마을은 5년 만에 방문객이 20만 명에서 180만 명으로 9배 늘었지만, 그사이 원래 살던 주민의 ' +
      '15%가 동네를 떠났다. 관광객은 늘었는데 정작 그 동네에 살던 사람은 줄어드는 현상을 오버투어리즘이라 부른다.',
    questions: [
      {
        type: 'mc',
        prompt: '같은 기간 원래 살던 주민이 떠난 비율은 대략 얼마인가?',
        options: ['약 5%', '약 15%', '약 30%', '약 50%'],
        answerIndex: 1,
      },
    ],
  },
];

const step4Materials = [
  {
    key: 'n1',
    title: '임대료 추이 자료',
    body:
      '최근 3년간 원도심 임대료가 평균 2.4배 상승했고, 같은 기간 임차 상인 폐업 건수도 눈에 띄게 늘었다. ' +
      'STEP1에서는 "상권이 활발해지고 있다"는 개괄적 언급만 있었는데, 정확한 수치가 이제야 드러났다.',
  },
  {
    key: 'n2',
    title: '재정 부서 메모',
    body:
      '공모 사업비 30억 원은 시설을 짓는 데만 쓸 수 있는 1회성 예산이라, 주차구역 확보나 소음 단속 인력 배치 같은 운영비는 별도로 마련해야 한다. ' +
      '그런데 문제는 기존 예산에도 여유가 없다는 점이다. STEP1 자료6(예산 자료)에서 확인한 관광 예산 50억 원, 각 부서가 실제로 요청한 금액을 모두 더하면 58억 원이 필요하다는 사실이 뒤늦게 드러났다. 아래 내역을 확인해보자.',
  },
  {
    key: 'n3',
    title: '주민 여론조사',
    body:
      '전체 응답은 관광 확대 찬성이 다수이지만, 관광지 인접 골목에 사는 주민만 따로 떼어보면 반대가 압도적이다.',
  },
];

async function resyncMaterials(pool, projectCode = 'tourism') {
  const proj = await pool.query('SELECT id FROM projects WHERE code = $1', [projectCode]);
  if (proj.rows.length === 0) throw new Error(`프로젝트(${projectCode})를 찾을 수 없습니다.`);
  const projectId = proj.rows[0].id;

  let materialsUpdated = 0;
  let questionsUpdated = 0;
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

  return { materialsUpdated, questionsUpdated, notFound };
}

module.exports = { resyncMaterials };

if (require.main === module) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  resyncMaterials(pool)
    .then((result) => {
      console.log(`자료 ${result.materialsUpdated}개, 확인 문제 ${result.questionsUpdated}개 최신화 완료.`);
      if (result.notFound.length > 0) {
        console.log('DB에서 못 찾은 material_key(운영 DB에 아예 없던 자료):', result.notFound.join(', '));
      }
      return pool.end();
    })
    .catch((e) => {
      console.error('실패:', e.message);
      process.exit(1);
    });
}
