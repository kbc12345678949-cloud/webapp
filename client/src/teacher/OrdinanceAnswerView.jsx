// src/teacher/OrdinanceAnswerView.jsx
// 교사용: 조례 수행평가 학생 답안 보기 + 주제 변경 전 기록(보관본) 열람·되돌리기
import { useState, useEffect, useCallback } from 'react';
import { teacherApi } from './api';
import { findTrack, STAGE_KEYS } from '../ordinance/content';
import { AnswerSummary } from '../ordinance/ui';

const REASON_LABEL = {
  track_change: '학생이 주제를 바꾸기 전 기록',
  before_restore: '되돌리기 직전의 기록',
};

function fmt(d) {
  return d ? new Date(d).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '';
}

function toAnswers(responses) {
  const a = Object.fromEntries(STAGE_KEYS.map((k) => [k, {}]));
  (responses || []).forEach((r) => {
    a[r.step_key] = r.answer || {};
  });
  return a;
}

export default function OrdinanceAnswerView({ token, student, responses, onRestored }) {
  const [archives, setArchives] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const loadArchives = useCallback(async () => {
    if (!student.enrollment_id) return;
    try {
      setArchives(await teacherApi.getArchives(token, student.enrollment_id));
    } catch (err) {
      setMsg(err.message);
    }
  }, [token, student.enrollment_id]);

  useEffect(() => {
    loadArchives();
  }, [loadArchives]);

  const track = findTrack(student.track_code);

  const restore = async (a) => {
    const ok = window.confirm(
      `${student.name} 학생의 답안을 이 기록(${a.track_title || '주제 없음'}, ${fmt(a.archived_at)})으로 되돌릴까요?\n지금 답안은 지워지지 않고 '되돌리기 직전의 기록'으로 보관됩니다.`
    );
    if (!ok) return;
    setBusy(true);
    setMsg('');
    try {
      await teacherApi.restoreArchive(token, a.id);
      setMsg('되돌렸습니다. 목록을 다시 불러옵니다.');
      await loadArchives();
      onRestored?.();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--color-text-body)', margin: '0 0 10px' }}>
        주제: <b>{student.track_title || '아직 고르지 않음'}</b>
        {student.track_title && !student.track_locked && ' (아직 고정 전)'}
      </p>
      {responses && responses.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>아직 작성한 답안이 없습니다.</p>
      )}
      {responses && responses.length > 0 && <AnswerSummary track={track} answers={toAnswers(responses)} />}

      {msg && <p style={{ fontSize: 12.5, color: 'var(--color-teal)' }}>{msg}</p>}

      {archives && archives.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '2px dashed var(--color-border)' }}>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-navy)', margin: '0 0 4px' }}>
            🗂 변경 전 기록 ({archives.length}개)
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 10px' }}>
            교사만 볼 수 있어요. 채점·CSV에는 들어가지 않습니다.
          </p>
          {archives.map((a) => (
            <div
              key={a.id}
              style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 10, marginBottom: 8, background: 'var(--color-bg)' }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--color-navy)' }}>
                  <b>{a.track_title || '주제 없음'}</b> · {fmt(a.archived_at)}
                  <br />
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {REASON_LABEL[a.reason] || a.reason}
                    {a.restored_at && ` · ${fmt(a.restored_at)}에 되돌림`}
                  </span>
                </span>
                <button
                  onClick={() => setOpenId(openId === a.id ? null : a.id)}
                  style={{ background: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 10px', fontSize: 12 }}
                >
                  {openId === a.id ? '접기' : '내용 보기'}
                </button>
                <button
                  disabled={busy}
                  onClick={() => restore(a)}
                  style={{ background: 'var(--color-navy)', color: '#FFFFFF', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12 }}
                >
                  이 기록으로 되돌리기
                </button>
              </div>
              {openId === a.id && (
                <div style={{ marginTop: 10 }}>
                  <AnswerSummary
                    track={findTrack(a.track_code)}
                    answers={{ ...Object.fromEntries(STAGE_KEYS.map((k) => [k, {}])), ...(a.answers || {}) }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
