// src/teacher/TrackDistribution.jsx
// 조례 수행평가: 학생들이 6개 주제 중 무엇을 골랐는지(반별/전체) 보여준다.
import { useState, useEffect, useCallback } from 'react';
import { teacherApi } from './api';

export default function TrackDistribution({ token, projectId }) {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    teacherApi.getClasses(token).then(setClasses).catch(() => {});
  }, [token]);

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await teacherApi.getTrackDistribution(token, projectId, classId || undefined));
    } catch (err) {
      setError(err.message);
    }
  }, [token, projectId, classId]);

  useEffect(() => {
    load();
  }, [load]);

  const max = data ? Math.max(1, ...data.distribution.map((d) => d.count)) : 1;

  return (
    <div style={{ padding: 20, maxWidth: 640 }}>
      <h2 style={{ color: 'var(--color-navy)', fontSize: 19, fontWeight: 500, marginBottom: 6 }}>주제 선택 분포</h2>
      <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
        주제를 고른 학생 수(고정 전 포함). 막대 옆 괄호는 주제를 고정한 학생 / 최종 제출한 학생 수입니다.
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          style={{ padding: 8, border: '1px solid var(--color-border)', borderRadius: 6 }}
        >
          <option value="">전체 반</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          style={{
            background: 'var(--color-navy)',
            color: 'var(--color-navy-text-on)',
            border: 'none',
            borderRadius: 6,
            padding: '8px 14px',
            fontSize: 13,
          }}
        >
          새로고침
        </button>
      </div>
      {error && <p style={{ color: 'var(--color-coral)', fontSize: 13 }}>{error}</p>}
      {data && (
        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: 16,
          }}
        >
          {data.distribution.map((d) => (
            <div key={d.trackId} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: 'var(--color-navy)', fontWeight: 500 }}>{d.title}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {d.count}명 (고정 {d.locked} / 제출 {d.submitted})
                </span>
              </div>
              <div style={{ background: 'var(--color-bg)', borderRadius: 6, height: 14, overflow: 'hidden' }}>
                <div style={{ width: `${(d.count / max) * 100}%`, height: '100%', background: 'var(--color-teal)' }} />
              </div>
            </div>
          ))}
          <p style={{ fontSize: 12.5, color: 'var(--color-text-body)', margin: '10px 0 0' }}>
            접속했지만 아직 주제를 고르지 않은 학생: {data.undecided}명 · 합계 {data.total}명
          </p>
        </div>
      )}
    </div>
  );
}
