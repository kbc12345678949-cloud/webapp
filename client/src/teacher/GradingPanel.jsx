// src/teacher/GradingPanel.jsx
// 루브릭 항목마다 상/중/하/미제출을 골라 즉시 저장하고, 총점을 실시간으로 보여준다.
import { useState, useEffect, useCallback } from 'react';
import { teacherApi } from './api';

const TIERS = [
  { key: 'high', label: '상' },
  { key: 'mid', label: '중' },
  { key: 'low', label: '하' },
  { key: 'none', label: '미제출(0점)' },
];

export default function GradingPanel({ token, projectId, enrollmentId, studentName }) {
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await teacherApi.getGrades(token, projectId, enrollmentId);
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    }
  }, [token, projectId, enrollmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const scoreFor = (item, tierKey) => {
    if (tierKey === 'high') return item.max_score;
    if (tierKey === 'mid') return item.mid_score;
    if (tierKey === 'low') return item.base_score;
    return 0; // 미제출
  };

  const tierOf = (item) => {
    if (item.score === null || item.score === undefined) return 'none'; // 아직 입력이 없으면 미제출로 표시
    if (item.score === item.max_score) return 'high';
    if (item.score === item.mid_score) return 'mid';
    if (item.score === item.base_score) return 'low';
    return 'none';
  };

  const selectTier = async (item, tierKey) => {
    const score = scoreFor(item, tierKey);
    await teacherApi.saveGrade(token, enrollmentId, item.id, score);
    await load();
  };

  if (error) return <p style={{ color: 'var(--color-coral)', fontSize: 13 }}>{error}</p>;
  if (!items) return <p style={{ fontSize: 13, color: 'var(--color-text-body)' }}>불러오는 중...</p>;

  return (
    <div
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-navy)', margin: 0 }}>
          {studentName} 채점
        </p>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-teal)', margin: 0 }}>총점 {total}점</p>
      </div>

      {items.map((item) => {
        const current = tierOf(item);
        return (
          <div key={item.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 6px' }}>
              {item.title} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(최대 {item.max_score}점)</span>
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {TIERS.map((t) => {
                const active = current === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => selectTier(item, t.key)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      fontSize: 12,
                      borderRadius: 6,
                      border: `1.5px solid ${active ? 'var(--color-navy)' : 'var(--color-border)'}`,
                      background: active ? 'var(--color-navy)' : '#FFFFFF',
                      color: active ? 'var(--color-navy-text-on)' : 'var(--color-text)',
                    }}
                  >
                    {t.label}
                    {t.key !== 'none' && ` (${scoreFor(item, t.key)})`}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
