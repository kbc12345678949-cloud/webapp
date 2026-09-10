// src/components/StakeholderIcon.jsx
// 이해관계자 6명을 사람 형상이 아니라, 역할을 상징하는 단순한 아이콘으로 구분한다.
// (외모·나이·성별에 대한 고정관념을 만들지 않기 위해 의도적으로 사람 그림을 쓰지 않음)

const ICONS = {
  s1: 'shop', // 원도심 임차 상인
  s2: 'building', // 건물주(임대인)
  s3: 'house', // 오래 거주한 주민
  s4: 'sprout', // 지역 청년
  s5: 'bed', // 숙박업 종사자
  s6: 'chart', // 시 재정 담당 부서
};

export default function StakeholderIcon({ stakeholderKey, size = 22 }) {
  const color = 'var(--color-teal)';
  const type = ICONS[stakeholderKey] || 'shop';

  if (type === 'shop') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M4 9l1-4h14l1 4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 9v10h16V9" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 19v-5h6v5" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M4 9c0 1.4 1 2.5 2.2 2.5S8.4 10.4 8.4 9c0 1.4 1 2.5 2.2 2.5S12.8 10.4 12.8 9c0 1.4 1 2.5 2.2 2.5S17.2 10.4 17.2 9c0 1.4 1 2.5 2.2 2.5S21.6 10.4 21.6 9" stroke={color} strokeWidth="1.2" />
      </svg>
    );
  }
  if (type === 'building') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="5" y="3" width="14" height="18" rx="1" stroke={color} strokeWidth="1.6" />
        <path d="M8.5 7h2M13.5 7h2M8.5 11h2M13.5 11h2M8.5 15h2M13.5 15h2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'house') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M4 11l8-7 8 7" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 10v10h12V10" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M10 20v-6h4v6" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === 'sprout') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 21V11" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 12c0-3.5-2.5-6-7-6 0 3.5 2.5 6 7 6z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M12 9c0-3 2-5 6-5 0 3-2 5-6 5z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === 'bed') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M3 18v-6a2 2 0 012-2h14a2 2 0 012 2v6" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M3 18v2M21 18v2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M5 10V7a1 1 0 011-1h5a1 1 0 011 1v3" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="7.5" cy="8.2" r="1" stroke={color} strokeWidth="1.3" />
      </svg>
    );
  }
  // chart (시 재정 담당 부서)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
