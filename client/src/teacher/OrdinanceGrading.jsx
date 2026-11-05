// src/teacher/OrdinanceGrading.jsx
// 교사용 조례 수행평가 채점: 채점 요소마다 "주로 보는 문항"의 답을 모아 보여 주고,
// 바로 아래에서 A~E(또는 미제출)를 고르면 즉시 저장한다. [등급 기준 보기]로 학교 제출 세부기준을 펼친다.
import { useState, useEffect, useCallback } from 'react';
import { teacherApi } from './api';
import { STAGES } from '../ordinance/content';
import { AnswerText, EvidenceAnswer } from '../ordinance/ui';
import { RUBRIC_GUIDE, GRADE_LABELS } from '../ordinance/rubric';

// '3-1' → { stage, q }
const QUESTION_INDEX = Object.fromEntries(
  STAGES.flatMap((stage) => stage.questions.map((q) => [q.id, { stage, q }]))
);

function QuestionBlock({ qid, track, answers }) {
  const found = QUESTION_INDEX[qid];
  if (!found) return null;
  const { stage, q } = found;
  const a = answers?.[stage.stepKey] || {};
  return (
    <div style={{ borderLeft: '3px solid var(--color-border)', padding: '4px 0 4px 10px', marginBottom: 10 }}>
      <p style={{ margin: '0 0 4px', fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-muted)' }}>
        <b style={{ color: 'var(--color-navy)' }}>{q.id}.</b> {q.label && <b>[{q.label}] </b>}
        {q.prompt}
      </p>
      {q.type === 'evidence' ? <EvidenceAnswer track={track} answer={a} /> : <AnswerText text={a[q.field]} />}
    </div>
  );
}

function GradeCard({ item, track, answers, onSave, saving }) {
  const [showGuide, setShowGuide] = useState(false);
  const guide = RUBRIC_GUIDE[item.item_key] || { questions: [], levels: [] };
  const scale = Array.isArray(item.scale) ? item.scale : [item.max_score, null, item.mid_score, null, item.base_score];
  const options = [
    ...GRADE_LABELS.map((label, i) => ({ key: label, label, score: scale[i] })).filter((o) => o.score !== null),
    { key: 'none', label: '미제출', score: 0 },
  ];
  const hasScore = item.score !== null && item.score !== undefined;
  const activeKey = hasScore ? options.find((o) => o.score === item.score)?.key : null;
  const activeIndex = GRADE_LABELS.indexOf(activeKey);

  return (
    <div
      style={{
        background: 'var(--color-card)',
        border: `1.5px solid ${hasScore ? 'var(--color-teal)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-card)',
        padding: 14,
        marginBottom: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: 'var(--color-navy)' }}>{item.title}</p>
        <span style={{ fontSize: 12.5, color: hasScore ? 'var(--color-teal)' : 'var(--color-text-muted)', fontWeight: 600 }}>
          {hasScore ? `${activeKey === 'none' ? '미제출' : activeKey} · ${item.score}점` : '미채점'} / {item.max_score}
        </span>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 11.5, color: 'var(--color-text-muted)' }}>
        주로 보는 문항: {guide.questions.join(', ')}
        {guide.note && ` · ${guide.note}`}
      </p>

      {guide.questions.map((qid) => (
        <QuestionBlock key={qid} qid={qid} track={track} answers={answers} />
      ))}

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
        {options.map((o) => {
          const active = o.key === activeKey;
          return (
            <button
              key={o.key}
              disabled={saving}
              onClick={() => onSave(item, o.score)}
              style={{
                flex: o.key === 'none' ? '1 1 70px' : '1 1 48px',
                padding: '8px 4px',
                fontSize: 12.5,
                borderRadius: 6,
                border: `1.5px solid ${active ? 'var(--color-navy)' : 'var(--color-border)'}`,
                background: active ? 'var(--color-navy)' : '#FFFFFF',
                color: active ? 'var(--color-navy-text-on)' : 'var(--color-text)',
                fontWeight: active ? 600 : 400,
              }}
            >
              {o.label}
              {o.key !== 'none' && ` (${o.score})`}
            </button>
          );
        })}
      </div>

      {guide.levels.length > 0 && (
        <>
          <button
            onClick={() => setShowGuide((v) => !v)}
            style={{ background: 'none', border: 'none', color: 'var(--color-teal)', fontSize: 12, padding: 0, marginTop: 8 }}
          >
            {showGuide ? '등급 기준 접기 ▲' : '등급 기준 보기 ▼'}
          </button>
          {showGuide && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6, fontSize: 12 }}>
              <tbody>
                {guide.levels.map((desc, i) => (
                  <tr
                    key={i}
                    style={{
                      borderTop: '1px solid var(--color-border)',
                      background: i === activeIndex ? 'rgba(43,110,104,0.10)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '6px 6px', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--color-navy)', verticalAlign: 'top' }}>
                      {GRADE_LABELS[i]} ({scale[i]})
                    </td>
                    <td style={{ padding: '6px 6px', lineHeight: 1.5, color: 'var(--color-text-body)' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

export default function OrdinanceGrading({ token, projectId, enrollmentId, track, answers }) {
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await teacherApi.getGrades(token, projectId, enrollmentId);
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    }
  }, [token, projectId, enrollmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (item, score) => {
    setSaving(true);
    try {
      await teacherApi.saveGrade(token, enrollmentId, item.id, score);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <p style={{ color: 'var(--color-coral)', fontSize: 13 }}>{error}</p>;
  if (!items) return <p style={{ fontSize: 13, color: 'var(--color-text-body)' }}>불러오는 중...</p>;

  const graded = items.filter((i) => i.score !== null && i.score !== undefined).length;
  const local = QUESTION_INDEX['8-2'];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          background: 'var(--color-bg)',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 12.5, color: 'var(--color-text-body)' }}>
          채점 {graded} / {items.length}개 요소
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-teal)' }}>총점 {total}점</span>
      </div>

      {items.map((item) => (
        <GradeCard key={item.id} item={item} track={track} answers={answers} onSave={save} saving={saving} />
      ))}

      {local && (
        <div
          style={{
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: 12,
            marginBottom: 14,
            background: 'var(--color-bg)',
          }}
        >
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}>
            참고 (채점 제외) · 8-2 우리 지역 연결
          </p>
          <QuestionBlock qid="8-2" track={track} answers={answers} />
        </div>
      )}
    </div>
  );
}
