// src/steps/Done.jsx
import ProgressHeader from '../components/ProgressHeader';
import { policies } from '../data/policies';

const DECISION_LABEL = { keep: '유지', change: '변경' };
const TAG_LABEL = { benefit: '혜택', harm: '불이익', neutral: '무관' };

function Section({ title, children }) {
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
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 10px' }}>{title}</p>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  if (!children) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--color-teal)' }}>{label}</span>
      <p style={{ margin: '2px 0 0', fontSize: 12.5, lineHeight: 1.6, color: 'var(--color-text-body)' }}>
        {children}
      </p>
    </div>
  );
}

export default function Done({ student, step3Answer, step5Answer, step7Answer, step8Answer, step9Answer, stakeholders }) {
  const p3 = policies.find((p) => p.id === step3Answer?.choice);
  const p5 = policies.find((p) => p.id === step5Answer?.choice);
  const p8 = policies.find((p) => p.id === step8Answer?.finalChoice);

  const nameByKey = (key) => stakeholders?.find((s) => s.stakeholder_key === key)?.name || key;
  const classificationText = step7Answer?.classification
    ? Object.entries(step7Answer.classification)
        .map(([key, tag]) => `${nameByKey(key)}(${TAG_LABEL[tag] || tag})`)
        .join(', ')
    : '';

  return (
    <div>
      <ProgressHeader projectLabel="TF팀 브리핑" currentStep={9} totalSteps={9} studentNo={student?.studentNo} studentName={student?.name} />
      <div style={{ padding: '20px 20px 26px' }}>
        <div
          style={{
            background: 'var(--color-navy)',
            borderRadius: 'var(--radius-card)',
            padding: '16px 18px',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 500, margin: 0 }}>
            제출이 완료되었습니다. 수고하셨습니다.
          </p>
        </div>

        <h3 style={{ color: 'var(--color-navy)', fontSize: 15, fontWeight: 500, margin: '0 0 12px' }}>
          내가 제출한 답안
        </h3>

        {step3Answer && (
          <Section title="1차 판단">
            <Row label="선택">{p3 ? `${p3.label} · ${p3.title}` : '-'}</Row>
            <Row label="근거">{step3Answer.reason}</Row>
          </Section>
        )}

        {step5Answer && (
          <Section title="재판단">
            <Row label="결정">{DECISION_LABEL[step5Answer.decision] || step5Answer.decision}</Row>
            <Row label="이유">{step5Answer.reason}</Row>
          </Section>
        )}

        {step7Answer && (
          <Section title="트레이드오프 분석">
            <Row label="분류 결과">{classificationText}</Row>
            <Row label="보완책">{step7Answer.mitigation}</Row>
          </Section>
        )}

        {step8Answer && (
          <Section title="최종 결정">
            <Row label="최종 선택">{p8 ? `${p8.label} · ${p8.title}` : '-'}</Row>
            <Row label="핵심 근거">{step8Answer.coreReason}</Row>
            <Row label="예상 문제점">{step8Answer.expectedProblem}</Row>
            <Row label="보완 방안">{step8Answer.mitigationPlan}</Row>
          </Section>
        )}

        {step9Answer && (
          <Section title="성찰">
            {step9Answer.branch === 'had' ? (
              <>
                <Row label="의견이 갈렸던 지점과 짝의 근거">{step9Answer.hadPoint}</Row>
                <Row label="판단 변화 여부와 이유">{step9Answer.hadChanged}</Row>
              </>
            ) : (
              <Row label="의견이 일치한 이유">{step9Answer.noneReason}</Row>
            )}
            <Row label="생각을 가장 크게 흔든 자료·순간">{step9Answer.self1}</Row>
            <Row label="가장 어려웠던 부분">{step9Answer.self2}</Row>
            <Row label="새롭게 느낀 점">{step9Answer.self3}</Row>
          </Section>
        )}
      </div>
    </div>
  );
}
