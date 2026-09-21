// src/components/BudgetTable.jsx
// STEP4 "재정 부서 메모"(n2) 전용 — 항목별 요청 금액과 실제 예산의 격차를 보여주고,
// 학생이 직접 "포기할 항목"을 선택해보며 부족분(8억)을 실제로 채워보게 한다.
// 선택 상태(given)는 App.jsx가 갖고 있다가 STEP5에도 넘겨줘서, STEP4↔STEP5를
// 오가도 사라지지 않고, 재판단할 때도 참고할 수 있게 한다(다만 STEP4 자체가
// 원래 서버 저장 대상이 아니므로, 이 선택은 여전히 서버로 전송하지 않는다).
export const BUDGET_ITEMS = [
  { name: '축제·행사 운영', note: '작년 대비 방문객 급증으로 확대 요청', amount: 15, beneficiary: '임차 상인, 숙박업 종사자' },
  { name: '관광 홍보·마케팅', amount: 9, beneficiary: '임차 상인, 숙박업 종사자, 건물주' },
  { name: '관광안내소·공중화장실 유지', amount: 7, beneficiary: '관광객 편의(간접적으로 상인)' },
  { name: '원도심 주차장 임차·관리', amount: 8, beneficiary: '거주 주민' },
  { name: '야간 소음 단속 인력', note: '민원 급증으로 신규 요청', amount: 5, beneficiary: '거주 주민' },
  { name: '관광지 주변 쓰레기 수거 확대', note: '배출량 증가', amount: 6, beneficiary: '거주 주민' },
  { name: '청년 창업 임대료 보조', note: '보증금 상승으로 신설된 항목', amount: 5, beneficiary: '지역 청년' },
  { name: '예비비', amount: 3, beneficiary: '시 재정 담당 부서' },
];

export const BUDGET_TOTAL_REQUEST = BUDGET_ITEMS.reduce((sum, it) => sum + it.amount, 0); // 58
export const BUDGET_AMOUNT = 50;
export const BUDGET_SHORTFALL = BUDGET_TOTAL_REQUEST - BUDGET_AMOUNT; // 8

export default function BudgetTable({ given, onToggle }) {
  const givenAmount = BUDGET_ITEMS.filter((it) => given[it.name]).reduce((sum, it) => sum + it.amount, 0);
  const enoughGivenUp = givenAmount >= BUDGET_SHORTFALL;

  return (
    <div style={{ margin: '14px 0 4px' }}>
      <p style={{ fontSize: 12, color: 'var(--color-teal)', fontWeight: 500, margin: '0 0 8px' }}>
        포기할 항목을 직접 선택해보세요 (초과되는 {BUDGET_SHORTFALL}억 원을 해결하려면, 특정 항목을 제거해야 합니다)
      </p>

      {BUDGET_ITEMS.map((it) => {
        const isGiven = !!given[it.name];
        return (
          <button
            key={it.name}
            onClick={() => onToggle(it.name)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              width: '100%',
              minHeight: 44,
              padding: '8px 4px',
              border: 'none',
              borderBottom: '1px solid var(--color-border)',
              background: isGiven ? 'rgba(43,110,104,0.08)' : 'transparent',
              gap: 10,
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', gap: 8, flex: 1 }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: `1.5px solid ${isGiven ? 'var(--color-teal)' : 'var(--color-border)'}`,
                  background: isGiven ? 'var(--color-teal)' : 'transparent',
                  color: '#FFFFFF',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {isGiven ? '✓' : ''}
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-navy)',
                    textDecoration: isGiven ? 'line-through' : 'none',
                  }}
                >
                  {it.name}
                </p>
                {it.note && (
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-text-muted)' }}>({it.note})</p>
                )}
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                  {it.beneficiary}
                </p>
              </div>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                color: isGiven ? 'var(--color-teal)' : 'var(--color-navy)',
                whiteSpace: 'nowrap',
              }}
            >
              {it.amount}억
            </p>
          </button>
        );
      })}

      <div style={{ marginTop: 10, paddingTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
          <span style={{ color: 'var(--color-text-body)' }}>요청 합계</span>
          <span style={{ fontWeight: 600, color: 'var(--color-navy)' }}>{BUDGET_TOTAL_REQUEST}억</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
          <span style={{ color: 'var(--color-text-body)' }}>실제 예산</span>
          <span style={{ fontWeight: 600, color: 'var(--color-navy)' }}>{BUDGET_AMOUNT}억</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
          <span style={{ color: 'var(--color-text-body)' }}>지금까지 포기한 금액</span>
          <span style={{ fontWeight: 600, color: 'var(--color-teal)' }}>{givenAmount}억</span>
        </div>

        <div
          style={{
            padding: '10px 12px',
            borderRadius: 6,
            background: enoughGivenUp ? 'var(--color-teal)' : 'var(--color-coral)',
          }}
        >
          <p style={{ margin: 0, color: '#FFFFFF', fontSize: 13, fontWeight: 500 }}>
            {enoughGivenUp
              ? `예산 안에서 집행할 수 있습니다. (${givenAmount}억 확보 / ${BUDGET_SHORTFALL}억 필요)`
              : `예산이 초과되어 정책 집행이 어렵습니다. (${givenAmount}억 확보 / ${BUDGET_SHORTFALL}억 필요)`}
          </p>
        </div>
      </div>

      <p style={{ margin: '14px 0 0', fontSize: 13, fontStyle: 'italic', color: 'var(--color-text-body)' }}>
        무엇을 포기했는지가 곧, 어떤 이해관계자에게 손해를 감수하게 했는지를 말해준다.
      </p>
    </div>
  );
}
