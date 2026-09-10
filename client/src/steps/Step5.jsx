// src/steps/Step5.jsx
import { useState, useEffect } from 'react';
import ProgressHeader from '../components/ProgressHeader';
import { policies } from '../data/policies';
import { useAutoSave } from '../hooks/useAutoSave';
import { saveResponse } from '../api';

const MIN_CHARS_STEP5 = 50;

export default function Step5({ previousChoice, onComplete, onBack, student, token, enrollmentId, stepId, initialAnswer, onDraftChange }) {
  const [decision, setDecision] = useState(initialAnswer?.decision ?? null);
  const [newChoice, setNewChoice] = useState(
    initialAnswer?.decision === 'change' ? initialAnswer.choice : null
  );
  const [reason, setReason] = useState(initialAnswer?.reason ?? '');

  const prevPolicy = policies.find((p) => p.id === previousChoice);
  const charCount = reason.trim().length;
  const meetsMin = charCount >= MIN_CHARS_STEP5;
  const decisionReady = decision === 'keep' || (decision === 'change' && newChoice);
  const canSubmit = decisionReady && meetsMin;
  const finalChoice = decision === 'change' ? newChoice : previousChoice;

  const { status: saveStatus, error: saveError } = useAutoSave(
    token,
    enrollmentId,
    stepId,
    { decision, choice: finalChoice, reason },
    { skip: !decision && !reason }
  );

  useEffect(() => {
    onDraftChange?.({ decision, choice: finalChoice, reason });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision, newChoice, reason]);

  return (
    <div>
      <ProgressHeader projectLabel="TF팀 브리핑" currentStep={5} totalSteps={9} studentNo={student?.studentNo} studentName={student?.name} />

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
            ← 이전 단계로 (새로운 상황 다시 보기)
          </button>
        )}
        <h3 style={{ color: 'var(--color-navy)', fontSize: 17, fontWeight: 500, margin: '0 0 4px' }}>
          재판단
        </h3>
        <p style={{ color: 'var(--color-text-body)', fontSize: 13, margin: '0 0 16px' }}>
          새로운 정보를 반영해, 1차 판단을 유지할지 변경할지 결정해주세요.
        </p>

        {/* 1차 판단 리마인드 */}
        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: '14px 16px',
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 11.5, color: 'var(--color-text-muted)', margin: '0 0 4px' }}>
            나의 1차 판단
          </p>
          <p style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--color-navy)', margin: 0 }}>
            {prevPolicy ? `${prevPolicy.label} · ${prevPolicy.title}` : '(선택 없음)'}
          </p>
        </div>

        {/* 유지 / 변경 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {[
            { key: 'keep', label: '기존 선택 유지' },
            { key: 'change', label: '다른 정책으로 변경' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setDecision(opt.key)}
              style={{
                flex: 1,
                padding: '12px 8px',
                borderRadius: 8,
                border: `1.5px solid ${decision === opt.key ? 'var(--color-navy)' : 'var(--color-border)'}`,
                background: decision === opt.key ? 'var(--color-navy)' : 'var(--color-card)',
                color: decision === opt.key ? 'var(--color-navy-text-on)' : 'var(--color-text)',
                fontSize: 13.5,
                fontWeight: 500,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 변경 시: 새 정책 선택 */}
        {decision === 'change' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {policies.map((p) => (
              <button
                key={p.id}
                onClick={() => setNewChoice(p.id)}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: `1.5px solid ${newChoice === p.id ? 'var(--color-teal)' : 'var(--color-border)'}`,
                  background: newChoice === p.id ? 'var(--color-teal)' : 'var(--color-card)',
                  color: newChoice === p.id ? '#FFFFFF' : 'var(--color-text)',
                  fontSize: 13,
                }}
              >
                {p.label} · {p.title}
              </button>
            ))}
          </div>
        )}

        {/* 이유 서술 */}
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
            그렇게 판단한 이유를 서술해주세요
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
            placeholder="새로운 자료를 반영해, 유지 또는 변경한 이유를 구체적으로 써보세요."
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: meetsMin ? 'var(--color-teal)' : 'var(--color-text-muted)' }}>
              {charCount} / {MIN_CHARS_STEP5}자 이상
            </span>
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
          disabled={!canSubmit}
          onClick={async () => { await saveResponse(token, enrollmentId, stepId, { decision, choice: finalChoice, reason }); onComplete({ decision, choice: finalChoice, reason }); }}
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
            {!decisionReady
              ? '유지 또는 변경 여부를 선택해주세요.'
              : `${MIN_CHARS_STEP5 - charCount}자 더 작성해주세요.`}
          </p>
        )}
      </div>
    </div>
  );
}
