// src/teacher/TeacherLayout.jsx
// 교사용 화면의 휴대폰/태블릿 모드. 고른 값은 이 기기에만 기억된다(localStorage).
// 태블릿 모드면 <html data-layout="teacher-tablet">을 붙여 theme.css에서 화면 폭을 넓힌다.
import { useState, useEffect } from 'react';

const KEY = 'teacher:layout';

export function useTeacherLayout() {
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'phone' || saved === 'tablet') return saved;
    } catch {
      /* 무시 */
    }
    return 'phone';
  });
  useEffect(() => {
    document.documentElement.dataset.layout = layout === 'tablet' ? 'teacher-tablet' : 'teacher-phone';
    try {
      localStorage.setItem(KEY, layout);
    } catch {
      /* 무시 */
    }
  }, [layout]);
  return [layout, setLayout];
}

// 로그인 화면용: 두 칸짜리 선택 버튼
export function TeacherLayoutToggle({ layout, onChange }) {
  const btn = (key, label) => {
    const active = layout === key;
    return (
      <button
        type="button"
        onClick={() => onChange(key)}
        aria-pressed={active}
        style={{
          flex: 1,
          padding: '10px 8px',
          borderRadius: 8,
          border: 'none',
          background: active ? 'var(--color-navy)' : 'transparent',
          color: active ? 'var(--color-navy-text-on)' : 'var(--color-text-body)',
          fontSize: 13.5,
          fontWeight: active ? 600 : 400,
        }}
      >
        {label}
      </button>
    );
  };
  return (
    <div style={{ marginBottom: 22 }}>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 6px' }}>화면 크기 선택</p>
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: 4,
          background: '#FFFFFF',
          border: '1px solid var(--color-border)',
          borderRadius: 10,
        }}
      >
        {btn('phone', '📱 휴대폰 모드')}
        {btn('tablet', '📲 태블릿 모드')}
      </div>
    </div>
  );
}

// 로그인 뒤 상단용: 누르면 반대 모드로 바뀌는 작은 버튼
export function TeacherLayoutSwitch({ layout, onChange, dark = true }) {
  const next = layout === 'tablet' ? 'phone' : 'tablet';
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      title="화면 크기 바꾸기"
      style={{
        background: dark ? 'rgba(255,255,255,0.12)' : '#FFFFFF',
        color: dark ? '#FFFFFF' : 'var(--color-navy)',
        border: dark ? '1px solid rgba(255,255,255,0.35)' : '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 12,
        whiteSpace: 'nowrap',
        marginLeft: 'auto',
      }}
    >
      {next === 'tablet' ? '📲 태블릿 모드로' : '📱 휴대폰 모드로'}
    </button>
  );
}
