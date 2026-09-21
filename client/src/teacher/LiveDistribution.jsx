// src/teacher/LiveDistribution.jsx
import { useState, useEffect } from 'react';
import { teacherApi } from './api';
import { policies } from '../data/policies';

const BAR_COLORS = { A: '#C1502E', B: '#2B6E68', C: '#1B2A41' };

function DistBar({ label, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
        <span style={{ color: 'var(--color-navy)', fontWeight: 500 }}>{label}</span>
        <span style={{ color: 'var(--color-text-muted)' }}>
          {count}명 ({pct}%)
        </span>
      </div>
      <div style={{ background: 'var(--color-bg)', borderRadius: 6, height: 14, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: BAR_COLORS[label] }} />
      </div>
    </div>
  );
}

export default function LiveDistribution({ token, projectId }) {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(''); // '' = 전체 반 합산
  const [step3Data, setStep3Data] = useState(null);
  const [step8Data, setStep8Data] = useState(null);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false); // 한 번이라도 "지금 분포 공개하기"를 눌렀는지

  useEffect(() => {
    teacherApi.getClasses(token).then(setClasses).catch(() => {});
  }, [token]);

  const fetchBoth = async () => {
    setLoading(true);
    const classId = selectedClassId || undefined;
    const [d3, d8] = await Promise.all([
      teacherApi.getDistribution(token, projectId, 'step3', classId),
      teacherApi.getDistribution(token, projectId, 'step8', classId).catch(() => null),
    ]);
    setStep3Data(d3);
    setStep8Data(d8);
    setLoading(false);
    setRevealed(true);
  };

  // 한 번 공개된 뒤에는, 반 선택을 바꾸면 자동으로 그 반 기준으로 다시 불러온다.
  useEffect(() => {
    if (revealed) fetchBoth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId]);

  const renderPanel = (title, data) => {
    if (!data) return null;
    const counts = { A: 0, B: 0, C: 0 };
    data.distribution.forEach((d) => {
      if (counts[d.choice] !== undefined) counts[d.choice] = Number(d.count);
    });
    return (
      <div
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: 16,
          flex: 1,
        }}
      >
        <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 12px' }}>
          {title} (전체 {data.total}명)
        </p>
        {policies.map((p) => (
          <DistBar key={p.id} label={p.id} count={counts[p.id]} total={data.total} />
        ))}
        <p style={{ fontSize: 10.5, color: 'var(--color-text-muted)', margin: '8px 0 0' }}>{data.note}</p>
      </div>
    );
  };

  return (
    <div style={{ padding: 20, maxWidth: 720 }}>
      <h2 style={{ color: 'var(--color-navy)', fontSize: 19, fontWeight: 500, marginBottom: 16 }}>
        실시간 집계 — 1차 판단 vs 최종 결정
      </h2>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            fontSize: 14,
            color: 'var(--color-text)',
          }}
        >
          <option value="">전체 반 합산</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <button
          onClick={fetchBoth}
          disabled={loading}
          style={{
            background: 'var(--color-navy)',
            color: 'var(--color-navy-text-on)',
            border: 'none',
            borderRadius: 8,
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {loading ? '불러오는 중...' : '지금 분포 공개하기'}
        </button>
      </div>

      {(step3Data || step8Data) && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {renderPanel('1차 판단 (STEP3)', step3Data)}
          {renderPanel('최종 결정 (STEP8)', step8Data)}
        </div>
      )}
    </div>
  );
}
