// src/steps/Step7.jsx
import { useState, useEffect } from 'react';
import ProgressHeader from '../components/ProgressHeader';
import StakeholderIcon from '../components/StakeholderIcon';
import { hasRepeatedCharacterAbuse } from '../utils/textQuality';
import HintQuestions from '../components/HintQuestions';
import ReviewPanel from '../components/ReviewPanel';
import { useTourismShell } from '../components/TourismShell';
import { textareaStyle } from '../components/fieldStyle';

const HARM_CONCERN_HINTS = [
  '이들이 가장 크게 손해 보거나 아쉬워할 부분은 무엇인가요?',
  'STEP4에서 예산 항목을 포기하기로 했다면, 그로 인해 손해를 보는 사람을 불이익 집단으로 제대로 분류했는지 다시 확인해보세요.',
];
const MITIGATION_HINTS = [
  '왜 이 방법이 그 집단의 손해를 줄일 수 있다고 생각했나요?',
  '이 보완책을 실제로 시행한다면 어떤 현실적인 어려움이 있을까요?',
];

const TAGS = [
  { key: 'benefit', label: '혜택 집단', color: '#4A90D9' },
  { key: 'harm', label: '불이익 집단', color: 'var(--color-coral)' },
  { key: 'neutral', label: '상관없어 보임', color: '#000000' },
];

// 저장·빈칸 확인은 App이 맡는다(최종 제출 때 한꺼번에 확인). 분류·서술 모두 다 채우지 않아도 앞뒤로 오갈 수 있다.
// initialPhase: '내 답안 전체 확인'에서 특정 칸으로 바로 갈 때 분류/서술 화면 중 어디를 열지 정한다.
export default function Step7({ onComplete, onBack, student, stakeholders, loadError, initialAnswer, onDraftChange, step3Answer, step5Answer, budgetGiven, initialPhase }) {
  const { readOnly } = useTourismShell();
  const [phase, setPhase] = useState(
    initialPhase || (initialAnswer?.mitigation || initialAnswer?.harmConcern ? 'writing' : 'classify')
  );
  const [classification, setClassification] = useState(initialAnswer?.classification ?? {});
  const [harmConcern, setHarmConcern] = useState(initialAnswer?.harmConcern ?? '');
  const [mitigation, setMitigation] = useState(initialAnswer?.mitigation ?? '');

  const allClassified = !!stakeholders && stakeholders.every((s) => classification[s.stakeholder_key]);
  const harmGroup = stakeholders ? stakeholders.filter((s) => classification[s.stakeholder_key] === 'harm') : [];
  const harmConcernHasAbuse = hasRepeatedCharacterAbuse(harmConcern);
  const mitigationHasAbuse = hasRepeatedCharacterAbuse(mitigation);

  useEffect(() => {
    if (!readOnly) onDraftChange?.({ classification, harmConcern, mitigation });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classification, harmConcern, mitigation]);

  if (phase === 'classify') {
    return (
      <div>
        <ProgressHeader projectLabel="TF팀 브리핑" currentStep={7} totalSteps={9} studentNo={student?.studentNo} studentName={student?.name} />
        <div style={{ padding: '20px 20px 26px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                display: 'block',
                background: 'none',
                border: 'none',
                color: 'var(--color-teal)',
                fontSize: 13,
                padding: 0,
                marginBottom: 14,
                cursor: 'pointer',
              }}
            >
              ← 이전 단계로 (이해관계자 다시 보기)
            </button>
          )}
          <ReviewPanel currentStep={7} step3Answer={step3Answer} step5Answer={step5Answer} stakeholders={stakeholders} budgetGiven={budgetGiven} />
          <h3 style={{ color: 'var(--color-navy)', fontSize: 17, fontWeight: 500, margin: '0 0 4px' }}>
            트레이드오프 분석
          </h3>
          <p style={{ color: 'var(--color-text-body)', fontSize: 13, margin: '0 0 16px' }}>
            내가 선택한 정책이 각 이해관계자에게 어떤 영향을 미칠지 분류해주세요.
          </p>

          {loadError && <p style={{ color: 'var(--color-coral)', fontSize: 13 }}>{loadError}</p>}
          {!stakeholders && !loadError && (
            <p style={{ color: 'var(--color-text-body)', fontSize: 13 }}>불러오는 중...</p>
          )}

          <div id="field-t7-classify" />
          {stakeholders &&
            stakeholders.map((s) => (
              <div
                key={s.stakeholder_key}
                style={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  padding: '12px 14px',
                  marginBottom: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <StakeholderIcon stakeholderKey={s.stakeholder_key} size={18} />
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--color-navy)' }}>{s.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {TAGS.map((t) => {
                    const active = classification[s.stakeholder_key] === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => !readOnly && setClassification((prev) => ({ ...prev, [s.stakeholder_key]: t.key }))}
                        disabled={readOnly}
                        style={{
                          flex: 1,
                          minHeight: 44,
                          padding: '4px',
                          fontSize: 12,
                          borderRadius: 6,
                          border: `1.5px solid ${active ? t.color : 'var(--color-border)'}`,
                          background: active ? t.color : 'var(--color-card)',
                          color: active ? '#FFFFFF' : 'var(--color-text)',
                        }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

          <button
            onClick={() => setPhase('writing')}
            style={{
              width: '100%',
              background: 'var(--color-navy)',
              color: 'var(--color-navy-text-on)',
              border: 'none',
              borderRadius: 'var(--radius-button)',
              padding: 14,
              fontSize: 16,
              fontWeight: 500,
              marginTop: 4,
            }}
          >
            {readOnly ? '다음: 보완책 보기 →' : '분류 완료 → 보완책 쓰기'}
          </button>
          {!allClassified && !readOnly && (
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8, textAlign: 'center' }}>
              지금 {Object.keys(classification).length}/6명 분류했어요. 나머지는 최종 제출 전까지 채우면 돼요.
            </p>
          )}
        </div>
      </div>
    );
  }

  // phase === 'writing'
  return (
    <div>
      <ProgressHeader projectLabel="TF팀 브리핑" currentStep={7} totalSteps={9} studentNo={student?.studentNo} studentName={student?.name} />
      <div style={{ padding: '20px 20px 26px' }}>
        <button
          onClick={() => setPhase('classify')}
          style={{
            display: 'block',
            background: 'none',
            border: 'none',
            color: 'var(--color-teal)',
            fontSize: 13,
            padding: 0,
            marginBottom: 14,
            cursor: 'pointer',
          }}
        >
          ← 이전 단계로 (분류 다시 보기)
        </button>
        <ReviewPanel currentStep={7} step3Answer={step3Answer} step5Answer={step5Answer} stakeholders={stakeholders} budgetGiven={budgetGiven} />
        <h3 style={{ color: 'var(--color-navy)', fontSize: 17, fontWeight: 500, margin: '0 0 4px' }}>
          보완책 제안
        </h3>

        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderLeft: '3px solid var(--color-coral)',
            borderRadius: '0 var(--radius-card) var(--radius-card) 0',
            padding: '14px 16px',
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--color-navy)', margin: 0 }}>
            {harmGroup.length > 0 ? (
              <>
                불이익 집단으로 분류한{' '}
                <strong>{harmGroup.map((s) => s.name).join(', ')}</strong>의 손해를 줄이기 위해 어떤
                방법을 제안하시겠어요?
              </>
            ) : (
              '불이익 집단으로 분류한 사람이 없습니다. 정말 아무도 손해를 보지 않는지 다시 한번 생각해보고, 있다면 이전 화면에서 분류를 수정해주세요.'
            )}
          </p>
        </div>

        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: 16,
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 10px' }}>
            불이익 집단은 어떤 불만을 가질까요?
          </p>
          <HintQuestions questions={HARM_CONCERN_HINTS} />
          <textarea
            id="field-t7-harm"
            value={harmConcern}
            onChange={(e) => !readOnly && setHarmConcern(e.target.value)}
            readOnly={readOnly}
            rows={3}
            placeholder={readOnly ? '(작성하지 않음)' : '짧게 한두 문장으로 써주세요.'}
            style={textareaStyle(readOnly)}
          />
        </div>

        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: 16,
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 10px' }}>
            그 불만을 줄이기 위한 보완책을 구체적으로 서술해주세요
          </p>
          <HintQuestions questions={MITIGATION_HINTS} />
          <textarea
            id="field-t7-mitigation"
            value={mitigation}
            onChange={(e) => !readOnly && setMitigation(e.target.value)}
            readOnly={readOnly}
            rows={6}
            placeholder={readOnly ? '(작성하지 않음)' : '보완책을 구체적으로 서술해주세요.'}
            style={textareaStyle(readOnly)}
          />
        </div>

        <button
          onClick={() => onComplete({ classification, harmConcern, mitigation })}
          style={{
            width: '100%',
            background: 'var(--color-navy)',
            color: 'var(--color-navy-text-on)',
            border: 'none',
            borderRadius: 'var(--radius-button)',
            padding: 14,
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          다음 단계로
        </button>
        {!readOnly && ((harmConcern.trim().length > 0 && harmConcernHasAbuse) || (mitigation.trim().length > 0 && mitigationHasAbuse)) ? (
          <p style={{ fontSize: 12, color: 'var(--color-coral)', marginTop: 8, textAlign: 'center' }}>
            같은 글자가 반복되고 있어요. 내용을 구체적으로 써주세요.
          </p>
        ) : null}
      </div>
    </div>
  );
}
