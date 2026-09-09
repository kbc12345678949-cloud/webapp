// src/data/stakeholders.test-fixture.js
// 테스트 전용 목데이터. 실제로는 서버가 stakeholder_key/core_value/linked_material_label
// 형태의 필드명으로 내려주므로, 그 형태를 그대로 재현한다.
export const mockStakeholders = [
  {
    stakeholder_key: 's1',
    name: '원도심 임차 상인',
    linked_material_label: '자료 3에서 만난 분',
    wants: '손님이 꾸준히 오는 것, 그리고 임대료가 감당할 수 있는 선에서 유지되는 것',
    benefit: '관광객 증가로 매출 상승, 체류 시간이 늘면 객단가도 상승',
    harm: '상권이 뜨면 임대료·권리금이 함께 올라 밀려날 위험',
    core_value: '생계 안정, 경제성',
  },
  {
    stakeholder_key: 's2',
    name: '건물주(임대인)',
    linked_material_label: null,
    wants: '건물 가치가 오르고 빈 상가 없이 임대가 유지되는 것',
    benefit: '임대료·자산 가치 상승',
    harm: '관광 총량이 규제되면 빈 상가 증가, 리모델링 투자 회수 어려움',
    core_value: '재산권, 투자 회수',
  },
  {
    stakeholder_key: 's3',
    name: '오래 거주한 주민',
    linked_material_label: '자료 4에서 만난 분',
    wants: '예전처럼 조용히 지내는 것, 집 앞 주차, 밤에 편히 잠드는 것',
    benefit: '편의시설·도로 정비',
    harm: '야간 소음, 쓰레기, 주차난, 사생활 침해',
    core_value: '주거 안정, 생활권, 사생활',
  },
  {
    stakeholder_key: 's4',
    name: '지역 청년',
    linked_material_label: '자료 5에서 만난 분',
    wants: '☆☆시에 남아서 먹고살 수 있는 것, 감당 가능한 임대료로 창업하는 것',
    benefit: '일자리·창업 기회 증가',
    harm: '임대료 상승으로 창업 진입 장벽, 불안정한 일자리',
    core_value: '기회, 지역 정착, 고용 안정',
  },
  {
    stakeholder_key: 's5',
    name: '숙박업 종사자',
    linked_material_label: null,
    wants: '투숙객이 꾸준히 오는 것, 영업을 계속할 수 있는 것',
    benefit: '관광객 증가가 곧 매출, 시설 개선 지원 시 부담 감소',
    harm: '신규 허가 제한 시 사업 확장이 막히고, 대출 상환 부담',
    core_value: '영업의 자유, 투자 안정성',
  },
  {
    stakeholder_key: 's6',
    name: '시 재정 담당 부서',
    linked_material_label: null,
    wants: '한정된 예산을 지속 가능하게 배분하는 것',
    benefit: '세수 증가, 국비 공모 선정 시 시 부담 없이 시설 조성',
    harm: '경상비(매년 반복되는 운영비) 부담, 다른 분야 예산과 경쟁',
    core_value: '예산 효율성, 재정 지속 가능성',
  },
];
