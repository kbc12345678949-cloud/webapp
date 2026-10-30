// src/teacher/TeacherApp.jsx
import { useState, useEffect } from 'react';
import TeacherLogin from './TeacherLogin';
import ScheduleControl from './ScheduleControl';
import LiveDistribution from './LiveDistribution';
import TrackDistribution from './TrackDistribution';
import StudentUpload from './StudentUpload';
import ProgressOverview from './ProgressOverview';
import ReviewModeControl from './ReviewModeControl';
import { teacherApi } from './api';

const TABS = [
  { key: 'upload', label: '학생 명단 업로드' },
  { key: 'schedule', label: '응시 개폐 관리' },
  { key: 'progress', label: '진행 현황' },
  { key: 'distribution', label: '실시간 집계' },
  { key: 'review', label: '수행평가 종료·열람' },
];

const PROJECT_KEY = 'teacher:projectId';

// projectId를 직접 넘기면(테스트 등) 그 수행평가로 고정, 넘기지 않으면 화면 위에서 고를 수 있다.
export default function TeacherApp({ projectId: fixedProjectId }) {
  const [token, setToken] = useState(null);
  const [tab, setTab] = useState('upload');
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(fixedProjectId ?? null);

  useEffect(() => {
    if (!token || fixedProjectId) return;
    teacherApi
        .getProjects(token)
        .then((list) => {
          setProjects(list);
          let saved = null;
          try {
            saved = Number(localStorage.getItem(PROJECT_KEY));
          } catch {
            /* 무시 */
          }
          const pick =
            list.find((p) => p.id === saved) || list.find((p) => p.code === 'ordinance') || list[0];
          if (pick) setProjectId(pick.id);
        })
        .catch(() => setProjectId(1));
  }, [token, fixedProjectId]);

  if (!token) return <TeacherLogin onLogin={setToken} />;
  if (!projectId) return <p style={{ padding: 20 }}>불러오는 중...</p>;

  const project = projects.find((p) => p.id === projectId);
  const projectCode = project?.code || (fixedProjectId ? 'tourism' : undefined);
  const isOrdinance = projectCode === 'ordinance';

  const choose = (id) => {
    setProjectId(id);
    try {
      localStorage.setItem(PROJECT_KEY, String(id));
    } catch {
      /* 무시 */
    }
  };

  return (
    <div>
      {projects.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            padding: '12px 20px',
            background: 'var(--color-navy)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: 'var(--color-border)', fontSize: 12.5 }}>수행평가</span>
          {projects.map((p) => {
            const active = p.id === projectId;
            return (
              <button
                key={p.id}
                onClick={() => choose(p.id)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: active ? '#FFFFFF' : 'rgba(255,255,255,0.12)',
                  color: active ? 'var(--color-navy)' : '#FFFFFF',
                  fontWeight: active ? 600 : 400,
                  fontSize: 13,
                }}
              >
                {p.title}
              </button>
            );
          })}
        </div>
      )}
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
            {t.key === 'distribution' && isOrdinance ? '주제 선택 분포' : t.label}
          </button>
        ))}
      </div>

      {/* key로 수행평가가 바뀔 때마다 각 화면을 새로 그린다(이전 수행평가 자료가 남지 않도록) */}
      <div key={projectId}>
        {tab === 'upload' && <StudentUpload token={token} />}
        {tab === 'schedule' && <ScheduleControl token={token} projectId={projectId} projectCode={projectCode} />}
        {tab === 'progress' && <ProgressOverview token={token} projectId={projectId} projectCode={projectCode} />}
        {tab === 'distribution' &&
          (isOrdinance ? (
            <TrackDistribution token={token} projectId={projectId} />
          ) : (
            <LiveDistribution token={token} projectId={projectId} />
          ))}
        {tab === 'review' && <ReviewModeControl token={token} projectId={projectId} />}
      </div>
    </div>
  );
}
