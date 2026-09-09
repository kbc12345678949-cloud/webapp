// src/steps/Step0.jsx
import ProgressHeader from '../components/ProgressHeader';

export default function Step0({ onStart, student }) {
  return (
    <div>
      <ProgressHeader projectLabel="TF팀 브리핑" currentStep={0} totalSteps={9} studentNo={student?.studentNo} studentName={student?.name} />

      <div style={{ padding: '22px 20px 26px' }}>
        <div
          style={{
            display: 'inline-block',
            borderLeft: '3px solid var(--color-coral)',
            borderRadius: 0,
            paddingLeft: 8,
            marginBottom: 14,
          }}
        >
          <span style={{ color: 'var(--color-coral)', fontSize: 12, fontWeight: 500 }}>
            긴급 정책 현안
          </span>
        </div>

        <h3
          style={{
            color: 'var(--color-navy)',
            fontSize: 19,
            fontWeight: 500,
            lineHeight: 1.4,
            margin: '0 0 14px',
          }}
        >
          ☆☆시 관광정책, 이대로 괜찮은가
        </h3>

        <p
          style={{
            color: 'var(--color-text-body)',
            fontSize: 13.5,
            lineHeight: 1.7,
            margin: '0 0 18px',
          }}
        >
          인구 20만 명의 항구도시 ☆☆시. 최근 몇 년 사이 관광객이 크게 늘며 지역 경제는
          활기를 띠었지만, 원도심 주민들의 불편도 함께 커지고 있습니다.
        </p>

        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderLeft: '3px solid var(--color-teal)',
            borderRadius: '0 10px 10px 0',
            padding: '14px 16px',
            marginBottom: 22,
          }}
        >
          <p
            style={{
              color: 'var(--color-teal)',
              fontSize: 11.5,
              fontWeight: 500,
              margin: '0 0 6px',
              letterSpacing: 0.2,
            }}
          >
            당신의 임무
          </p>
          <p style={{ color: 'var(--color-navy)', fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
            당신은 시청 관광정책 TF팀원(특정 문제를 해결하기 위해 여러 부서에서 잠깐 모인
            전담팀)입니다. 관광 활성화와 주민 생활권 보호, 두 가치 사이에서 정책을 결정하고
            그 근거를 제시해야 합니다.
          </p>
        </div>

        <button
          onClick={onStart}
          style={{
            width: '100%',
            background: 'var(--color-navy)',
            color: 'var(--color-navy-text-on)',
            border: 'none',
            borderRadius: 'var(--radius-button)',
            padding: 14,
            fontSize: 17,
            fontWeight: 500,
          }}
        >
          브리핑 시작하기
        </button>
      </div>
    </div>
  );
}
