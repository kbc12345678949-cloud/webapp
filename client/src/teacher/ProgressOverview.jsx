// src/teacher/ProgressOverview.jsx
import { useState } from 'react';
import { teacherApi } from './api';
import GradingPanel from './GradingPanel';

export default function ProgressOverview({ token, projectId }) {
  const [classId, setClassId] = useState('1');
  const [students, setStudents] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null); // { name, enrollment_id }
  const [responses, setResponses] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    setError('');
    try {
      const data = await teacherApi.getProgress(token, projectId, classId);
      setStudents(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const blob = await teacherApi.exportResults(token, projectId, classId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `결과_${classId}반.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const openResponses = async (student) => {
    setSelected(student);
    setResponses(null);
    if (!student.enrollment_id) return; // 아직 진행 안 한 학생
    const data = await teacherApi.getResponses(token, student.enrollment_id);
    setResponses(data);
  };

  return (
    <div style={{ padding: 20, maxWidth: 720 }}>
      <h2 style={{ color: 'var(--color-navy)', fontSize: 19, fontWeight: 500, marginBottom: 16 }}>
        반별 진행 현황
      </h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <label style={{ fontSize: 13, color: 'var(--color-text-body)' }}>학급 ID</label>
        <input
          type="text"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          style={{ width: 60, padding: 8, border: '1px solid var(--color-border)', borderRadius: 6 }}
        />
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
          조회
        </button>
        <button
          onClick={download}
          disabled={downloading}
          style={{
            background: 'var(--color-teal)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 6,
            padding: '8px 14px',
            fontSize: 13,
          }}
        >
          {downloading ? '다운로드 중...' : '결과 다운로드(CSV)'}
        </button>
      </div>

      {error && <p style={{ color: 'var(--color-coral)', fontSize: 13 }}>{error}</p>}

      {students && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>학번</th>
              <th style={{ padding: 8 }}>이름</th>
              <th style={{ padding: 8 }}>진행 단계</th>
              <th style={{ padding: 8 }}>제출 여부</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.student_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 8 }}>{s.student_no}</td>
                <td style={{ padding: 8 }}>{s.name}</td>
                <td style={{ padding: 8 }}>{s.steps_done}개</td>
                <td style={{ padding: 8, color: s.submitted_at ? 'var(--color-teal)' : 'var(--color-text-muted)' }}>
                  {s.submitted_at ? '제출 완료' : '미제출'}
                </td>
                <td style={{ padding: 8 }}>
                  <button
                    onClick={() => openResponses(s)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--color-border)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 12,
                    }}
                  >
                    답안 보기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
          <div
            style={{
              flex: 1,
              minWidth: 280,
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              padding: 16,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 10px' }}>
              {selected.name} 학생의 답안
            </p>
            {!selected.enrollment_id && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>아직 시작하지 않았습니다.</p>
            )}
            {responses &&
              responses.map((r) => (
                <div key={r.step_key} style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-teal)', margin: 0 }}>{r.title}</p>
                  <pre
                    style={{
                      fontSize: 12,
                      background: 'var(--color-bg)',
                      padding: 8,
                      borderRadius: 6,
                      whiteSpace: 'pre-wrap',
                      margin: '4px 0 0',
                    }}
                  >
                    {JSON.stringify(r.answer, null, 2)}
                  </pre>
                </div>
              ))}
          </div>

          {selected.enrollment_id && (
            <div style={{ flex: 1, minWidth: 280 }}>
              <GradingPanel
                token={token}
                projectId={projectId}
                enrollmentId={selected.enrollment_id}
                studentName={selected.name}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
