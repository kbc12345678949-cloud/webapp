// src/components/MaterialChart.jsx
// 자료1·6·7처럼 숫자 변화가 핵심인 자료에 간단한 막대그래프를 붙인다.
// 별도 차트 라이브러리 없이 가벼운 SVG로 직접 그린다.

const CHART_DATA = {
  m1: {
    bars: [
      { label: '2024년', value: 250 },
      { label: '2025년', value: 350 },
      { label: '2026년', value: 490 },
    ],
    unit: '만 명',
  },
  m5: {
    bars: [
      { label: '3년 전' , value: 2000 },
      { label: '지금', value: 4000, color: 'var(--color-coral)' },
    ],
    unit: '만 원',
  },
  m6: {
    bars: [
      { label: '전체 예산', value: 4200, color: 'var(--color-border)' },
      { label: '관광 예산', value: 50, color: 'var(--color-coral)' },
    ],
    unit: '억 원',
  },
  m7: {
    bars: [
      { label: '개발 전', value: 20 },
      { label: '5년 후', value: 180, color: 'var(--color-coral)' },
    ],
    unit: '만 명',
  },
  n1: {
    bars: [
      { label: '3년 전' , value: 1.0 },
      { label: '지금', value: 2.4, color: 'var(--color-coral)' },
    ],
    unit: '배',
  },
};

function Bars({ bars, unit }) {
  const max = Math.max(...bars.map((b) => b.value));
  const barWidth = 64;
  const gap = 28;
  const chartHeight = 110;
  const width = bars.length * (barWidth + gap) + gap;

  return (
    <svg
      width="100%"
      height={chartHeight + 40}
      viewBox={`0 0 ${width} ${chartHeight + 40}`}
      style={{ maxWidth: 320, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label={bars.map((b) => `${b.label} ${b.value}${unit}`).join(', ')}
    >
      {bars.map((b, i) => {
        const barHeight = Math.max((b.value / max) * chartHeight, 3);
        const x = gap + i * (barWidth + gap);
        const y = chartHeight - barHeight + 10;
        return (
          <g key={b.label}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx={4} fill={b.color || 'var(--color-teal)'} />
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize="12"
              fontWeight="500"
              fill="var(--color-navy)"
            >
              {b.value}{unit}
            </text>
            <text
              x={x + barWidth / 2}
              y={chartHeight + 26}
              textAnchor="middle"
              fontSize="11"
              fill="var(--color-text-muted)"
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function MaterialChart({ materialKey }) {
  const data = CHART_DATA[materialKey];
  if (!data) return null;
  return (
    <div style={{ margin: '12px 0 4px' }}>
      <Bars bars={data.bars} unit={data.unit} />
    </div>
  );
}
