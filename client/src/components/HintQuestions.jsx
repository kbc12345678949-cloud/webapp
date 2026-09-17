// src/components/HintQuestions.jsx
// 서술형 칸 위에 "이런 걸 생각해보면 좋아요"를 보여주는 공용 컴포넌트.
export default function HintQuestions({ questions }) {
  if (!questions || questions.length === 0) return null;
  return (
    <div
      style={{
        marginBottom: 10,
        padding: '10px 12px',
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-teal)', margin: '0 0 4px' }}>
        💡 이런 질문을 참고해보세요
      </p>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {questions.map((q, i) => (
          <li key={i} style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--color-text-muted)' }}>
            {q}
          </li>
        ))}
      </ul>
    </div>
  );
}
