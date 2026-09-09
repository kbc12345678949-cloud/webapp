// src/components/MaterialIcon.jsx
// 자료 유형별 아이콘. 인터뷰(person)와 통계·문서(doc)를 시각적으로 구분한다.

export default function MaterialIcon({ type, size = 22 }) {
  const color = 'var(--color-teal)';
  if (type === 'person') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.6" />
        <path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="3" width="16" height="18" rx="1.5" stroke={color} strokeWidth="1.6" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
