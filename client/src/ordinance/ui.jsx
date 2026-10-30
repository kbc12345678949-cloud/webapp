// src/ordinance/ui.jsx
// 조례 수행평가 화면에서 여러 번 쓰이는 작은 조각들(자료 카드, 질문 목록, 답안 모아 보기, 팝업 등)
import { useState } from 'react';
import {
  TRACKS,
  MATERIAL_KEYS,
  MATERIAL_KIND,
  STAGES,
  INTRO_STAGES,
  CITY_NOTICE,
  materialTitle,
  hintsFor,
} from './content';

export const cardStyle = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card)',
  padding: 16,
};

export function primaryButton(enabled = true) {
  return {
    width: '100%',
    background: enabled ? 'var(--color-navy)' : 'var(--color-border)',
    color: enabled ? 'var(--color-navy-text-on)' : 'var(--color-text-muted)',
    border: 'none',
    borderRadius: 'var(--radius-button)',
    padding: 14,
    fontSize: 15.5,
    fontWeight: 500,
  };
}

export const secondaryButton = {
  width: '100%',
  background: '#FFFFFF',
  color: 'var(--color-navy)',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-button)',
  padding: 13,
  fontSize: 14.5,
};

export const linkButton = {
  background: 'none',
  border: 'none',
  color: 'var(--color-teal)',
  fontSize: 13,
  padding: 0,
  cursor: 'pointer',
};

export function CityNotice() {
  return (
    <div
      style={{
        background: '#FFF8EC',
        border: '1px solid #E8D3A8',
        borderRadius: 10,
        padding: '10px 12px',
        fontSize: 12.5,
        color: '#7A5A1E',
        lineHeight: 1.5,
        marginBottom: 14,
      }}
    >
      ℹ️ {CITY_NOTICE}
    </div>
  );
}

// ---------- 주제 카드 6개 ----------
export function TrackCards({ selectedCode, onSelect, busy }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {TRACKS.map((t) => {
        const sel = selectedCode === t.code;
        return (
          <button
            key={t.code}
            disabled={busy}
            onClick={() => onSelect(t)}
            style={{
              textAlign: 'left',
              background: sel ? 'var(--color-navy)' : 'var(--color-card)',
              color: sel ? 'var(--color-navy-text-on)' : 'var(--color-navy)',
              border: `1.5px solid ${sel ? 'var(--color-navy)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-card)',
              padding: '12px 12px 14px',
              minHeight: 108,
            }}
          >
            <div style={{ fontSize: 26, marginBottom: 4 }}>{t.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>{t.short}</div>
            <div style={{ fontSize: 11.5, marginTop: 4, color: sel ? 'var(--color-border)' : 'var(--color-text-muted)' }}>
              {t.field}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---------- 자료 하나의 본문 ----------
export function MaterialBody({ track, mkey }) {
  const m = track.materials[mkey];
  if (mkey === 'm1') {
    return (
      <div>
        <ul style={{ margin: '0 0 10px', paddingLeft: 18 }}>
          {m.points.map((p, i) => (
            <li key={i} style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-text)', marginBottom: 2 }}>
              {p}
            </li>
          ))}
        </ul>
        <div
          style={{
            background: 'var(--color-bg)',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 12.5,
            lineHeight: 1.65,
            color: 'var(--color-text-body)',
          }}
        >
          <b style={{ color: 'var(--color-teal)', fontWeight: 600 }}>숫자 읽는 법 </b>
          {m.explain}
        </div>
      </div>
    );
  }
  if (mkey === 'm2' || mkey === 'm3') {
    const pro = mkey === 'm2';
    return (
      <div
        style={{
          borderLeft: `3px solid ${pro ? 'var(--color-teal)' : 'var(--color-coral)'}`,
          paddingLeft: 12,
        }}
      >
        <p style={{ margin: '0 0 6px', fontSize: 12.5, fontWeight: 600, color: pro ? 'var(--color-teal)' : 'var(--color-coral)' }}>
          {MATERIAL_KIND[mkey].icon} {m.speaker}
        </p>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: 'var(--color-text)' }}>"{m.quote}"</p>
      </div>
    );
  }
  return <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: 'var(--color-text)' }}>{m.text}</p>;
}

export function MaterialCard({ track, mkey, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ ...cardStyle, padding: 0, marginBottom: 10, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          padding: '13px 14px',
        }}
      >
        <span style={{ fontSize: 18 }}>{MATERIAL_KIND[mkey].icon}</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--color-navy)' }}>{materialTitle(track, mkey)}</span>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{open ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          <MaterialBody track={track} mkey={mkey} />
        </div>
      )}
    </div>
  );
}

// 자료 5종 아코디언. opened: 이미 펼쳐 본 자료 목록(부드러운 안내용)
export function MaterialsAccordion({ track, opened, onOpen }) {
  return (
    <div>
      {MATERIAL_KEYS.map((k) => {
        const isOpen = opened.includes(k);
        return (
          <div key={k} style={{ ...cardStyle, padding: 0, marginBottom: 10, overflow: 'hidden' }}>
            <button
              onClick={() => onOpen(k)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                padding: '14px',
              }}
            >
              <span style={{ fontSize: 20 }}>{MATERIAL_KIND[k].icon}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--color-navy)' }}>
                {materialTitle(track, k)}
              </span>
              <span style={{ fontSize: 11.5, color: isOpen ? 'var(--color-teal)' : 'var(--color-coral)' }}>
                {isOpen ? '읽음' : '읽기 ▼'}
              </span>
            </button>
            {isOpen && (
              <div style={{ padding: '0 14px 14px' }}>
                <MaterialBody track={track} mkey={k} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- 질문 목록 (읽기 전용) ----------
export function QuestionList({ track }) {
  return (
    <div>
      {INTRO_STAGES.map((s) => (
        <div key={s.no} style={{ marginBottom: 14 }}>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--color-navy)' }}>
            {s.no}단계 · {s.title}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-body)', lineHeight: 1.6 }}>{s.desc}</p>
        </div>
      ))}
      {STAGES.map((stage) => (
        <div key={stage.no} style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: 'var(--color-navy)' }}>
            {stage.no}단계 · {stage.title}
          </p>
          {stage.questions.map((q) => (
            <div key={q.id} style={{ ...cardStyle, padding: '10px 12px', marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-text)' }}>
                <b>{q.id}.</b> {q.label && <b style={{ color: 'var(--color-teal)' }}>[{q.label}] </b>}
                {q.prompt}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                {q.type === 'evidence' ? `자료 1개 이상 체크 + 체크한 자료마다 ${q.min}자 이상` : `${q.min}자 이상`}
                {q.unscored && ' · 점수에 들어가지 않는 문항'}
                {q.showLaw && track && ` · 이 주제의 관련 상위법: ${track.lawName}`}
              </p>
              <ul style={{ margin: '6px 0 0', paddingLeft: 16 }}>
                {hintsFor(q, track).map((h, i) => (
                  <li key={i} style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--color-text-body)' }}>
                    💡 {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------- 내 답안 모아 보기 ----------
// issuesByQuestion: { '3-1': ['글자 수가 부족해요 ...'] } (없으면 배지를 표시하지 않음)
export function AnswerSummary({ track, answers, issuesByQuestion, onEdit }) {
  const showBadges = !!issuesByQuestion;
  return (
    <div>
      {STAGES.map((stage) => {
        const a = answers?.[stage.stepKey] || {};
        return (
          <div key={stage.no} style={{ marginBottom: 18 }}>
            <p style={{ margin: '0 0 8px', fontSize: 14.5, fontWeight: 600, color: 'var(--color-navy)' }}>
              {stage.no}단계 · {stage.title}
            </p>
            {stage.questions.map((q) => {
              const problems = issuesByQuestion?.[q.id] || [];
              const ok = problems.length === 0;
              return (
                <div
                  key={q.id}
                  style={{
                    ...cardStyle,
                    padding: '12px 14px',
                    marginBottom: 8,
                    borderColor: showBadges && !ok ? 'var(--color-coral)' : 'var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <p style={{ flex: 1, margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--color-text-body)' }}>
                      <b>{q.id}.</b> {q.label && <b style={{ color: 'var(--color-teal)' }}>[{q.label}] </b>}
                      {q.prompt}
                    </p>
                    {showBadges && (
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 999,
                          background: ok ? '#E3F2EE' : '#FBE7E1',
                          color: ok ? 'var(--color-teal)' : 'var(--color-coral)',
                        }}
                      >
                        {ok ? '완료' : '부족'}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {q.type === 'evidence' ? (
                      <EvidenceAnswer track={track} answer={a} />
                    ) : (
                      <AnswerText text={a[q.field]} />
                    )}
                  </div>
                  {showBadges && !ok && (
                    <ul style={{ margin: '8px 0 0', paddingLeft: 16 }}>
                      {problems.map((p, i) => (
                        <li key={i} style={{ fontSize: 12, color: 'var(--color-coral)' }}>
                          {p}
                        </li>
                      ))}
                    </ul>
                  )}
                  {onEdit && (
                    <button onClick={() => onEdit(stage.no, q.id)} style={{ ...linkButton, marginTop: 8, fontSize: 12.5 }}>
                      ✏️ 수정하기
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function AnswerText({ text }) {
  const t = String(text || '').trim();
  if (!t) return <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>(아직 쓰지 않았어요)</p>;
  return <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>{t}</p>;
}

function EvidenceAnswer({ track, answer }) {
  const checked = MATERIAL_KEYS.filter((k) => (answer?.checked || []).includes(k));
  if (checked.length === 0) {
    return <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>(체크한 자료가 없어요)</p>;
  }
  return (
    <div>
      {checked.map((k) => (
        <div key={k} style={{ marginBottom: 8 }}>
          <p style={{ margin: '0 0 2px', fontSize: 12.5, fontWeight: 600, color: 'var(--color-teal)' }}>
            ☑ {track ? materialTitle(track, k) : MATERIAL_KIND[k].no}
          </p>
          <AnswerText text={answer?.reasons?.[k]} />
        </div>
      ))}
    </div>
  );
}

// ---------- 팝업 ----------
export function Modal({ children }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(27,42,65,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 50,
      }}
    >
      <div style={{ ...cardStyle, width: '100%', maxWidth: 400, padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({ message, yesLabel = '예', noLabel = '아니오', onYes, onNo, danger, busy }) {
  return (
    <Modal>
      <p style={{ margin: '0 0 18px', fontSize: 15, lineHeight: 1.6, color: 'var(--color-navy)', whiteSpace: 'pre-line' }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onNo} disabled={busy} style={{ ...secondaryButton, flex: 1 }}>
          {noLabel}
        </button>
        <button
          onClick={onYes}
          disabled={busy}
          style={{ ...primaryButton(true), flex: 1, background: danger ? 'var(--color-coral)' : 'var(--color-navy)' }}
        >
          {busy ? '처리 중...' : yesLabel}
        </button>
      </div>
    </Modal>
  );
}

// 화면 전체를 덮는 읽기 전용 패널 (자료 다시 보기 / 전체 질문 / 내 답변)
export function Sheet({ title, onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-bg)',
        zIndex: 40,
        overflowY: 'auto',
      }}
    >
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: 'var(--color-navy)',
            color: '#FFFFFF',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1,
          }}
        >
          <span style={{ fontSize: 14.5, fontWeight: 600 }}>{title}</span>
          <button
            onClick={onClose}
            style={{ background: '#FFFFFF', color: 'var(--color-navy)', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 600 }}
          >
            닫기 ✕
          </button>
        </div>
        <div style={{ padding: '16px 16px 40px' }}>{children}</div>
      </div>
    </div>
  );
}
