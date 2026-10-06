// src/MyRecord.jsx
// "나의 수행평가 기록" — 교사가 열람 모드를 켜면(수행평가 종료) 로그인한 학생에게 이 화면만 보인다.
// 수행평가 흐름 그대로(자료 1~7 → STEP3 → STEP4 → … → STEP9) 자료와 내가 입력한 내용을 한 페이지에 보여준다.
// 입력칸·저장 기능이 전혀 없는 "보기 전용" 화면이며, 서버도 열람 모드에서는 저장·제출을 거절한다.
import { materials as step1Materials } from './data/step1Materials';
import { step4Materials } from './data/step4Materials';
import { policies } from './data/policies';
import { BUDGET_ITEMS, BUDGET_AMOUNT, BUDGET_TOTAL_REQUEST, BUDGET_SHORTFALL } from './components/BudgetTable';
import MaterialChart from './components/MaterialChart';
import StakeholderIcon from './components/StakeholderIcon';

const DECISION_LABEL = { keep: '기존 선택 유지', change: '다른 정책으로 변경' };
const TAGS = {
  benefit: { label: '혜택 집단', color: '#4A90D9' },
  harm: { label: '불이익 집단', color: 'var(--color-coral)' },
  neutral: { label: '상관없어 보임', color: '#000000' },
};
const BRANCH_LABEL = { had: '있었다', none: '없었다' };

// ---------- 공통 조각 ----------
function StepHeading({ step, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '30px 0 12px' }}>
      <span
        style={{
          background: 'var(--color-navy)',
          color: 'var(--color-navy-text-on)',
          fontSize: 11.5,
          fontWeight: 600,
          padding: '3px 9px',
          borderRadius: 12,
          flexShrink: 0,
        }}
      >
        {step}
      </span>
      <h3 style={{ color: 'var(--color-navy)', fontSize: 17, fontWeight: 600, margin: 0 }}>{title}</h3>
    </div>
  );
}

function MaterialCard({ title, children, accent = 'var(--color-teal)' }) {
  return (
    <div
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderLeft: `3px solid ${accent}`,
        borderRadius: '0 var(--radius-card) var(--radius-card) 0',
        padding: '14px 16px',
        marginBottom: 12,
      }}
    >
      {title && (
        <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 6px' }}>{title}</p>
      )}
      <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--color-text-body)' }}>{children}</div>
    </div>
  );
}

// 내가 입력한 내용: 자료 카드와 구별되도록 연한 배경 + "내 답" 표시
function MyAnswer({ label, children }) {
  return (
    <div
      style={{
        background: 'rgba(43,110,104,0.07)',
        border: '1px solid rgba(43,110,104,0.35)',
        borderRadius: 'var(--radius-card)',
        padding: '12px 14px',
        marginBottom: 12,
      }}
    >
      <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-teal)', margin: '0 0 6px' }}>
        ✍️ 내 답 {label ? `· ${label}` : ''}
      </p>
      <div style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>
        {children}
      </div>
    </div>
  );
}

function Empty() {
  return <span style={{ color: 'var(--color-text-muted)' }}>(작성하지 않음)</span>;
}

const text = (v) => ((v || '').trim() ? v : <Empty />);

// 정책 3안 카드: 수행평가 때처럼 내가 고른 안을 남색으로 칠해 보여준다
function PolicyCards({ selectedId }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
      {policies.map((p) => {
        const on = selectedId === p.id;
        return (
          <div
            key={p.id}
            style={{
              background: on ? 'var(--color-navy)' : 'var(--color-card)',
              border: `1.5px solid ${on ? 'var(--color-navy)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-card)',
              padding: '12px 14px',
              opacity: selectedId && !on ? 0.6 : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: on ? 'var(--color-border)' : 'var(--color-teal)' }}>
                {p.label}
              </span>
              <span style={{ fontSize: 14.5, fontWeight: 500, color: on ? 'var(--color-navy-text-on)' : 'var(--color-navy)' }}>
                {p.title}
              </span>
              {on && (
                <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--color-navy-text-on)' }}>✓ 내 선택</span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: on ? 'var(--color-border)' : 'var(--color-text-body)' }}>
              {p.summary}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// STEP1 확인 문제: 학생 답은 서버에 저장되지 않으므로 정답만 표시한다
function QuestionWithAnswer({ q, no }) {
  let answerText = '';
  if (q.type === 'mc') answerText = `${q.answerIndex + 1}번 ${q.options[q.answerIndex]}`;
  else if (q.type === 'ox') answerText = q.answer ? 'O' : 'X';
  else answerText = String(q.answer);
  return (
    <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: 8, marginTop: 8 }}>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-navy)' }}>
        Q{no}. {q.prompt}
      </p>
      {q.type === 'mc' && (
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-body)' }}>
          {q.options.map((o, i) => `${i + 1}) ${o}`).join('   ')}
        </p>
      )}
      <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--color-teal)' }}>정답: {answerText}</p>
    </div>
  );
}

// ---------- 화면 ----------
export default function MyRecord({ student, enrollment, answers, stakeholders, stakeholderError, budgetGiven, onLogout }) {
  const a3 = answers.step3;
  const a5 = answers.step5;
  const a7 = answers.step7;
  const a8 = answers.step8;
  const a9 = answers.step9;
  const p5 = policies.find((p) => p.id === a5?.choice);

  const hasBudgetRecord = budgetGiven && Object.values(budgetGiven).some(Boolean);
  const givenItems = BUDGET_ITEMS.filter((it) => budgetGiven?.[it.name]);
  const givenAmount = givenItems.reduce((s, it) => s + it.amount, 0);

  const submittedText = enrollment?.submitted_at
    ? new Date(enrollment.submitted_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'long', timeStyle: 'short' })
    : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ background: 'var(--color-navy)', padding: '22px 20px 20px' }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-border)' }}>관광정책결정 시뮬레이션</p>
        <h2 style={{ margin: '4px 0 6px', fontSize: 20, fontWeight: 600, color: '#FFFFFF' }}>나의 수행평가 기록</h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-border)' }}>
          {student?.className} · {student?.studentNo} {student?.name}
          {submittedText ? ` · 제출 ${submittedText}` : ' · 미제출'}
        </p>
      </div>

      <div style={{ padding: '16px 20px 40px', maxWidth: 680, margin: '0 auto' }}>
        <div
          style={{
            background: '#FFF8E6',
            border: '1px solid #F0D58C',
            borderRadius: 'var(--radius-card)',
            padding: '12px 14px',
            fontSize: 13,
            lineHeight: 1.65,
            color: 'var(--color-text)',
          }}
        >
          🔒 수행평가가 끝나 <strong>보기만 할 수 있는 화면</strong>이에요. 내용은 수정되지 않습니다.
          <br />
          수행평가 때 순서 그대로 자료와 <strong>내가 입력한 답</strong>(초록 상자)을 보여줍니다. 자기평가서를 쓸 때
          참고하세요.
        </div>

        {!enrollment && (
          <div style={{ marginTop: 12 }}>
            <MaterialCard accent="var(--color-coral)">
              이 수행평가에 참여한 기록이 없어요. 선생님께 확인해 주세요.
            </MaterialCard>
          </div>
        )}

        {/* STEP1 */}
        <StepHeading step="STEP 1" title="자료 분석 (자료 1~7)" />
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 10px' }}>
          확인 문제는 내 답이 저장되지 않아 정답만 표시해요.
        </p>
        {step1Materials.map((m) => (
          <MaterialCard key={m.key} title={m.title}>
            {m.body}
            <MaterialChart materialKey={m.key} />
            {(m.questions || []).map((q, i) => (
              <QuestionWithAnswer key={i} q={q} no={i + 1} />
            ))}
          </MaterialCard>
        ))}

        {/* STEP3 */}
        <StepHeading step="STEP 3" title="1차 판단" />
        <PolicyCards selectedId={a3?.choice} />
        <MyAnswer label="선택한 근거">{text(a3?.reason)}</MyAnswer>

        {/* STEP4 */}
        <StepHeading step="STEP 4" title="새로운 상황" />
        <MaterialCard title="속보 — 중앙정부 공모 사업 선정" accent="var(--color-coral)">
          중앙정부 관광 활성화 공모 사업에 선정되어 사업비 30억 원을 확보했습니다. (1회성, 시설 조성용)
        </MaterialCard>
        {step4Materials.map((m) => (
          <MaterialCard key={m.key} title={m.title} accent="var(--color-coral)">
            {m.body}
            <MaterialChart materialKey={m.key} />
            {m.key === 'n2' && (
              <div style={{ marginTop: 10 }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--color-teal)', fontWeight: 500 }}>
                  관광 예산 {BUDGET_AMOUNT}억 원 · 요청 합계 {BUDGET_TOTAL_REQUEST}억 원 · 부족분 {BUDGET_SHORTFALL}억 원
                </p>
                {BUDGET_ITEMS.map((it) => {
                  const given = !!budgetGiven?.[it.name];
                  return (
                    <div
                      key={it.name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '6px 4px',
                        borderBottom: '1px solid var(--color-border)',
                        background: given ? 'rgba(43,110,104,0.08)' : 'transparent',
                        fontSize: 12.5,
                      }}
                    >
                      <span style={{ textDecoration: given ? 'line-through' : 'none', color: 'var(--color-navy)' }}>
                        {given ? '✓ ' : ''}
                        {it.name}
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 11.5 }}> · {it.beneficiary}</span>
                      </span>
                      <span style={{ flexShrink: 0 }}>{it.amount}억</span>
                    </div>
                  );
                })}
              </div>
            )}
          </MaterialCard>
        ))}
        <MyAnswer label="포기하기로 한 예산 항목">
          {hasBudgetRecord ? (
            `${givenItems.map((it) => `${it.name}(${it.amount}억)`).join(', ')} — 합계 ${givenAmount}억 원`
          ) : (
            <span style={{ color: 'var(--color-text-muted)' }}>
              이 기기에는 예산 선택 기록이 없어요. 예산 선택은 수행평가 때 사용한 기기·브라우저에만 저장돼서, 그
              기기로 들어오면 보여요.
            </span>
          )}
        </MyAnswer>

        {/* STEP5 */}
        <StepHeading step="STEP 5" title="재판단" />
        <MyAnswer label="유지 / 변경">
          {a5?.decision ? (
            <>
              <strong>{DECISION_LABEL[a5.decision]}</strong>
              {a5.decision === 'change' && p5 ? ` → ${p5.label} · ${p5.title}` : ''}
            </>
          ) : (
            <Empty />
          )}
        </MyAnswer>
        <MyAnswer label="그렇게 판단한 이유">{text(a5?.reason)}</MyAnswer>

        {/* STEP6 */}
        <StepHeading step="STEP 6" title="이해관계자 분석" />
        {stakeholderError && <MaterialCard accent="var(--color-coral)">{stakeholderError}</MaterialCard>}
        {!stakeholders && !stakeholderError && (
          <p style={{ fontSize: 13, color: 'var(--color-text-body)' }}>이해관계자 정보를 불러오는 중...</p>
        )}
        {stakeholders?.map((s) => (
          <MaterialCard
            key={s.stakeholder_key}
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StakeholderIcon stakeholderKey={s.stakeholder_key} size={18} />
                {s.name}
                {s.linked_material_label && (
                  <span style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--color-text-muted)' }}>
                    ({s.linked_material_label})
                  </span>
                )}
              </span>
            }
          >
            <p style={{ margin: '0 0 4px' }}>
              <strong style={{ color: 'var(--color-teal)', fontWeight: 500 }}>원하는 것 </strong>
              {s.wants}
            </p>
            <p style={{ margin: '0 0 4px' }}>
              <strong style={{ color: 'var(--color-teal)', fontWeight: 500 }}>얻을 수 있는 이익 </strong>
              {s.benefit}
            </p>
            <p style={{ margin: '0 0 4px' }}>
              <strong style={{ color: 'var(--color-teal)', fontWeight: 500 }}>감수해야 하는 불이익 </strong>
              {s.harm}
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: 'var(--color-teal)', fontWeight: 500 }}>중요하게 생각하는 가치 </strong>
              {s.core_value}
            </p>
          </MaterialCard>
        ))}

        {/* STEP7 */}
        <StepHeading step="STEP 7" title="트레이드오프 분석 · 보완책 제안" />
        <MyAnswer label="이해관계자 분류">
          {a7?.classification && stakeholders ? (
            <div style={{ whiteSpace: 'normal' }}>
              {stakeholders.map((s) => {
                const tag = TAGS[a7.classification[s.stakeholder_key]];
                return (
                  <div
                    key={s.stakeholder_key}
                    style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '3px 0' }}
                  >
                    <span>{s.name}</span>
                    <span style={{ fontWeight: 600, color: tag ? tag.color : 'var(--color-text-muted)' }}>
                      {tag ? tag.label : '미분류'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty />
          )}
        </MyAnswer>
        <MyAnswer label="불이익 집단은 어떤 불만을 가질까요?">{text(a7?.harmConcern)}</MyAnswer>
        <MyAnswer label="그 불만을 줄이기 위한 보완책">{text(a7?.mitigation)}</MyAnswer>

        {/* STEP8 */}
        <StepHeading step="STEP 8" title="최종 결정" />
        <PolicyCards selectedId={a8?.finalChoice} />
        <MyAnswer label="핵심 근거">{text(a8?.coreReason)}</MyAnswer>
        <MyAnswer label="예상 문제점 (STEP7에서 가져옴)">{text(a8?.expectedProblem)}</MyAnswer>
        <MyAnswer label="보완 방안 (STEP7에서 가져옴)">{text(a8?.mitigationPlan)}</MyAnswer>

        {/* STEP9 */}
        <StepHeading step="STEP 9" title="성찰" />
        <MyAnswer label="짝과 의견이 갈렸던 부분이 있었나요?">
          {a9?.branch ? <strong>{BRANCH_LABEL[a9.branch]}</strong> : <Empty />}
        </MyAnswer>
        {a9?.branch === 'had' && (
          <>
            <MyAnswer label="어떤 지점에서 의견이 갈렸고, 짝의 근거는 무엇이었나요?">{text(a9.hadPoint)}</MyAnswer>
            <MyAnswer label="논의 후 내 판단이 달라졌나요, 그대로였나요? 그 이유는?">{text(a9.hadChanged)}</MyAnswer>
          </>
        )}
        {a9?.branch === 'none' && (
          <MyAnswer label="짝과 의견이 일치한 이유는 무엇이라고 생각하나요?">{text(a9.noneReason)}</MyAnswer>
        )}
        <MyAnswer label="1차 판단에서 최종 결정까지 오는 동안, 내 생각을 가장 크게 흔든 자료나 순간은 무엇이었나요?">{text(a9?.self1)}</MyAnswer>
        <MyAnswer label="이번 활동에서 가장 어려웠던 부분은 무엇이었고, 어떻게 해결하려고 했나요?">{text(a9?.self2)}</MyAnswer>
        <MyAnswer label='이번 활동을 통해 "정치적 판단을 내린다는 것"에 대해 새롭게 느낀 점이 있다면?'>{text(a9?.self3)}</MyAnswer>

        <button
          onClick={onLogout}
          style={{
            width: '100%',
            marginTop: 24,
            background: 'var(--color-navy)',
            color: 'var(--color-navy-text-on)',
            border: 'none',
            borderRadius: 'var(--radius-button)',
            padding: 14,
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          처음 화면으로
        </button>
      </div>
    </div>
  );
}
