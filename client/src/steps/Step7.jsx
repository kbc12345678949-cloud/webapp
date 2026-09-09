// src/steps/Step7.jsx
import { useState } from 'react';
import ProgressHeader from '../components/ProgressHeader';
import MaterialIcon from '../components/MaterialIcon';
import { useAutoSave } from '../hooks/useAutoSave';
import { saveResponse } from '../api';

const TAGS = [
  { key: 'benefit', label: '혜택 집단' },
  { key: 'harm', label: '불이익 집단' },
  { key: 'neutral', label: '상관없어 보임' },
];

export default function Step7({ onComplete, student, token, enrollmentId, stepId, stakeholders, loadError, initialAnswer }) {
  const [phase, setPhase] = useState(initialAnswer?.mitigation ? 'writing' : 'classify');
  const [classification, setClassification] = useState(initialAnswer?.classification ?? {});
  const [mitigation, setMitigation] = useState(initialAnswer?.mitigation ?? '');

  const allClassified = stakeholders && stakeholders.every((s) => classification[s.stakeholder_key]);
  const harmGroup = stakeholders ? stakeholders.filter((s) => classification[s.stakeholder_key] === 'harm') : [];

  const { status: saveStatus, error: saveError } = useAutoSave(
    token,
    enrollmentId,
    stepId,
    { classification, mitigation },
    { skip: Object.keys(classification).length === 0 }
  );

  if (phase === 'classify') {
    return (
      <div>
        <ProgressHeader projectLabel="TF팀 브리핑" currentStep={7} totalSteps={9} studentNo={student?.studentNo} studentName={student?.name} />
        <div style={{ padding: '20px 20px 26px' }}>
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
                  <MaterialIcon type="person" size={18} />
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--color-navy)' }}>{s.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {TAGS.map((t) => {
                    const active = classification[s.stakeholder_key] === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setClassification((prev) => ({ ...prev, [s.stakeholder_key]: t.key }))}
                        style={{
                          flex: 1,
                          minHeight: 44,
                          padding: '4px',
                          fontSize: 12,
                          borderRadius: 6,
                          border: `1.5px solid ${active ? 'var(--color-teal)' : 'var(--color-border)'}`,
                          background: active ? 'var(--color-teal)' : 'var(--color-card)',
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
            disabled={!allClassified}
            onClick={() => setPhase('writing')}
            style={{
              width: '100%',
              background: allClassified ? 'var(--color-navy)' : 'var(--color-border)',
              color: allClassified ? 'var(--color-navy-text-on)' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-button)',
              padding: 14,
              fontSize: 16,
              fontWeight: 500,
              marginTop: 4,
            }}
          >
            분류 완료
          </button>
          {!allClassified && (
            <p style={{ fontSize: 12, color: 'var(--color-coral)', marginTop: 8, textAlign: 'center' }}>
              6명 모두 분류해주세요. ({Object.keys(classification).length}/6)
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
            marginBottom: 20,
          }}
        >
          <textarea
            value={mitigation}
            onChange={(e) => setMitigation(e.target.value)}
            rows={6}
            placeholder="보완책을 구체적으로 서술해주세요."
            style={{
              width: '100%',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: 10,
              fontSize: 13.5,
              fontFamily: 'var(--font-family)',
              resize: 'vertical',
            }}
          />
          <div style={{ textAlign: 'right', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {saveStatus === 'saving' && '저장 중...'}
              {saveStatus === 'saved' && '저장됨'}
              {saveStatus === 'error' && (
                <span style={{ color: 'var(--color-coral)' }}>저장 실패: {saveError}</span>
              )}
            </span>
          </div>
        </div>

        <button
          disabled={mitigation.trim().length === 0}
          onClick={async () => { await saveResponse(token, enrollmentId, stepId, { classification, mitigation }); onComplete({ classification, mitigation }); }}
          style={{
            width: '100%',
            background: mitigation.trim() ? 'var(--color-navy)' : 'var(--color-border)',
            color: mitigation.trim() ? 'var(--color-navy-text-on)' : 'var(--color-text-muted)',
            border: 'none',
            borderRadius: 'var(--radius-button)',
            padding: 14,
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          다음 단계로
        </button>
      </div>
    </div>
  );
}
