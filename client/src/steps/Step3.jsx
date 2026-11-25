// src/steps/Step3.jsx
import { useState, useEffect } from 'react';
import ProgressHeader from '../components/ProgressHeader';
import { policies, MIN_CHARS_STEP3 } from '../data/policies';
import { hasRepeatedCharacterAbuse } from '../utils/textQuality';
import { useTourismShell } from '../components/TourismShell';
import { textareaStyle } from '../components/fieldStyle';

// 저장은 App이 한곳에서 맡는다(입력할 때마다 onDraftChange로 알리면 App이 모아서 자동 저장).
// 글자 수는 여기서 막지 않고, 최종 제출 때 '내 답안 전체 확인'에서 한꺼번에 확인한다.
// 다음 단계(새로운 상황)가 고른 정책을 바탕으로 하므로, 정책 선택만은 해야 넘어갈 수 있다.
export default function Step3({ onComplete, onBack, student, initialAnswer, onDraftChange }) {
  const { readOnly } = useTourismShell();
  const [selected, setSelected] = useState(initialAnswer?.choice ?? null);
  const [reason, setReason] = useState(initialAnswer?.reason ?? '');

  const charCount = reason.trim().length;
  const meetsMin = charCount >= MIN_CHARS_STEP3;
  const hasAbuse = hasRepeatedCharacterAbuse(reason);
  const canSubmit = readOnly || !!selected;

  // 입력하는 동안 계속 상위(App)에도 지금 상태를 알려둔다.
  // 이렇게 해야 "이전 단계로" 갔다가 다시 돌아와도 쓰던 내용이 안 사라진다.
  useEffect(() => {
    if (!readOnly) onDraftChange?.({ choice: selected, reason });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, reason]);

  return (
    <div>
      <ProgressHeader projectLabel="TF팀 브리핑" currentStep={3} totalSteps={9} studentNo={student?.studentNo} studentName={student?.name} />

      <div style={{ padding: '20px 20px 26px' }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-teal)',
              fontSize: 13,
              padding: 0,
              marginBottom: 14,
              cursor: 'pointer',
            }}
          >
            ← 이전 단계로 (자료 다시 보기)
          </button>
        )}
        <h3 style={{ color: 'var(--color-navy)', fontSize: 17, fontWeight: 500, margin: '0 0 4px' }}>
          1차 판단
        </h3>
        <p style={{ color: 'var(--color-text-body)', fontSize: 13, margin: '0 0 16px' }}>
          세 정책안 중 하나를 선택하고, 그렇게 판단한 근거를 서술해주세요.
        </p>

        {/* 정책 3안 카드 */}
        <div id="field-t3-choice" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {policies.map((p) => {
            const isSelected = selected === p.id;
            return (
              <button
                key={p.id}
                onClick={() => !readOnly && setSelected(p.id)}
                disabled={readOnly}
                style={{
                  textAlign: 'left',
                  background: isSelected ? 'var(--color-navy)' : 'var(--color-card)',
                  border: `1.5px solid ${isSelected ? 'var(--color-navy)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-card)',
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: isSelected ? 'var(--color-border)' : 'var(--color-teal)',
                    }}
                  >
                    {p.label}
                  </span>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: isSelected ? 'var(--color-navy-text-on)' : 'var(--color-navy)',
                    }}
                  >
                    {p.title}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    lineHeight: 1.6,
                    color: isSelected ? 'var(--color-border)' : 'var(--color-text-body)',
                  }}
                >
                  {p.summary}
                </p>
              </button>
            );
          })}
        </div>

        {/* 근거 서술 */}
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
            선택한 근거를 서술해주세요
          </p>
          <textarea
            id="field-t3-reason"
            value={reason}
            onChange={(e) => !readOnly && setReason(e.target.value)}
            readOnly={readOnly}
            rows={6}
            placeholder={readOnly ? '(작성하지 않음)' : '제공된 자료를 근거로, 이 정책을 선택한 이유를 구체적으로 써보세요.'}
            style={textareaStyle(readOnly)}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <span style={{ fontSize: 12, color: meetsMin && !hasAbuse ? 'var(--color-teal)' : 'var(--color-text-muted)' }}>
              {charCount} / {MIN_CHARS_STEP3}자 이상 {meetsMin && !hasAbuse ? '✓' : ''}
            </span>
            {hasAbuse && <span style={{ fontSize: 12, color: 'var(--color-coral)' }}>같은 글자가 반복되고 있어요</span>}
          </div>
        </div>

        <button
          disabled={!canSubmit}
          onClick={() => onComplete({ choice: selected, reason })}
          style={{
            width: '100%',
            background: canSubmit ? 'var(--color-navy)' : 'var(--color-border)',
            color: canSubmit ? 'var(--color-navy-text-on)' : 'var(--color-text-muted)',
            border: 'none',
            borderRadius: 'var(--radius-button)',
            padding: 14,
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          다음 단계로
        </button>
        {!canSubmit && (
          <p style={{ fontSize: 12, color: 'var(--color-coral)', marginTop: 8, textAlign: 'center' }}>
            정책안을 선택해야 다음 단계(새로운 상황)로 넘어갈 수 있어요.
          </p>
        )}
        {canSubmit && !readOnly && !meetsMin && (
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8, textAlign: 'center' }}>
            글자 수는 최종 제출 전까지 채우면 돼요. 앞뒤 단계를 오가며 고칠 수 있어요.
          </p>
        )}
      </div>
    </div>
  );
}
