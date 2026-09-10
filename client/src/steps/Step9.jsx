// src/steps/Step9.jsx
import { useState, useEffect } from 'react';
import ProgressHeader from '../components/ProgressHeader';
import { saveResponse, submitFinal } from '../api';

const MIN_BRANCH_HAD = 30; // "있었다" 경로: 질문 2개 × 30자 = 60자
const MIN_BRANCH_NONE = 60; // "없었다" 경로: 질문 1개 × 60자 = 60자 (동일 총량)
const MIN_SELF = 30;

function TextField({ label, value, onChange, min, placeholder }) {
  const count = value.trim().length;
  const ok = count >= min;
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 8px' }}>{label}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
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
      <span style={{ fontSize: 11.5, color: ok ? 'var(--color-teal)' : 'var(--color-text-muted)' }}>
        {count} / {min}자 이상
      </span>
    </div>
  );
}

export default function Step9({ onSubmit, onBack, student, token, enrollmentId, stepId, initialAnswer, onDraftChange }) {
  const [branch, setBranch] = useState(initialAnswer?.branch ?? null);
  const [hadPoint, setHadPoint] = useState(initialAnswer?.hadPoint ?? '');
  const [hadChanged, setHadChanged] = useState(initialAnswer?.hadChanged ?? '');
  const [noneReason, setNoneReason] = useState(initialAnswer?.noneReason ?? '');
  const [self1, setSelf1] = useState(initialAnswer?.self1 ?? '');
  const [self2, setSelf2] = useState(initialAnswer?.self2 ?? '');
  const [self3, setSelf3] = useState(initialAnswer?.self3 ?? '');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const branchOk =
    branch === 'had'
      ? hadPoint.trim().length >= MIN_BRANCH_HAD && hadChanged.trim().length >= MIN_BRANCH_HAD
      : branch === 'none'
      ? noneReason.trim().length >= MIN_BRANCH_NONE
      : false;

  const selfOk =
    self1.trim().length >= MIN_SELF && self2.trim().length >= MIN_SELF && self3.trim().length >= MIN_SELF;

  const canSubmit = branchOk && selfOk;

  const finalPayload = {
    branch,
    hadPoint: branch === 'had' ? hadPoint : undefined,
    hadChanged: branch === 'had' ? hadChanged : undefined,
    noneReason: branch === 'none' ? noneReason : undefined,
    self1,
    self2,
    self3,
  };

  useEffect(() => {
    onDraftChange?.(finalPayload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, hadPoint, hadChanged, noneReason, self1, self2, self3]);

  return (
    <div>
      <ProgressHeader projectLabel="TF팀 브리핑" currentStep={9} totalSteps={9} studentNo={student?.studentNo} studentName={student?.name} />
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
            ← 이전 단계로 (최종 결정 다시 보기)
          </button>
        )}
        <h3 style={{ color: 'var(--color-navy)', fontSize: 17, fontWeight: 500, margin: '0 0 4px' }}>
          성찰
        </h3>
        <p style={{ color: 'var(--color-text-body)', fontSize: 13, margin: '0 0 16px' }}>
          마지막 단계입니다. 오늘의 판단 과정을 돌아봐 주세요.
        </p>

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
            짝과 의견이 갈렸던 부분이 있었나요?
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {[
              { key: 'had', label: '있었다' },
              { key: 'none', label: '없었다' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setBranch(opt.key)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  border: `1.5px solid ${branch === opt.key ? 'var(--color-navy)' : 'var(--color-border)'}`,
                  background: branch === opt.key ? 'var(--color-navy)' : 'var(--color-card)',
                  color: branch === opt.key ? 'var(--color-navy-text-on)' : 'var(--color-text)',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {branch === 'had' && (
            <>
              <TextField
                label="어떤 지점에서 의견이 갈렸고, 짝의 근거는 무엇이었나요?"
                value={hadPoint}
                onChange={setHadPoint}
                min={MIN_BRANCH_HAD}
                placeholder="갈린 지점과 짝의 근거를 써주세요."
              />
              <TextField
                label="논의 후 내 판단이 달라졌나요, 그대로였나요? 그 이유는?"
                value={hadChanged}
                onChange={setHadChanged}
                min={MIN_BRANCH_HAD}
                placeholder="판단 변화 여부와 이유를 써주세요."
              />
            </>
          )}

          {branch === 'none' && (
            <TextField
              label="짝과 의견이 일치한 이유는 무엇이라고 생각하나요?"
              value={noneReason}
              onChange={setNoneReason}
              min={MIN_BRANCH_NONE}
              placeholder="같은 자료를 보고 같은 결론에 도달한 것인지, 논의 과정에서 한쪽으로 맞춰진 것인지 서술해주세요."
            />
          )}
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
          <p style={{ fontSize: 11.5, color: 'var(--color-teal)', fontWeight: 500, margin: '0 0 12px' }}>
            자기 성찰
          </p>
          <TextField
            label="1차 판단에서 최종 결정까지 오는 동안, 내 생각을 가장 크게 흔든 자료나 순간은 무엇이었나요?"
            value={self1}
            onChange={setSelf1}
            min={MIN_SELF}
          />
          <TextField
            label="이번 활동에서 가장 어려웠던 부분은 무엇이었고, 어떻게 해결하려고 했나요?"
            value={self2}
            onChange={setSelf2}
            min={MIN_SELF}
          />
          <TextField
            label='이번 활동을 통해 "정치적 판단을 내린다는 것"에 대해 새롭게 느낀 점이 있다면?'
            value={self3}
            onChange={setSelf3}
            min={MIN_SELF}
          />
        </div>

        <button
          disabled={!canSubmit}
          onClick={() => setShowConfirm(true)}
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
          최종 제출하기
        </button>
      </div>

      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(27,42,65,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 'var(--radius-card)',
              padding: 22,
              maxWidth: 320,
              width: '100%',
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 10px' }}>
              최종 제출하시겠습니까?
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-body)', lineHeight: 1.6, margin: '0 0 20px' }}>
              최종 제출 후에는 답안을 수정할 수 없습니다.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  border: '1.5px solid var(--color-border)',
                  background: '#FFFFFF',
                  color: 'var(--color-text)',
                  fontSize: 14,
                }}
              >
                취소
              </button>
              <button
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);
                  setSubmitError('');
                  try {
                    await saveResponse(token, enrollmentId, stepId, finalPayload);
                    await submitFinal(token, enrollmentId);
                    setShowConfirm(false);
                    onSubmit(finalPayload);
                  } catch (err) {
                    setSubmitError(err.message);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--color-navy)',
                  color: 'var(--color-navy-text-on)',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                제출
              </button>
            </div>
            {submitting && (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10, textAlign: 'center' }}>
                제출 처리 중입니다...
              </p>
            )}
            {submitError && (
              <p style={{ fontSize: 12, color: 'var(--color-coral)', marginTop: 10, textAlign: 'center' }}>
                제출에 실패했습니다: {submitError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
