// src/teacher/TeacherApp.jsx
import { useState } from 'react';
import TeacherLogin from './TeacherLogin';
import ScheduleControl from './ScheduleControl';
import LiveDistribution from './LiveDistribution';
import StudentUpload from './StudentUpload';
import ProgressOverview from './ProgressOverview';

const TABS = [
  { key: 'upload', label: '학생 명단 업로드' },
  { key: 'schedule', label: '응시 개폐 관리' },
  { key: 'progress', label: '진행 현황' },
  { key: 'distribution', label: '실시간 집계' },
];

export default function TeacherApp({ projectId = 1 }) {
  const [token, setToken] = useState(null);
  const [tab, setTab] = useState('upload');

  if (!token) return <TeacherLogin onLogin={setToken} />;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid var(--color-border)',
          padding: '0 20px',
          flexWrap: 'wrap',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '12px 16px',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--color-navy)' : '2px solid transparent',
              background: 'transparent',
              color: tab === t.key ? 'var(--color-navy)' : 'var(--color-text-muted)',
              fontWeight: tab === t.key ? 600 : 400,
              fontSize: 14,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'upload' && <StudentUpload token={token} />}
      {tab === 'schedule' && <ScheduleControl token={token} projectId={projectId} />}
      {tab === 'progress' && <ProgressOverview token={token} projectId={projectId} />}
      {tab === 'distribution' && <LiveDistribution token={token} projectId={projectId} />}
    </div>
  );
}
