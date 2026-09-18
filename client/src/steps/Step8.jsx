// src/steps/Step8.jsx
import { useState, useEffect } from 'react';
import { policies } from '../data/policies';
import { hasRepeatedCharacterAbuse } from '../utils/textQuality';
import HintQuestions from '../components/HintQuestions';
import ReviewPanel from '../components/ReviewPanel';
import { useAutoSave } from '../hooks/useAutoSave';
import { saveResponse } from '../api';
import ProgressHeader from '../components/ProgressHeader';

const truncate = (text, n = 40) => (text && text.length > n ? text.slice(0, n) + '…' : text);

const DECISION_LABEL = { keep: '유지', change: '변경' };

function JourneyRow({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--color-teal)' }}>{label}</span>
      <p style={{ margin: '2px 0 0', fontSize: 12.5, lineHeight: 1.6, color: 'var(--color-text-body)' }}>
        {children}
      </p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, rows = 4, hints }) {
  return (
    <div
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        padding: 16,
        marginBottom: 14,
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 10px' }}>{label}</p>
      <HintQuestions questions={hints} />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
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
    </div>
  );
}

export default function Step8({ step3Answer, step5Answer, step7Answer, onComplete, onBack, student, token, enrollmentId, stepId, stakeholders, initialAnswer, onDraftChange }) {
  // 최종 선택은 STEP5(재판단)에서 정한 정책을 그대로 잇는다. 여기서 다시 고르게 하면
  // STEP7에서 이미 그 정책 기준으로 써둔 트레이드오프·보완책과 어긋날 수 있기 때문이다.
  const finalChoice = step5Answer?.choice ?? null;
  const [coreReason, setCoreReason] = useState(initialAnswer?.coreReason ?? '');
  // 예상 문제점·보완 방안은 STEP7에서 이미 쓴 내용(불만·보완책)과 같은 내용이라,
  // 여기서 새로 쓰지 않고 그대로 가져다 쓴다.
  const expectedProblem = step7Answer?.harmConcern ?? '';
  const mitigationPlan = step7Answer?.mitigation ?? '';

  const p3 = policies.find((p) => p.id === step3Answer?.choice);
  const p5 = policies.find((p) => p.id === step5Answer?.choice);
  const harmNames =
    step7Answer?.classification &&
    stakeholders?.filter((s) => step7Answer.classification[s.stakeholder_key] === 'harm').map((s) => s.name);
  const benefitNames =
    step7Answer?.classification &&
    stakeholders?.filter((s) => step7Answer.classification[s.stakeholder_key] === 'benefit').map((s) => s.name);

  const fieldsHaveAbuse = hasRepeatedCharacterAbuse(coreReason);
  const canSubmit = finalChoice && coreReason.trim() && !fieldsHaveAbuse;

  const { status: saveStatus, error: saveError } = useAutoSave(
    token,
    enrollmentId,
    stepId,
    { finalChoice, coreReason, expectedProblem, mitigationPlan },
    { skip: !coreReason }
  );

  useEffect(() => {
    onDraftChange?.({ finalChoice, coreReason, expectedProblem, mitigationPlan });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalChoice, coreReason]);

  return (
    <div>
      <ProgressHeader projectLabel="TF팀 브리핑" currentStep={8} totalSteps={9} studentNo={student?.studentNo} studentName={student?.name} />
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
            ← 이전 단계로 (트레이드오프 다시 보기)
          </button>
        )}
        <ReviewPanel currentStep={8} step3Answer={step3Answer} step5Answer={step5Answer} step7Answer={step7Answer} stakeholders={stakeholders} />
        <h3 style={{ color: 'var(--color-navy)', fontSize: 17, fontWeight: 500, margin: '0 0 4px' }}>
          최종 결정
        </h3>
        <p style={{ color: 'var(--color-text-body)', fontSize: 13, margin: '0 0 16px' }}>
          지금까지의 여정을 돌아보고, 핵심 근거를 정리해주세요.
        </p>

        {/* 나의 선택 여정 요약 */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--color-border)',
            borderLeft: '3px solid var(--color-navy)',
            borderRadius: '0 var(--radius-card) var(--radius-card) 0',
            padding: '14px 16px',
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-navy)', margin: '0 0 10px' }}>
            나의 선택 여정
          </p>
          <JourneyRow label="1차 판단">
            {p3 ? `${p3.label} · ${p3.title}` : '-'} — {truncate(step3Answer?.reason)}
          </JourneyRow>
          <JourneyRow label="재판단">
            {step5Answer ? DECISION_LABEL[step5Answer.decision] : '-'}
            {p5 ? ` → ${p5.label} · ${p5.title}` : ''} — {truncate(step5Answer?.reason)}
          </JourneyRow>
          <JourneyRow label="트레이드오프">
            혜택: {benefitNames?.length ? benefitNames.join(', ') : '없음'} / 불이익:{' '}
            {harmNames?.length ? harmNames.join(', ') : '없음'} — {truncate(step7Answer?.mitigation)}
          </JourneyRow>
        </div>

        {/* 최종 선택 — STEP5(재판단)에서 정한 정책이 그대로 이어진다(여기서 다시 고르지 않음) */}
        <div
          style={{
            background: 'var(--color-navy)',
            borderRadius: 'var(--radius-card)',
            padding: '14px 16px',
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 11, color: 'var(--color-border)', margin: '0 0 4px' }}>
            최종 선택 (재판단 때 정한 정책이 그대로 이어집니다)
          </p>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#FFFFFF', margin: 0 }}>
            {p5 ? `${p5.label} · ${p5.title}` : '(재판단 결과 없음)'}
          </p>
        </div>

        <Field
          label="핵심 근거"
          value={coreReason}
          onChange={setCoreReason}
          placeholder="최종 선택의 핵심 근거를 서술해주세요."
          hints={['1차 판단 → 재판단 → 트레이드오프 분석을 거치는 동안, 지금 이 선택을 가장 확신하게 만든 건 무엇이었나요?']}
        />

        {/* 예상 문제점·보완 방안은 STEP7에서 이미 작성한 내용(불만·보완책)을 그대로 최종 결정에 포함시킨다(다시 쓰지 않음) */}
        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: 16,
            marginBottom: 14,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 4px' }}>
            예상 문제점
          </p>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 10px' }}>
            STEP7에서 작성한 불이익 집단의 불만을 그대로 최종 결정에 포함합니다.
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-body)', margin: 0 }}>
            {expectedProblem || '(STEP7에서 작성한 내용이 없습니다)'}
          </p>
        </div>

        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: 16,
            marginBottom: 14,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 4px' }}>
            보완 방안
          </p>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 10px' }}>
            STEP7에서 작성한 보완책을 그대로 최종 결정에 포함합니다.
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-body)', margin: 0 }}>
            {mitigationPlan || '(STEP7에서 작성한 내용이 없습니다)'}
          </p>
        </div>
        <p style={{ textAlign: 'right', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
          {saveStatus === 'saving' && '저장 중...'}
          {saveStatus === 'saved' && '저장됨'}
          {saveStatus === 'error' && <span style={{ color: 'var(--color-coral)' }}>저장 실패: {saveError}</span>}
        </p>

        <button
          disabled={!canSubmit}
          onClick={async () => {
            await saveResponse(token, enrollmentId, stepId, {
              finalChoice,
              coreReason,
              expectedProblem,
              mitigationPlan,
            });
            onComplete({ finalChoice, coreReason, expectedProblem, mitigationPlan });
          }}
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
        {fieldsHaveAbuse && (
          <p style={{ fontSize: 12, color: 'var(--color-coral)', marginTop: 8, textAlign: 'center' }}>
            같은 글자가 반복되고 있어요. 내용을 구체적으로 써주세요.
          </p>
        )}
      </div>
    </div>
  );
}
