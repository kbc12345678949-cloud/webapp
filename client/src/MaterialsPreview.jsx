// src/MaterialsPreview.jsx
// 로그인 없이 언제든 볼 수 있는 "자료만 보기" 화면. 수행평가 시간이 아니어도
// 학생이 STEP1·STEP4 자료를 복습할 수 있도록 한다. 서버 통신이 전혀 없고,
// 화면에 이미 쓰던 정적 데이터만 그대로 보여준다(답안 저장·제출과는 완전히 무관).
import { materials as step1Materials } from './data/step1Materials';
import { step4Materials } from './data/step4Materials';

function Card({ title, children }) {
  return (
    <div
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        padding: 14,
        marginBottom: 10,
      }}
    >
      <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 6px' }}>{title}</p>
      <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--color-text-body)', margin: 0 }}>{children}</p>
    </div>
  );
}

export default function MaterialsPreview({ onBack }) {
  return (
    <div style={{ padding: '24px 20px 40px', maxWidth: 640, margin: '0 auto' }}>
      <button
        onClick={onBack}
        style={{
          display: 'block',
          background: 'none',
          border: 'none',
          color: 'var(--color-teal)',
          fontSize: 13,
          padding: 0,
          marginBottom: 16,
          cursor: 'pointer',
        }}
      >
        ← 로그인 화면으로
      </button>

      <h3 style={{ color: 'var(--color-navy)', fontSize: 18, fontWeight: 500, margin: '0 0 4px' }}>
        자료 미리·다시 보기
      </h3>
      <p style={{ color: 'var(--color-text-body)', fontSize: 13, margin: '0 0 20px' }}>
        수행평가 시간이 아니어도 언제든 볼 수 있는 화면입니다. 여기서 보는 내용은 저장·제출되지 않습니다.
      </p>

      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-teal)', margin: '0 0 10px' }}>
        자료 1~7
      </p>
      {step1Materials.map((m) => (
        <Card key={m.key} title={m.title}>
          {m.body}
        </Card>
      ))}

      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-teal)', margin: '20px 0 10px' }}>
        새로운 정보 (STEP4)
      </p>
      <Card title="속보">
        중앙정부 관광 활성화 공모 사업 선정 — 사업비 30억 원 확보(1회성, 시설 조성용)
      </Card>
      {step4Materials.map((m) => (
        <Card key={m.key} title={m.title}>
          {m.body}
        </Card>
      ))}
    </div>
  );
}
