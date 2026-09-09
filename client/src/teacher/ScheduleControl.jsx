// src/teacher/ScheduleControl.jsx
import { useState, useEffect, useCallback } from 'react';
import { teacherApi } from './api';

function isCurrentlyOpen(schedule) {
  if (schedule.manually_opened) return true;
  const now = new Date();
  return now >= new Date(schedule.starts_at) && now <= new Date(schedule.ends_at);
}

// datetime-local 입력값(시간대 정보 없음)에 한국 시간(+09:00)을 명시해 서버로 보낸다.
function toKST(localDateTimeStr) {
  return `${localDateTimeStr}:00+09:00`;
}

// 실제 운영 시간표 (종 치는 시각 + 앞뒤 5분 버퍼 적용)
// 1교시 08:50~09:40 / 2교시 09:50~10:40 / 4교시 11:50~12:40 / 6교시 14:50~15:40
// classId는 여기 적지 않고, 실행 시점에 반 이름으로 실제 ID를 찾아 채운다 (업로드 순서와 무관하게 안전)
const REAL_SCHEDULE = [
  { className: '2학년 1반', sessionNo: 1, startsAt: toKST('2026-09-22T11:45'), endsAt: toKST('2026-09-22T12:45') },
  { className: '2학년 1반', sessionNo: 2, startsAt: toKST('2026-09-23T09:45'), endsAt: toKST('2026-09-23T10:45') },
  { className: '2학년 2반', sessionNo: 1, startsAt: toKST('2026-09-21T09:45'), endsAt: toKST('2026-09-21T10:45') },
  { className: '2학년 2반', sessionNo: 2, startsAt: toKST('2026-09-23T08:45'), endsAt: toKST('2026-09-23T09:45') },
  { className: '2학년 3반', sessionNo: 1, startsAt: toKST('2026-09-21T11:45'), endsAt: toKST('2026-09-21T12:45') },
  { className: '2학년 3반', sessionNo: 2, startsAt: toKST('2026-09-23T14:45'), endsAt: toKST('2026-09-23T15:45') },
];

export default function ScheduleControl({ token, projectId }) {
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [form, setForm] = useState({ className: '', sessionNo: '1', startsAt: '', endsAt: '' });

  const load = useCallback(async () => {
    try {
      const [scheduleData, classData] = await Promise.all([
        teacherApi.getSchedules(token, projectId),
        teacherApi.getClasses(token),
      ]);
      setSchedules(scheduleData);
      setClasses(classData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (schedule) => {
    const nextState = !schedule.manually_opened;
    await teacherApi.toggleSchedule(token, schedule.id, nextState);
    await load();
  };

  const findClassId = (className) => classes.find((c) => c.name === className)?.id;

  const submitForm = async (e) => {
    e.preventDefault();
    const classId = findClassId(form.className);
    if (!classId) {
      setError(`"${form.className}" 반을 찾을 수 없습니다. 먼저 학생 명단을 업로드해주세요.`);
      return;
    }
    await teacherApi.putSchedule(token, projectId, {
      classId,
      sessionNo: Number(form.sessionNo),
      startsAt: toKST(form.startsAt),
      endsAt: toKST(form.endsAt),
    });
    setForm({ className: '', sessionNo: '1', startsAt: '', endsAt: '' });
    await load();
  };

  const bulkFill = async () => {
    const missing = REAL_SCHEDULE.filter((s) => !findClassId(s.className));
    if (missing.length > 0) {
      setError(
        `다음 반을 찾을 수 없습니다: ${[...new Set(missing.map((m) => m.className))].join(', ')}. 먼저 학생 명단을 업로드해주세요.`
      );
      return;
    }
    setError('');
    setBulkStatus('등록 중...');
    for (const s of REAL_SCHEDULE) {
      await teacherApi.putSchedule(token, projectId, {
        classId: findClassId(s.className),
        sessionNo: s.sessionNo,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
      });
    }
    await load(); // 화면 목록이 실제로 갱신된 뒤에 완료 메시지를 띄운다 (그 반대 순서면 "완료"가 먼저 뜨고 목록이 잠깐 안 맞는 순간이 생김)
    setBulkStatus('실제 운영 시간표 6건 등록 완료');
  };

  if (loading) return <p style={{ padding: 20 }}>불러오는 중...</p>;

  return (
    <div style={{ padding: 20, maxWidth: 640 }}>
      <h2 style={{ color: 'var(--color-navy)', fontSize: 19, fontWeight: 500, marginBottom: 16 }}>
        응시 개폐 관리
      </h2>

      {error && <p style={{ color: 'var(--color-coral)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      {/* 실제 운영 시간표 일괄 등록 */}
      <div
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: 16,
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 8px' }}>
          9월 21~23일 실제 운영 시간표 (종 치는 시각 ±5분 버퍼 적용)
        </p>
        <p style={{ fontSize: 11.5, color: 'var(--color-text-muted)', margin: '0 0 10px' }}>
          ※ 반 이름으로 실제 ID를 그때그때 찾으므로, 학생 명단 업로드 순서와 무관하게 안전합니다.
        </p>
        <button
          onClick={bulkFill}
          style={{
            background: 'var(--color-teal)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 13.5,
            fontWeight: 500,
          }}
        >
          실제 시간표 6건 한 번에 등록
        </button>
        {bulkStatus && (
          <p style={{ fontSize: 12, color: 'var(--color-teal)', marginTop: 8 }}>{bulkStatus}</p>
        )}
      </div>

      {schedules.map((s) => {
        const open = isCurrentlyOpen(s);
        return (
          <div
            key={s.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              padding: '16px 18px',
              marginBottom: 12,
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--color-navy)' }}>
                {s.class_name} · {s.session_no}교시
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                예약: {new Date(s.starts_at).toLocaleString('ko-KR')} ~{' '}
                {new Date(s.ends_at).toLocaleString('ko-KR')}
              </p>
              {s.manually_opened && (
                <span style={{ fontSize: 11.5, color: 'var(--color-coral)', fontWeight: 500 }}>
                  수동으로 열려있음
                </span>
              )}
            </div>

            {/* 현장에서 쓰기 좋게 큼직한 토글 버튼 */}
            <button
              onClick={() => toggle(s)}
              style={{
                minWidth: 96,
                minHeight: 52,
                borderRadius: 12,
                border: 'none',
                fontSize: 15,
                fontWeight: 600,
                background: open ? 'var(--color-teal)' : 'var(--color-border)',
                color: open ? '#FFFFFF' : 'var(--color-text)',
              }}
            >
              {open ? '응시 가능' : '응시 마감'}
            </button>
          </div>
        );
      })}

      {/* 수동 예약 입력/수정 폼 */}
      <form
        onSubmit={submitForm}
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: 16,
          marginTop: 20,
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 10px' }}>
          예약 직접 입력/수정
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <select
            value={form.className}
            onChange={(e) => setForm({ ...form, className: e.target.value })}
            style={{ padding: 8, border: '1px solid var(--color-border)', borderRadius: 6 }}
            required
          >
            <option value="">반 선택</option>
            {classes.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={form.sessionNo}
            onChange={(e) => setForm({ ...form, sessionNo: e.target.value })}
            style={{ padding: 8, border: '1px solid var(--color-border)', borderRadius: 6 }}
          >
            <option value="1">1교시(STEP0~6)</option>
            <option value="2">2교시(STEP7~9)</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-body)' }}>
            시작
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              style={{ display: 'block', padding: 8, border: '1px solid var(--color-border)', borderRadius: 6 }}
              required
            />
          </label>
          <label style={{ fontSize: 12, color: 'var(--color-text-body)' }}>
            종료
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              style={{ display: 'block', padding: 8, border: '1px solid var(--color-border)', borderRadius: 6 }}
              required
            />
          </label>
        </div>
        <button
          type="submit"
          style={{
            background: 'var(--color-navy)',
            color: 'var(--color-navy-text-on)',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 13.5,
            fontWeight: 500,
          }}
        >
          저장
        </button>
      </form>
    </div>
  );
}
