// src/components/ReviewPanel.jsx
// STEP이 진행될수록, 화면을 벗어나지 않고도 이전 자료와 내가 이미 쓴 답변을
// 팝업으로 다시 확인할 수 있게 한다. currentStep 숫자에 따라 아직 지나오지 않은
// 내용(예: STEP4 전에는 "새로운 정보")은 자동으로 숨긴다.
import { useState } from 'react';
import { materials as step1Materials } from '../data/step1Materials';
import { step4Materials } from '../data/step4Materials';
import { policies } from '../data/policies';

const DECISION_LABEL = { keep: '유지', change: '변경' };
const TAG_LABEL = { benefit: '혜택', harm: '불이익', neutral: '무관' };

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-teal)',
          margin: '0 0 10px',
          textTransform: 'uppercase',
          letterSpacing: 0.3,
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        padding: 14,
        marginBottom: 8,
      }}
    >
      {title && (
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 6px' }}>{title}</p>
      )}
      <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--color-text-body)' }}>{children}</div>
    </div>
  );
}

export default function ReviewPanel({ currentStep, step3Answer, step5Answer, step7Answer, step8Answer, stakeholders }) {
  const [open, setOpen] = useState(false);

  const p3 = policies.find((p) => p.id === step3Answer?.choice);
  const p5 = policies.find((p) => p.id === step5Answer?.choice);
  const p8 = policies.find((p) => p.id === step8Answer?.finalChoice);

  const classificationText = (cls) =>
    cls && stakeholders
      ? Object.entries(cls)
          .map(([key, tag]) => `${stakeholders.find((s) => s.stakeholder_key === key)?.name || key}(${TAG_LABEL[tag] || tag})`)
          .join(', ')
      : '';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12.5,
          color: 'var(--color-navy)',
          fontWeight: 500,
          marginBottom: 14,
          minHeight: 40,
        }}
      >
        📎 이전 자료·내 답변 다시 보기
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(27,42,65,0.55)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '16px 16px 0 0',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '18px 20px 28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-navy)', margin: 0 }}>
                이전 자료·내 답변 다시 보기
              </p>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  color: 'var(--color-text-muted)',
                  minWidth: 44,
                  minHeight: 44,
                }}
              >
                ✕
              </button>
            </div>

            {currentStep >= 4 && step3Answer && (
              <Section title="내 1차 판단 (STEP3)">
                <Card>
                  <strong>{p3 ? `${p3.label} · ${p3.title}` : '-'}</strong>
                  <p style={{ margin: '6px 0 0' }}>{step3Answer.reason}</p>
                </Card>
              </Section>
            )}

            {currentStep >= 6 && step5Answer && (
              <Section title="내 재판단 (STEP5)">
                <Card>
                  <strong>
                    {DECISION_LABEL[step5Answer.decision]}
                    {p5 ? ` → ${p5.label} · ${p5.title}` : ''}
                  </strong>
                  <p style={{ margin: '6px 0 0' }}>{step5Answer.reason}</p>
                </Card>
              </Section>
            )}

            {currentStep >= 8 && step7Answer && (
              <Section title="내 트레이드오프 분석 (STEP7)">
                <Card>
                  <p style={{ margin: 0 }}>{classificationText(step7Answer.classification)}</p>
                  <p style={{ margin: '6px 0 0' }}>{step7Answer.mitigation}</p>
                </Card>
              </Section>
            )}

            {currentStep >= 9 && step8Answer && (
              <Section title="내 최종 결정 (STEP8)">
                <Card>
                  <strong>{p8 ? `${p8.label} · ${p8.title}` : '-'}</strong>
                  <p style={{ margin: '6px 0 0' }}>핵심 근거: {step8Answer.coreReason}</p>
                  <p style={{ margin: '4px 0 0' }}>예상 문제점: {step8Answer.expectedProblem}</p>
                  <p style={{ margin: '4px 0 0' }}>보완 방안: {step8Answer.mitigationPlan}</p>
                </Card>
              </Section>
            )}

            {currentStep >= 5 && (
              <Section title="새로운 정보 (STEP4)">
                <Card>
                  중앙정부 관광 활성화 공모 사업 선정 — 사업비 30억 원 확보(1회성, 시설 조성용)
                </Card>
                {step4Materials.map((m) => (
                  <Card key={m.key} title={m.title}>
                    {m.body}
                  </Card>
                ))}
              </Section>
            )}

            <Section title="자료 1~7 (STEP1)">
              {step1Materials.map((m) => (
                <Card key={m.key} title={m.title}>
                  {m.body}
                </Card>
              ))}
            </Section>
          </div>
        </div>
      )}
    </>
  );
}
