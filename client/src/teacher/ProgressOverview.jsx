// src/teacher/ProgressOverview.jsx
import { useState, useEffect, useRef } from 'react';
import { teacherApi } from './api';
import GradingPanel from './GradingPanel';
import OrdinanceAnswerView from './OrdinanceAnswerView';

export default function ProgressOverview({ token, projectId, projectCode }) {
  const isOrdinance = projectCode === 'ordinance';
  const [classes, setClasses] = useState([]);
  const [className, setClassName] = useState('');
  const [students, setStudents] = useState(null);
  const [loadedClassName, setLoadedClassName] = useState(''); // 지금 표에 보이는 명단의 반
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null); // { name, enrollment_id }
  const [responses, setResponses] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingAnswers, setDownloadingAnswers] = useState(false);

  useEffect(() => {
    teacherApi
      .getClasses(token)
      .then((data) => {
        setClasses(data);
        if (data.length > 0) setClassName(data[0].name);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  const classId = classes.find((c) => c.name === className)?.id;
  const latestClassRef = useRef(null); // 반을 빠르게 바꿀 때 늦게 도착한 이전 반 응답을 버리기 위함
  latestClassRef.current = classId;

  const load = async () => {
    setError('');
    if (!classId) return;
    try {
      const requested = classId;
      const requestedName = className;
      const data = await teacherApi.getProgress(token, projectId, requested);
      if (latestClassRef.current !== requested) return;
      setStudents(data);
      setLoadedClassName(requestedName);
    } catch (err) {
      setError(err.message);
    }
  };

  // 반을 고르면(처음 열 때 포함) 그 반 명단을 자동으로 불러온다. [조회]는 새로고침용
  useEffect(() => {
    if (classId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const download = async () => {
    if (!classId) return;
    setDownloading(true);
    try {
      const blob = await teacherApi.exportResults(token, projectId, classId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `결과_${className}.csv`;
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

  const downloadAnswers = async () => {
    if (!classId) return;
    setDownloadingAnswers(true);
    try {
      const blob = await teacherApi.exportAnswers(token, projectId, classId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `답안전체_${className}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingAnswers(false);
    }
  };

  const openResponses = async (student) => {
    setSelected(student);
    setResponses(null);
    if (!student.enrollment_id) return; // 아직 진행 안 한 학생
    const data = await teacherApi.getResponses(token, student.enrollment_id);
    setResponses(data);
  };

  // 제출 취소(다시 열어 주기): 답안·점수는 그대로, '제출 완료'만 지운다
  const unsubmit = async (student) => {
    const ok = window.confirm(
      `${student.student_no} ${student.name} 학생의 제출을 취소할까요?\n\n답안과 점수는 그대로 남고, 학생이 응시 시간에 다시 로그인하면 이어서 고친 뒤 다시 제출할 수 있어요.`
    );
    if (!ok) return;
    try {
      await teacherApi.unsubmit(token, student.enrollment_id);
      await load();
      if (selected?.student_id === student.student_id) setSelected({ ...selected, submitted_at: null });
    } catch (err) {
      setError(err.message);
    }
  };

  // 제출 처리(교사 마감): 저장된 답안을 그대로 제출 상태로 잠근다
  const forceSubmit = async (student) => {
    const ok = window.confirm(
      `${student.student_no} ${student.name} 학생을 제출 처리할까요?\n\n지금까지 저장된 답안이 그대로 제출 상태로 잠겨요(최소 글자 수는 따지지 않아요). 이후 반을 다시 열어도 이 학생은 고칠 수 없어요.\n잘못 눌렀으면 [제출 취소]로 되돌릴 수 있어요.`
    );
    if (!ok) return;
    try {
      const updated = await teacherApi.forceSubmit(token, student.enrollment_id);
      await load();
      if (selected?.student_id === student.student_id) {
        setSelected({ ...selected, submitted_at: updated.submitted_at, submitted_by_teacher: true });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // 명단 제외(전출 등) / 복구: 학번은 그대로, 이 수행평가 집계·CSV에서만 뺀다
  const toggleExclude = async (student) => {
    const next = !student.excluded;
    const ok = window.confirm(
      next
        ? `${student.student_no} ${student.name} 학생을 이 수행평가 명단에서 뺄까요?\n\n· 학번과 학생 정보는 그대로 남아요(다른 학생 번호도 그대로).\n· 제출 현황 인원, CSV, 주제 분포에서 빠지고, 이 수행평가에는 응시할 수 없어요.\n· 다른 수행평가 기록에는 영향이 없어요.\n· 잘못 눌렀으면 [명단 복구]로 되돌릴 수 있어요.`
        : `${student.student_no} ${student.name} 학생을 이 수행평가 명단에 다시 넣을까요?`
    );
    if (!ok) return;
    try {
      if (next) await teacherApi.excludeStudent(token, projectId, student.student_id);
      else await teacherApi.restoreStudent(token, projectId, student.student_id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  // 되돌리기 후: 목록(주제·진행 단계)과 답안을 새로 불러온다
  const refreshAfterRestore = async () => {
    if (!classId || !selected) return;
    const list = await teacherApi.getProgress(token, projectId, classId);
    setStudents(list);
    const fresh = list.find((s) => s.student_id === selected.student_id) || selected;
    setSelected(fresh);
    setResponses(await teacherApi.getResponses(token, fresh.enrollment_id));
  };

  return (
    <div style={{ padding: 20, maxWidth: 'var(--teacher-content-max, 720px)' }}>
      <h2 style={{ color: 'var(--color-navy)', fontSize: 19, fontWeight: 500, marginBottom: 16 }}>
        반별 진행 현황
      </h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: 'var(--color-text-body)' }}>반</label>
        <select
          value={className}
          onChange={(e) => {
            // 반을 바꾸면 이전 반의 표·답안을 지우고 새 반 명단을 바로 불러온다
            setClassName(e.target.value);
            setStudents(null);
            setSelected(null);
            setResponses(null);
          }}
          style={{ padding: 8, border: '1px solid var(--color-border)', borderRadius: 6 }}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.name}>
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
          🔄 새로고침
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
        <button
          onClick={downloadAnswers}
          disabled={downloadingAnswers}
          style={{
            background: '#FFFFFF',
            color: 'var(--color-navy)',
            border: '1.5px solid var(--color-navy)',
            borderRadius: 6,
            padding: '8px 14px',
            fontSize: 13,
          }}
        >
          {downloadingAnswers ? '다운로드 중...' : '답안 전체 내보내기(CSV)'}
        </button>
      </div>

      {error && <p style={{ color: 'var(--color-coral)', fontSize: 13 }}>{error}</p>}

      {students && (() => {
        const active = students.filter((s) => !s.excluded);
        const submitted = active.filter((s) => s.submitted_at).length;
        const excludedCount = students.length - active.length;
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 14,
              flexWrap: 'wrap',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 14, color: 'var(--color-navy)', fontWeight: 600 }}>{loadedClassName}</span>
            <span style={{ fontSize: 13, color: 'var(--color-text-body)' }}>
              제출 완료{' '}
              <b style={{ fontSize: 22, color: 'var(--color-teal)' }}>{submitted}</b>
              <span style={{ fontSize: 16, color: 'var(--color-navy)', fontWeight: 600 }}> / {active.length}</span>명
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
              미제출 {active.length - submitted}명{excludedCount > 0 && ` · 명단 제외 ${excludedCount}명`}
            </span>
          </div>
        );
      })()}

      {students && (
        <div style={{ overflowX: 'auto' }}>
        {/* 표 글자 크기는 제목 '반별 진행 현황'(19px)과 같게 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 19 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: 8, whiteSpace: 'nowrap' }}>학번</th>
              <th style={{ padding: 8, whiteSpace: 'nowrap' }}>이름</th>
              {isOrdinance && <th style={{ padding: 8, whiteSpace: 'nowrap' }}>주제</th>}
              <th style={{ padding: 8, whiteSpace: 'nowrap' }}>{isOrdinance ? '작성한 단계' : '진행 단계'}</th>
              <th style={{ padding: 8, whiteSpace: 'nowrap' }}>제출 여부</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {[...students.filter((s) => !s.excluded), ...students.filter((s) => s.excluded)].map((s) =>
              s.excluded ? (
                <tr key={s.student_id} style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'var(--color-bg)' }}>
                  <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{s.student_no}</td>
                  <td style={{ padding: 8, textDecoration: 'line-through', whiteSpace: 'nowrap' }}>{s.name}</td>
                  <td style={{ padding: 8, fontSize: 15 }} colSpan={isOrdinance ? 3 : 2}>
                    명단 제외 (전출 등) · 집계·CSV에 포함되지 않음
                  </td>
                  <td style={{ padding: 8 }}>
                    <button
                      onClick={() => toggleExclude(s)}
                      style={{ background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
                    >
                      명단 복구
                    </button>
                  </td>
                </tr>
              ) : (
              <tr key={s.student_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{s.student_no}</td>
                <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{s.name}</td>
                {isOrdinance && (
                  <td style={{ padding: 8, minWidth: 160 }}>
                    {s.track_title || '-'}
                    {s.track_title && !s.track_locked && <span style={{ color: 'var(--color-text-muted)' }}> (고정 전)</span>}
                  </td>
                )}
                <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{isOrdinance ? `${s.steps_done} / 6` : `${s.steps_done}개`}</td>
                <td style={{ padding: 8, whiteSpace: 'nowrap', color: s.submitted_at ? 'var(--color-teal)' : 'var(--color-text-muted)' }}>
                  {s.submitted_at ? '제출 완료' : '미제출'}
                  {s.submitted_at && s.submitted_by_teacher && (
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-muted)' }}>(교사 처리)</span>
                  )}
                  {isOrdinance && !s.submitted_at && s.enrollment_id && (
                    <button
                      onClick={() => forceSubmit(s)}
                      style={{
                        display: 'block',
                        marginTop: 4,
                        background: 'transparent',
                        border: '1px solid var(--color-navy)',
                        color: 'var(--color-navy)',
                        borderRadius: 6,
                        padding: '2px 8px',
                        fontSize: 11,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      제출 처리
                    </button>
                  )}
                  {isOrdinance && s.submitted_at && (
                    <button
                      onClick={() => unsubmit(s)}
                      style={{
                        display: 'block',
                        marginTop: 4,
                        background: 'transparent',
                        border: '1px solid var(--color-coral)',
                        color: 'var(--color-coral)',
                        borderRadius: 6,
                        padding: '2px 8px',
                        fontSize: 11,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      제출 취소
                    </button>
                  )}
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
                  {isOrdinance && (
                    <button
                      onClick={() => toggleExclude(s)}
                      style={{
                        display: 'block',
                        marginTop: 4,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        padding: '2px 0',
                        fontSize: 11,
                        textDecoration: 'underline',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      명단 제외
                    </button>
                  )}
                </td>
              </tr>
              )
            )}
          </tbody>
        </table>
        </div>
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
              {selected.name} 학생의 {isOrdinance ? '답안과 채점' : '답안'}
            </p>
            {!selected.enrollment_id && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>아직 시작하지 않았습니다.</p>
            )}
            {isOrdinance && selected.enrollment_id && (
              <OrdinanceAnswerView
                key={selected.enrollment_id}
                token={token}
                projectId={projectId}
                student={selected}
                responses={responses}
                onRestored={refreshAfterRestore}
              />
            )}
            {!isOrdinance &&
              responses &&
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

          {!isOrdinance && selected.enrollment_id && (
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
