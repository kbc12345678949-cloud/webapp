// src/steps/StepCheck.jsx
// 내 답안 전체 확인 — 최종 제출 전에 내가 쓴 답을 한 화면에서 확인하고, 부족한 문항으로 바로 가서 고친다.
// 보기 전용(제출 후·열람 모드)일 때는 수정·제출 버튼 없이 답만 보여준다.
import { useRef, useState } from 'react';
import ProgressHeader from '../components/ProgressHeader';
import { BUDGET_ITEMS } from '../components/BudgetTable';
import { policyText } from '../data/tourismFlow';
import { useTourismShell } from '../components/TourismShell';

const DECISION_LABEL = { keep: '기존 선택 유지', change: '다른 정책으로 변경' };
const TAG_LABEL = { benefit: '혜택 집단', harm: '불이익 집단', neutral: '상관없어 보임' };
const BRANCH_LABEL = { had: '있었다', none: '없었다' };

const card = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card)',
  padding: '14px 16px',
  marginBottom: 12,
};

function Empty() {
  return <span style={{ color: 'var(--color-text-muted)' }}>(작성하지 않음)</span>;
}
const txt = (v) => ((v || '').trim() ? v : <Empty />);

function Item({ label, children, issues }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ margin: '0 0 3px', fontSize: 11.5, fontWeight: 600, color: 'var(--color-teal)' }}>
        {label}
        {issues?.map((r, i) => (
          <span
            key={i}
            style={{
              marginLeft: 6,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-coral)',
              background: '#FFF1EC',
              borderRadius: 6,
              padding: '1px 6px',
            }}
          >
            부족 · {r}
          </span>
        ))}
      </p>
      <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>{children}</div>
    </div>
  );
}

function StepCard({ step, title, onEdit, children, readOnly }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ flex: 1, margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-navy)' }}>
          STEP {step} · {title}
        </p>
        <button
          onClick={() => onEdit(step)}
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '5px 10px',
            fontSize: 12,
            color: 'var(--color-navy)',
          }}
        >
          {readOnly ? '이 단계 보기' : '수정하기'}
        </button>
      </div>
      {children}
    </div>
  );
}

function IssueList({ issues, onJump, isTestClass, onForceSubmit }) {
  if (issues.length === 0) {
    return (
      <div style={{ ...card, borderColor: 'var(--color-teal)' }}>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-teal)', fontWeight: 600 }}>
          ✓ 부족한 문항이 모두 채워졌어요. 아래 [최종 제출]을 다시 눌러 주세요.
        </p>
      </div>
    );
  }
  return (
    <div style={{ ...card, borderColor: 'var(--color-coral)', borderWidth: 2 }}>
      <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--color-coral)' }}>
        아직 채우지 못한 문항이 {issues.length}개 있어요
      </p>
      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--color-text-body)' }}>
        누르면 그 칸으로 바로 이동해요. 다 채운 뒤 '확인' 단계로 돌아와 최종 제출해 주세요.
      </p>
      {issues.map((i, n) => (
        <button
          key={`${i.fieldId}-${n}`}
          onClick={() => onJump(i)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            background: '#FFF7F4',
            border: '1px solid #F3C9BB',
            borderRadius: 8,
            padding: '9px 11px',
            marginBottom: 6,
            fontSize: 13,
            color: 'var(--color-navy)',
          }}
        >
          <b>STEP {i.step}</b> {i.label} — <span style={{ color: 'var(--color-coral)' }}>{i.reason}</span> →
        </button>
      ))}
      {isTestClass && (
        <button
          onClick={onForceSubmit}
          style={{
            marginTop: 6,
            width: '100%',
            background: '#FFFFFF',
            border: '1.5px dashed var(--color-coral)',
            color: 'var(--color-coral)',
            borderRadius: 8,
            padding: 10,
            fontSize: 13,
          }}
        >
          (테스트반) 그래도 제출하기
        </button>
      )}
    </div>
  );
}

export default function StepCheck({
  student,
  answers,
  stakeholders,
  issues,
  onEdit,
  onJump,
  onBack,
  onSubmit, // async () => 제출 성공 여부. 실패하면 오류 문구를 던진다.
  onBeforeSubmit, // async () => true면 제출 확인 창을 띄워도 됨(저장 확인)
  onViewAll,
}) {
  const { readOnly } = useTourismShell();
  const [showIssues, setShowIssues] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const issueRef = useRef(null);
  const isTestClass = student?.className === '테스트반';

  const byField = {};
  issues.forEach((i) => {
    byField[i.fieldId] = byField[i.fieldId] || [];
    byField[i.fieldId].push(i.reason);
  });
  const iss = (...ids) => (readOnly ? null : ids.flatMap((id) => byField[id] || []));

  const a3 = answers.step3 || {};
  const a5 = answers.step5 || {};
  const a7 = answers.step7 || {};
  const a8 = answers.step8 || {};
  const a9 = answers.step9 || {};
  const given = answers.step4?.budgetGiven || {};
  const givenItems = BUDGET_ITEMS.filter((it) => given[it.name]);
  const nameByKey = (key) => stakeholders?.find((s) => s.stakeholder_key === key)?.name || key;
  const groups = { benefit: [], harm: [], neutral: [] };
  Object.entries(a7.classification || {}).forEach(([k, tag]) => groups[tag]?.push(nameByKey(k)));

  const trySubmit = async () => {
    setMessage('');
    const ok = await onBeforeSubmit();
    if (!ok) {
      setMessage('답안을 저장하지 못해 제출하지 않았어요. 인터넷 연결을 확인하고 다시 눌러 주세요.');
      return;
    }
    if (issues.length > 0) {
      setShowIssues(true);
      setTimeout(() => issueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      return;
    }
    setConfirm(true);
  };

  const doSubmit = async () => {
    setBusy(true);
    setMessage('');
    try {
      await onSubmit();
    } catch (err) {
      setConfirm(false);
      setMessage(`제출에 실패했습니다: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <ProgressHeader projectLabel="TF팀 브리핑" currentStep={9} totalSteps={9} studentNo={student?.studentNo} studentName={student?.name} />
      <div style={{ padding: '16px 20px 30px' }}>
        <h3 style={{ color: 'var(--color-navy)', fontSize: 17, fontWeight: 500, margin: '0 0 4px' }}>내 답안 전체 확인</h3>
        <p style={{ color: 'var(--color-text-body)', fontSize: 13, lineHeight: 1.6, margin: '0 0 14px' }}>
          {readOnly ? (
            '내가 쓴 답을 한 번에 볼 수 있어요. 제출한 답안이라 고칠 수는 없어요.'
          ) : (
            <>
              제출 전에 내가 쓴 답을 한 번에 확인하세요. <b style={{ color: 'var(--color-coral)' }}>부족</b> 표시가 있는 문항은
              [수정하기]를 눌러 고칠 수 있어요.
            </>
          )}
        </p>

        {message && <p style={{ color: 'var(--color-coral)', fontSize: 13, margin: '0 0 12px' }}>{message}</p>}

        {showIssues && !readOnly && (
          <div ref={issueRef}>
            <IssueList issues={issues} onJump={onJump} isTestClass={isTestClass} onForceSubmit={() => setConfirm(true)} />
          </div>
        )}

        <StepCard step={3} title="1차 판단" onEdit={onEdit} readOnly={readOnly}>
          <Item label="고른 정책" issues={iss('t3-choice')}>{a3.choice ? policyText(a3.choice) : <Empty />}</Item>
          <Item label="선택한 근거" issues={iss('t3-reason')}>{txt(a3.reason)}</Item>
        </StepCard>

        <StepCard step={4} title="새로운 상황 · 예산표" onEdit={onEdit} readOnly={readOnly}>
          <Item label="포기하기로 고른 예산 항목">
            {givenItems.length ? (
              `${givenItems.map((it) => `${it.name}(${it.amount}억)`).join(', ')} · 합계 ${givenItems.reduce((s, it) => s + it.amount, 0)}억`
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>(고르지 않음)</span>
            )}
          </Item>
        </StepCard>

        <StepCard step={5} title="재판단" onEdit={onEdit} readOnly={readOnly}>
          <Item label="유지/변경" issues={iss('t5-decision')}>
            {a5.decision ? `${DECISION_LABEL[a5.decision]}${a5.choice ? ` → ${policyText(a5.choice)}` : ''}` : <Empty />}
          </Item>
          <Item label="그렇게 판단한 이유" issues={iss('t5-reason')}>{txt(a5.reason)}</Item>
        </StepCard>

        <StepCard step={7} title="트레이드오프 분석" onEdit={onEdit} readOnly={readOnly}>
          <Item label="이해관계자 분류" issues={iss('t7-classify')}>
            {Object.keys(a7.classification || {}).length ? (
              ['benefit', 'harm', 'neutral'].map((t) => (
                <div key={t}>
                  {TAG_LABEL[t]}: {groups[t].length ? groups[t].join(', ') : '없음'}
                </div>
              ))
            ) : (
              <Empty />
            )}
          </Item>
          <Item label="불이익 집단의 불만" issues={iss('t7-harm')}>{txt(a7.harmConcern)}</Item>
          <Item label="보완책" issues={iss('t7-mitigation')}>{txt(a7.mitigation)}</Item>
        </StepCard>

        <StepCard step={8} title="최종 결정" onEdit={onEdit} readOnly={readOnly}>
          <Item label="최종 선택 (재판단에서 이어짐)">{a8.finalChoice ? policyText(a8.finalChoice) : <Empty />}</Item>
          <Item label="핵심 근거" issues={iss('t8-core')}>{txt(a8.coreReason)}</Item>
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--color-text-muted)' }}>
            예상 문제점·보완 방안은 STEP7에서 쓴 불만·보완책이 그대로 들어가요.
          </p>
        </StepCard>

        <StepCard step={9} title="성찰" onEdit={onEdit} readOnly={readOnly}>
          <Item label="짝과 의견이 갈렸던 부분이 있었나요?" issues={iss('t9-branch')}>
            {a9.branch ? BRANCH_LABEL[a9.branch] : <Empty />}
          </Item>
          {a9.branch === 'had' && (
            <>
              <Item label="어떤 지점에서 의견이 갈렸고, 짝의 근거는?" issues={iss('t9-hadPoint')}>{txt(a9.hadPoint)}</Item>
              <Item label="논의 후 내 판단이 달라졌나요?" issues={iss('t9-hadChanged')}>{txt(a9.hadChanged)}</Item>
            </>
          )}
          {a9.branch === 'none' && (
            <Item label="짝과 의견이 일치한 이유" issues={iss('t9-noneReason')}>{txt(a9.noneReason)}</Item>
          )}
          <Item label="내 생각을 가장 크게 흔든 자료나 순간" issues={iss('t9-self1')}>{txt(a9.self1)}</Item>
          <Item label="가장 어려웠던 부분과 해결 방법" issues={iss('t9-self2')}>{txt(a9.self2)}</Item>
          <Item label='"정치적 판단"에 대해 새롭게 느낀 점' issues={iss('t9-self3')}>{txt(a9.self3)}</Item>
        </StepCard>

        {!readOnly && (
          <button
            onClick={trySubmit}
            style={{
              width: '100%',
              background: 'var(--color-navy)',
              color: 'var(--color-navy-text-on)',
              border: 'none',
              borderRadius: 'var(--radius-button)',
              padding: 14,
              fontSize: 16,
              fontWeight: 500,
              marginTop: 6,
            }}
          >
            최종 제출
          </button>
        )}
        {readOnly && onViewAll && (
          <button
            onClick={onViewAll}
            style={{
              width: '100%',
              background: '#FFFFFF',
              color: 'var(--color-navy)',
              border: '1.5px solid var(--color-navy)',
              borderRadius: 'var(--radius-button)',
              padding: 12,
              fontSize: 15,
              marginTop: 6,
            }}
          >
            📄 자료와 답을 한 페이지로 모아 보기
          </button>
        )}
        <button
          onClick={onBack}
          style={{
            width: '100%',
            background: '#FFFFFF',
            color: 'var(--color-navy)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-button)',
            padding: 12,
            fontSize: 15,
            marginTop: 10,
          }}
        >
          ← STEP9 성찰로 돌아가기
        </button>
      </div>

      {confirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(27,42,65,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 70,
          }}
        >
          <div style={{ background: '#FFFFFF', borderRadius: 'var(--radius-card)', padding: 22, maxWidth: 320, width: '100%' }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 10px' }}>최종 제출하시겠습니까?</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-body)', lineHeight: 1.6, margin: '0 0 20px' }}>
              최종 제출 후에는 답안을 수정할 수 없습니다.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirm(false)}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  border: '1.5px solid var(--color-border)',
                  background: '#FFFFFF',
                  color: 'var(--color-text)',
                  fontSize: 14,
                }}
              >
                취소
              </button>
              <button
                onClick={doSubmit}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--color-navy)',
                  color: 'var(--color-navy-text-on)',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {busy ? '제출 중...' : '제출'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
