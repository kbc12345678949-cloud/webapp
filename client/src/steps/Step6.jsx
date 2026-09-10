// src/steps/Step6.jsx
import ProgressHeader from '../components/ProgressHeader';
import MaterialIcon from '../components/MaterialIcon';

const Row = ({ label, text }) => (
  <div style={{ marginBottom: 8 }}>
    <span
      style={{
        display: 'inline-block',
        fontSize: 10.5,
        fontWeight: 500,
        color: 'var(--color-teal)',
        marginBottom: 2,
      }}
    >
      {label}
    </span>
    <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--color-text-body)' }}>{text}</p>
  </div>
);

export default function Step6({ onComplete, onBack, student, stakeholders, loadError }) {
  return (
    <div>
      <ProgressHeader projectLabel="TF팀 브리핑" currentStep={6} totalSteps={9} studentNo={student?.studentNo} studentName={student?.name} />

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
            ← 이전 단계로 (재판단 다시 보기)
          </button>
        )}
        <h3 style={{ color: 'var(--color-navy)', fontSize: 17, fontWeight: 500, margin: '0 0 4px' }}>
          이해관계자 분석
        </h3>
        <p style={{ color: 'var(--color-text-body)', fontSize: 13, margin: '0 0 16px' }}>
          이 정책으로 영향을 받는 6명의 입장을 확인해주세요.
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
                padding: '14px 16px',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <MaterialIcon type="person" size={20} />
                <span style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--color-navy)' }}>{s.name}</span>
              </div>
              {s.linked_material_label && (
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: 10.5,
                    color: 'var(--color-text-muted)',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    padding: '2px 8px',
                    marginBottom: 10,
                  }}
                >
                  {s.linked_material_label}
                </span>
              )}
              <div style={{ marginTop: 8 }}>
                <Row label="원하는 것" text={s.wants} />
                <Row label="얻을 수 있는 이익" text={s.benefit} />
                <Row label="감수해야 하는 불이익" text={s.harm} />
                <Row label="중요하게 생각하는 가치" text={s.core_value} />
              </div>
            </div>
          ))}

        <button
          onClick={onComplete}
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
          다음 단계로
        </button>
      </div>
    </div>
  );
}
