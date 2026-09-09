// src/steps/Step8.jsx
import { useState } from 'react';
import ProgressHeader from '../components/ProgressHeader';
import { policies } from '../data/policies';
import { useAutoSave } from '../hooks/useAutoSave';
import { saveResponse } from '../api';

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

function Field({ label, value, onChange, placeholder, rows = 4 }) {
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

export default function Step8({ step3Answer, step5Answer, step7Answer, onComplete, student, token, enrollmentId, stepId, stakeholders, initialAnswer }) {
  const [finalChoice, setFinalChoice] = useState(initialAnswer?.finalChoice ?? step5Answer?.choice ?? null);
  const [coreReason, setCoreReason] = useState(initialAnswer?.coreReason ?? '');
  const [expectedProblem, setExpectedProblem] = useState(initialAnswer?.expectedProblem ?? '');
  const [mitigationPlan, setMitigationPlan] = useState(initialAnswer?.mitigationPlan ?? '');

  const p3 = policies.find((p) => p.id === step3Answer?.choice);
  const p5 = policies.find((p) => p.id === step5Answer?.choice);
  const harmNames =
    step7Answer?.classification &&
    stakeholders?.filter((s) => step7Answer.classification[s.stakeholder_key] === 'harm').map((s) => s.name);
  const benefitNames =
    step7Answer?.classification &&
    stakeholders?.filter((s) => step7Answer.classification[s.stakeholder_key] === 'benefit').map((s) => s.name);

  const canSubmit = finalChoice && coreReason.trim() && expectedProblem.trim() && mitigationPlan.trim();

  const { status: saveStatus, error: saveError } = useAutoSave(
    token,
    enrollmentId,
    stepId,
    { finalChoice, coreReason, expectedProblem, mitigationPlan },
    { skip: !coreReason && !expectedProblem && !mitigationPlan }
  );

  return (
    <div>
      <ProgressHeader projectLabel="TF팀 브리핑" currentStep={8} totalSteps={9} studentNo={student?.studentNo} studentName={student?.name} />
      <div style={{ padding: '20px 20px 26px' }}>
        <h3 style={{ color: 'var(--color-navy)', fontSize: 17, fontWeight: 500, margin: '0 0 4px' }}>
          최종 결정
        </h3>
        <p style={{ color: 'var(--color-text-body)', fontSize: 13, margin: '0 0 16px' }}>
          지금까지의 여정을 돌아보고, 최종 정책을 결정해주세요.
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

        {/* 최종 선택 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {policies.map((p) => (
            <button
              key={p.id}
              onClick={() => setFinalChoice(p.id)}
              style={{
                flex: 1,
                padding: '12px 6px',
                borderRadius: 8,
                border: `1.5px solid ${finalChoice === p.id ? 'var(--color-navy)' : 'var(--color-border)'}`,
                background: finalChoice === p.id ? 'var(--color-navy)' : 'var(--color-card)',
                color: finalChoice === p.id ? 'var(--color-navy-text-on)' : 'var(--color-text)',
                fontSize: 12.5,
                fontWeight: 500,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <Field
          label="핵심 근거"
          value={coreReason}
          onChange={setCoreReason}
          placeholder="최종 선택의 핵심 근거를 서술해주세요."
        />
        <Field
          label="예상 문제점"
          value={expectedProblem}
          onChange={setExpectedProblem}
          placeholder="이 정책을 시행했을 때 예상되는 문제점을 서술해주세요."
        />
        <Field
          label="보완 방안"
          value={mitigationPlan}
          onChange={setMitigationPlan}
          placeholder="예상 문제점을 줄이기 위한 보완 방안을 서술해주세요."
        />
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
      </div>
    </div>
  );
}
