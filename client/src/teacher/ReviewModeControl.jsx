// src/teacher/ReviewModeControl.jsx
// "수행평가 종료 · 열람 모드" 스위치.
// 켜면: 학생은 응시 시간과 상관없이 로그인해 "나의 수행평가 기록"을 보기만 할 수 있고,
//       답안 저장·제출은 서버에서 모두 거절된다(화면을 우회해도 수정 불가).
// 끄면: 원래대로 반별 응시 시간 규칙이 적용된다(결석생 추가 응시 등이 필요할 때 다시 끌 수 있음).
import { useState, useEffect, useCallback } from 'react';
import { teacherApi } from './api';

export default function ReviewModeControl({ token, projectId }) {
  const [reviewOnly, setReviewOnly] = useState(null);
  const [unsubmitted, setUnsubmitted] = useState(null); // [{ className, students: [{student_no, name}] }]
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [mode, classes] = await Promise.all([
        teacherApi.getReviewMode(token, projectId),
        teacherApi.getClasses(token),
      ]);
      setReviewOnly(mode.reviewOnly);
      const realClasses = classes.filter((c) => c.name !== '테스트반');
      const lists = await Promise.all(
        realClasses.map(async (c) => {
          const rows = await teacherApi.getProgress(token, projectId, c.id);
          return { className: c.name, students: rows.filter((r) => !r.submitted_at) };
        })
      );
      setUnsubmitted(lists);
    } catch (err) {
      setError(err.message);
    }
  }, [token, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const totalUnsubmitted = unsubmitted ? unsubmitted.reduce((n, c) => n + c.students.length, 0) : 0;

  const change = async (next) => {
    const message = next
      ? `열람 모드를 켤까요?\n\n· 학생은 기록을 보기만 할 수 있고, 답안 저장·제출이 모두 막힙니다.` +
        (totalUnsubmitted > 0 ? `\n· 아직 미제출 학생이 ${totalUnsubmitted}명 있습니다.` : '')
      : '열람 모드를 끌까요?\n\n· 다시 반별 응시 시간 규칙이 적용되고, 응시 시간 안에서는 답안을 수정할 수 있게 됩니다.';
    if (!window.confirm(message)) return;
    setBusy(true);
    setError('');
    try {
      const res = await teacherApi.setReviewMode(token, projectId, next);
      setReviewOnly(res.reviewOnly);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (reviewOnly === null && !error) return <p style={{ padding: 20 }}>불러오는 중...</p>;

  return (
    <div style={{ padding: 20, maxWidth: 640 }}>
      <h2 style={{ color: 'var(--color-navy)', fontSize: 19, fontWeight: 500, marginBottom: 6 }}>
        수행평가 종료 · 열람 모드
      </h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-body)', lineHeight: 1.6, margin: '0 0 16px' }}>
        모든 학생이 수행평가를 마친 뒤 켜세요. 켜면 학생이 로그인했을 때 &quot;나의 수행평가 기록&quot; 화면(자료와
        내 답을 순서대로 보기만 하는 화면)이 나오고, 답안은 서버에서 수정·제출이 완전히 막힙니다.
      </p>

      {error && <p style={{ color: 'var(--color-coral)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <div
        style={{
          background: reviewOnly ? 'rgba(43,110,104,0.08)' : 'var(--color-card)',
          border: `1.5px solid ${reviewOnly ? 'var(--color-teal)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-card)',
          padding: 16,
          marginBottom: 20,
        }}
      >
        <p style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: 'var(--color-navy)' }}>
          현재 상태: {reviewOnly ? '🔒 열람 모드 (수정 불가)' : '응시 모드 (반별 응시 시간에 수정 가능)'}
        </p>
        <button
          disabled={busy}
          onClick={() => change(!reviewOnly)}
          style={{
            background: reviewOnly ? 'var(--color-card)' : 'var(--color-navy)',
            color: reviewOnly ? 'var(--color-navy)' : 'var(--color-navy-text-on)',
            border: reviewOnly ? '1px solid var(--color-navy)' : 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {busy ? '변경 중...' : reviewOnly ? '열람 모드 끄기' : '열람 모드 켜기 (수행평가 종료)'}
        </button>
      </div>

      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 8px' }}>
        미제출 학생 {unsubmitted ? `(${totalUnsubmitted}명)` : ''}
      </p>
      {!unsubmitted && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>확인 중...</p>}
      {unsubmitted && totalUnsubmitted === 0 && (
        <p style={{ fontSize: 13, color: 'var(--color-teal)' }}>모든 학생이 제출했습니다.</p>
      )}
      {unsubmitted &&
        unsubmitted
          .filter((c) => c.students.length > 0)
          .map((c) => (
            <p key={c.className} style={{ fontSize: 13, color: 'var(--color-text-body)', margin: '0 0 4px' }}>
              {c.className}: {c.students.map((s) => `${s.student_no} ${s.name}`).join(', ')}
            </p>
          ))}
    </div>
  );
}
