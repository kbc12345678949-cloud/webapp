// src/components/TourismNav.jsx
// 관광정책 화면 헤더 아래에 붙는 막대들:
// - 단계 이동 막대: 한 번 가 본 단계는 번호를 눌러 언제든 오갈 수 있다(아직 안 가 본 단계는 잠김)
// - 도구 막대: 전체 질문 보기 + 자동 저장 상태
// - 보기 전용 안내
import { useState } from 'react';
import { NAV_STEPS, TOURISM_QUESTIONS } from '../data/tourismFlow';

export function StageNav({ current, furthest, doneSteps, onGo }) {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '10px 12px 4px', overflowX: 'auto', background: 'var(--color-bg)' }}>
      {NAV_STEPS.map((it) => {
        const active = it.no === current;
        const locked = it.no > furthest;
        const done = doneSteps.has(it.no);
        return (
          <button
            key={it.no}
            onClick={() => !locked && onGo(it.no)}
            disabled={locked}
            aria-label={it.no === 10 ? '내 답안 전체 확인' : `STEP${it.no} ${it.title}${locked ? ' (아직 열리지 않음)' : ''}`}
            title={it.title}
            style={{
              flex: it.no === 10 ? '1.4 0 44px' : '1 0 30px',
              maxWidth: it.no === 10 ? 60 : 44,
              height: 34,
              padding: 0,
              borderRadius: 999,
              border: `1.5px solid ${active ? 'var(--color-navy)' : 'var(--color-border)'}`,
              background: active ? 'var(--color-navy)' : locked ? 'var(--color-bg)' : '#FFFFFF',
              color: active ? 'var(--color-navy-text-on)' : locked ? 'var(--color-text-muted)' : 'var(--color-navy)',
              fontSize: 13,
              fontWeight: 600,
              position: 'relative',
              cursor: locked ? 'default' : 'pointer',
              opacity: locked ? 0.55 : 1,
            }}
          >
            {it.label}
            {done && !active && (
              <span
                style={{
                  position: 'absolute',
                  top: -5,
                  right: -3,
                  fontSize: 10,
                  background: 'var(--color-teal)',
                  color: '#FFFFFF',
                  borderRadius: 999,
                  width: 15,
                  height: 15,
                  lineHeight: '15px',
                }}
              >
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function QuestionList() {
  return (
    <div>
      {TOURISM_QUESTIONS.map((s) => (
        <div key={s.step} style={{ marginBottom: 14 }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--color-navy)' }}>
            {s.step} · {s.title}
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {s.items.map((q, i) => (
              <li key={i} style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--color-text-body)' }}>
                {q}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function Sheet({ title, onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(27,42,65,0.55)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px 16px 0 0',
          width: '100%',
          maxWidth: 720,
          margin: '0 auto',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '16px 18px 28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ flex: 1, margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-navy)' }}>{title}</p>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 14, color: 'var(--color-text-muted)', padding: 6 }}
          >
            닫기 ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toolbar({ saveState, saveError, readOnly }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div style={{ display: 'flex', gap: 6, padding: '6px 14px 6px', alignItems: 'center', background: 'var(--color-bg)' }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '6px 9px',
            fontSize: 12,
            color: 'var(--color-navy)',
          }}
        >
          📋 전체 질문
        </button>
        {!readOnly && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              color: saveState === 'error' ? 'var(--color-coral)' : 'var(--color-text-muted)',
            }}
          >
            {saveState === 'saving' && '저장 중...'}
            {saveState === 'saved' && '✓ 자동 저장됨'}
            {saveState === 'error' && `저장 실패: ${saveError}`}
          </span>
        )}
      </div>
      {open && (
        <Sheet title="전체 질문 보기" onClose={() => setOpen(false)}>
          <QuestionList />
        </Sheet>
      )}
    </>
  );
}

export function ReadOnlyBanner({ submittedAt }) {
  const when = submittedAt
    ? new Date(submittedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;
  return (
    <div
      style={{
        background: '#F4F5F7',
        borderBottom: '1px solid var(--color-border)',
        padding: '9px 14px',
        fontSize: 12.5,
        color: 'var(--color-navy)',
        lineHeight: 1.5,
      }}
    >
      🔒 {when ? `${when}에 제출한 답안` : '내 기록'}을 보는 중이에요.
      <br />
      <span style={{ color: 'var(--color-text-muted)' }}>단계는 자유롭게 오갈 수 있지만, 답안은 고칠 수 없어요.</span>
    </div>
  );
}
