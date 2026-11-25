// src/App.jsx — 관광정책결정 시뮬레이션(학생 화면)
// 2026.11 편의성 개선(조례 수행평가와 같은 방식):
// - 저장을 App 한곳에서 맡는다: 입력이 바뀌면 0.8초 뒤 자동 저장, 단계를 옮길 때·제출할 때는 즉시 저장.
//   STEP1 진행 상황·STEP4 예산표·STEP9 성찰도 서버에 저장된다.
// - 한 번 가 본 단계는 위쪽 단계 번호를 눌러 언제든 오갈 수 있다(아직 안 가 본 단계는 잠김: 새로운 상황이 1차 판단 뒤에 열리도록).
// - 글자 수는 쓰는 동안 막지 않고, '내 답안 전체 확인'에서 한꺼번에 확인한 뒤 최종 제출한다.
// - 제출한 학생·열람 모드에서는 같은 단계별 화면을 보기 전용으로 보여준다.
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import StudentLogin from './StudentLogin';
import MaterialsPreview from './MaterialsPreview';
import MyRecord from './MyRecord';
import Step0 from './steps/Step0';
import Step1 from './steps/Step1';
import Step3 from './steps/Step3';
import Step4 from './steps/Step4';
import Step5 from './steps/Step5';
import Step6 from './steps/Step6';
import Step7 from './steps/Step7';
import Step8 from './steps/Step8';
import Step9 from './steps/Step9';
import StepCheck from './steps/StepCheck';
import Done from './steps/Done';
import { enterProject, fetchStakeholders, saveResponse, submitFinal } from './api';
import { TourismShellContext } from './components/TourismShell';
import { StageNav, Toolbar, ReadOnlyBanner } from './components/TourismNav';
import {
  CHECK_STEP,
  collectIssues,
  nextStepNo,
  normalizedStep5,
  normalizedStep8,
  payloadsFor,
  prevStepNo,
  screenOf,
  stepNoOf,
} from './data/tourismFlow';

const PROJECT_CODE = 'tourism';
const STEP_KEYS = ['step1', 'step3', 'step4', 'step5', 'step7', 'step8', 'step9'];

// 예전 방식(이 기기에만 저장)으로 남아 있는 예산표 선택. 서버에 STEP4 답이 없을 때만 불러와 서버로 옮긴다.
function legacyBudgetKey(student) {
  return `budgetGiven:${student?.className}:${student?.studentNo}`;
}
// 이 기기에서 마지막으로 보던 단계·가장 멀리 간 단계(다시 로그인했을 때 그 자리로 돌아가기 위함)
const lastStageKey = (s) => `tourism:lastStage:${s?.className}:${s?.studentNo}`;
const furthestKey = (s) => `tourism:furthest:${s?.className}:${s?.studentNo}`;
function readNum(key) {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}
function writeNum(key, n) {
  try {
    localStorage.setItem(key, String(n));
  } catch {
    /* 시크릿 모드 등: 무시 */
  }
}

// 저장된 답을 보고 어디까지 가 봤는지 계산한다.
function furthestFromResponses(r) {
  let f = 0;
  if (r.step1) f = 1;
  if (r.step3) f = 3;
  if (r.step4) f = Math.max(f, 4);
  if (r.step5) f = 5;
  if (r.step7) f = 7;
  if (r.step8) f = 8;
  if (r.step9) f = 9;
  return f;
}

function formatKST(d) {
  return new Date(d).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ClosedScreen({ info, onRetry, onLogout, onPreview }) {
  const btn = (primary) => ({
    width: '100%',
    background: primary ? 'var(--color-navy)' : '#FFFFFF',
    color: primary ? 'var(--color-navy-text-on)' : 'var(--color-navy)',
    border: primary ? 'none' : '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-button)',
    padding: 13,
    fontSize: 15,
    fontWeight: 500,
    marginTop: 10,
  });
  return (
    <div style={{ padding: '36px 20px', maxWidth: 520, margin: '0 auto' }}>
      <h3 style={{ color: 'var(--color-navy)', fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>관광정책결정 시뮬레이션</h3>
      <p style={{ color: 'var(--color-coral)', fontSize: 14, margin: '0 0 14px' }}>{info?.message}</p>
      {info?.schedules?.length > 0 && (
        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: '12px 14px',
            marginBottom: 6,
          }}
        >
          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: 'var(--color-navy)' }}>우리 반 응시 시간</p>
          {info.schedules.map((s) => (
            <p key={`${s.session_no}-${s.starts_at}`} style={{ margin: '2px 0', fontSize: 13, color: 'var(--color-text-body)' }}>
              {s.session_no}차시: {formatKST(s.starts_at)} ~ {formatKST(s.ends_at).split(' ').pop()}
            </p>
          ))}
        </div>
      )}
      <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '8px 0 0' }}>
        응시 시간 전에도 아래 버튼으로 자료를 미리 볼 수 있어요.
      </p>
      <button onClick={onPreview} style={btn(false)}>
        📚 자료 미리 보기
      </button>
      <button onClick={onRetry} style={btn(true)}>
        다시 시도
      </button>
      <button onClick={onLogout} style={btn(false)}>
        처음 화면으로
      </button>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState('login');
  const [student, setStudent] = useState(null);
  const [session, setSession] = useState(null); // { project, steps, enrollment, responses, reviewOnly }
  const [loadError, setLoadError] = useState('');
  const [closedInfo, setClosedInfo] = useState(null);
  const [answers, setAnswers] = useState({}); // { step1, step3, step4: {budgetGiven}, step5, step7, step8, step9 }
  const [stakeholders, setStakeholders] = useState(null);
  const [stakeholderError, setStakeholderError] = useState('');
  const [furthest, setFurthest] = useState(0);
  const [saveState, setSaveState] = useState('');
  const [saveError, setSaveError] = useState('');
  const [focusTarget, setFocusTarget] = useState(null); // { step, fieldId, nonce }
  const [recordFrom, setRecordFrom] = useState(null); // '한 페이지로 모아 보기'에서 돌아갈 화면

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const ctxRef = useRef(null); // { token, enrollmentId, stepIds } — 보기 전용이면 null(저장 안 함)
  const lastSaved = useRef({});
  const timer = useRef(null);

  const readOnly = !!session?.reviewOnly || !!session?.enrollment?.submitted_at;

  // ---------------- 저장 ----------------
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const ctx = ctxRef.current;
    if (!ctx) return true;
    const payloads = payloadsFor(answersRef.current);
    const pending = Object.entries(payloads).filter(
      ([k, v]) => ctx.stepIds[k] && JSON.stringify(v) !== lastSaved.current[k]
    );
    if (pending.length === 0) return true;
    setSaveState('saving');
    try {
      for (const [k, v] of pending) {
        await saveResponse(ctx.token, ctx.enrollmentId, ctx.stepIds[k], v);
        lastSaved.current[k] = JSON.stringify(v);
      }
      setSaveState('saved');
      setSaveError('');
      return true;
    } catch (err) {
      setSaveState('error');
      setSaveError(err.message);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!ctxRef.current) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(), 800);
    return () => clearTimeout(timer.current);
  }, [answers, flush]);

  // 창을 닫거나 새로고침하기 직전에도 한 번 더 저장을 시도한다
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [flush]);

  const setDraft = (key) => (value) => setAnswers((prev) => ({ ...prev, [key]: value }));

  const toggleBudgetItem = (name) => {
    if (readOnly) return;
    setAnswers((prev) => {
      const given = { ...(prev.step4?.budgetGiven || {}) };
      if (given[name]) delete given[name];
      else given[name] = true;
      return { ...prev, step4: { budgetGiven: given } };
    });
  };

  // ---------------- 로그인·이어하기 ----------------
  const afterLogin = async (stu) => {
    setStudent(stu);
    setScreen('loading');
    setFocusTarget(null);
    try {
      const data = await enterProject(stu.token, PROJECT_CODE);
      const keyById = Object.fromEntries(data.steps.map((s) => [s.id, s.step_key]));
      const r = {};
      for (const row of data.responses || []) {
        const key = keyById[row.step_id];
        if (key) r[key] = row.answer;
      }
      lastSaved.current = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, JSON.stringify(v)]));

      const loaded = { ...r };
      if (!loaded.step4) {
        try {
          const legacy = JSON.parse(localStorage.getItem(legacyBudgetKey(stu)) || 'null');
          if (legacy && Object.values(legacy).some(Boolean)) {
            loaded.step4 = { budgetGiven: Object.fromEntries(Object.entries(legacy).filter(([, v]) => v)) };
          }
        } catch {
          /* 무시 */
        }
      }
      answersRef.current = loaded;
      setAnswers(loaded);
      setSession(data);

      const done = !!data.enrollment?.submitted_at;
      if (data.reviewOnly || done) {
        ctxRef.current = null;
        setFurthest(CHECK_STEP);
        // 열람 모드: 자기평가서 안내문과 같게 '나의 수행평가 기록'(한 페이지)으로 먼저 열고,
        // 그 화면의 버튼으로 수행평가 때와 같은 단계별 보기로 들어갈 수 있다.
        // 응시 시간 안에 제출을 마친 학생은 예전처럼 '제출 완료' 화면.
        setRecordFrom(null);
        setScreen(data.reviewOnly ? 'record' : 'done');
        return;
      }

      ctxRef.current = {
        token: stu.token,
        enrollmentId: data.enrollment.id,
        stepIds: Object.fromEntries(data.steps.filter((s) => STEP_KEYS.includes(s.step_key)).map((s) => [s.step_key, s.id])),
      };
      const f = Math.max(furthestFromResponses(r), readNum(furthestKey(stu)));
      setFurthest(f);
      const remembered = readNum(lastStageKey(stu));
      const reachable = f >= 9 ? CHECK_STEP : f;
      if (remembered && remembered <= reachable) setScreen(screenOf(remembered));
      else if (f === 0) setScreen('step0');
      else setScreen(screenOf(f));
    } catch (err) {
      if (err.status === 403) {
        setClosedInfo({ message: err.message, schedules: err.schedules || [] });
        setScreen('closed');
      } else {
        setLoadError(err.message);
        setScreen('loadError');
      }
    }
  };

  // 이해관계자는 STEP6 이후 화면들이 같은 목록을 함께 쓴다
  useEffect(() => {
    if (!['step6', 'step7', 'step8', 'step9', 'check', 'done', 'record'].includes(screen)) return;
    if (stakeholders || !student?.token || !session?.project?.id) return;
    fetchStakeholders(student.token, session.project.id)
      .then(setStakeholders)
      .catch((err) => setStakeholderError(err.message));
  }, [screen, stakeholders, student, session]);

  // ---------------- 단계 이동 ----------------
  const go = (no, focus = null) => {
    flush();
    setFocusTarget(focus);
    if (!readOnly) {
      setFurthest((f) => {
        const next = Math.max(f, no === CHECK_STEP ? 9 : no);
        writeNum(furthestKey(student), next);
        return next;
      });
      writeNum(lastStageKey(student), no);
    }
    setScreen(screenOf(no));
    window.scrollTo(0, 0);
  };

  // 부족 문항으로 바로 가기: 그 단계를 열고, 해당 칸으로 스크롤해 강조한다
  useEffect(() => {
    if (!focusTarget || stepNoOf(screen) !== focusTarget.step) return undefined;
    const t = setTimeout(() => {
      const el = document.getElementById(`field-${focusTarget.fieldId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('flag-missing');
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') el.focus({ preventScroll: true });
      const clear = () => el.classList.remove('flag-missing');
      el.addEventListener('input', clear, { once: true });
      el.addEventListener('click', clear, { once: true });
    }, 150);
    return () => clearTimeout(t);
  }, [screen, focusTarget]);

  // 화면에 보여줄 답(앞 단계를 고친 경우 재판단·최종 결정 값을 맞춰서)
  const shown = useMemo(
    () => ({
      ...answers,
      step5: normalizedStep5(answers.step3, answers.step5),
      step8: normalizedStep8(answers.step3, answers.step5, answers.step7, answers.step8),
    }),
    [answers]
  );
  const issues = useMemo(() => collectIssues(answers, stakeholders?.length || 6), [answers, stakeholders]);
  const doneSteps = useMemo(() => {
    const bad = new Set(issues.map((i) => i.step));
    const set = new Set();
    // 읽기만 하는 단계(1·4·6)는 지나가면 ✓, 쓰는 단계는 가 봤고 부족한 문항이 없으면 ✓
    [1, 4, 6].forEach((n) => n < furthest && set.add(n));
    [3, 5, 7, 8, 9].forEach((n) => n <= furthest && !bad.has(n) && set.add(n));
    return set;
  }, [issues, furthest]);

  const submit = async () => {
    const ok = await flush();
    if (!ok) throw new Error('답안을 저장하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.');
    const updated = await submitFinal(student.token, session.enrollment.id);
    ctxRef.current = null;
    setSession((s) => ({ ...s, enrollment: { ...s.enrollment, ...updated } }));
    setScreen('done');
    window.scrollTo(0, 0);
  };

  // ---------------- 화면 ----------------
  if (screen === 'loading') {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-body)' }}>불러오는 중...</div>;
  }

  if (screen === 'loadError') {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--color-coral)', fontSize: 14 }}>{loadError}</p>
        <button
          onClick={() => setScreen('login')}
          style={{
            marginTop: 16,
            padding: '10px 20px',
            background: 'var(--color-navy)',
            color: 'var(--color-navy-text-on)',
            border: 'none',
            borderRadius: 8,
          }}
        >
          다시 로그인
        </button>
      </div>
    );
  }

  if (screen === 'closed') {
    return (
      <ClosedScreen
        info={closedInfo}
        onRetry={() => afterLogin(student)}
        onLogout={() => setScreen('login')}
        onPreview={() => setScreen('previewClosed')}
      />
    );
  }

  if (screen === 'login') {
    return (
      <StudentLogin
        onLogin={afterLogin}
        onPreview={() => setScreen('preview')}
        crossLink={{ href: '/ordinance', label: '📜 조례 수행평가 하러 가기 →' }}
      />
    );
  }
  if (screen === 'preview') return <MaterialsPreview onBack={() => setScreen('login')} />;
  if (screen === 'previewClosed') return <MaterialsPreview onBack={() => setScreen('closed')} />;

  if (screen === 'record') {
    return (
      <MyRecord
        student={student}
        enrollment={session?.enrollment}
        answers={shown}
        stakeholders={stakeholders}
        stakeholderError={stakeholderError}
        budgetGiven={answers.step4?.budgetGiven || {}}
        onLogout={recordFrom ? () => setScreen(recordFrom) : () => window.location.reload()}
        actionLabel={recordFrom ? '← 단계별 보기로 돌아가기' : '처음 화면으로'}
        onStepView={recordFrom ? null : () => go(1)}
      />
    );
  }

  if (screen === 'done') {
    return (
      <Done
        student={student}
        step3Answer={shown.step3}
        step5Answer={shown.step5}
        step7Answer={shown.step7}
        step8Answer={shown.step8}
        step9Answer={shown.step9}
        stakeholders={stakeholders}
        onReview={() => go(1)}
      />
    );
  }

  if (screen === 'step0') {
    return <Step0 student={student} onStart={() => go(1)} />;
  }

  // ---- STEP1~9, 내 답안 전체 확인: 공통 틀(단계 이동 막대·도구 막대) 안에서 ----
  const current = stepNoOf(screen);
  const reachable = readOnly || furthest >= 9 ? CHECK_STEP : furthest;
  const below = (
    <>
      {readOnly && <ReadOnlyBanner submittedAt={session?.enrollment?.submitted_at} />}
      <StageNav current={current} furthest={reachable} doneSteps={readOnly ? new Set() : doneSteps} onGo={(n) => go(n)} />
      <Toolbar saveState={saveState} saveError={saveError} readOnly={readOnly} />
    </>
  );
  const ft = focusTarget && focusTarget.step === current ? focusTarget : null;
  const back = () => go(prevStepNo(current));
  const next = () => go(nextStepNo(current));
  const budgetGiven = answers.step4?.budgetGiven || {};

  let body = null;
  if (screen === 'step1') {
    body = (
      <Step1
        student={student}
        token={student?.token}
        projectId={session?.project.id}
        stepId={session?.steps.find((s) => s.step_key === 'step1')?.id}
        initialAnswers={answers.step1?.answers || {}}
        initialIndex={answers.step1?.index || 0}
        allUnlocked={furthest >= 3}
        onDraftChange={setDraft('step1')}
        onComplete={next}
      />
    );
  } else if (screen === 'step3') {
    body = (
      <Step3
        student={student}
        initialAnswer={answers.step3}
        onDraftChange={setDraft('step3')}
        onBack={back}
        onComplete={next}
      />
    );
  } else if (screen === 'step4') {
    body = (
      <Step4
        student={student}
        token={student?.token}
        projectId={session?.project.id}
        stepId={session?.steps.find((s) => s.step_key === 'step4')?.id}
        previousChoice={answers.step3?.choice}
        step3Answer={answers.step3}
        budgetGiven={budgetGiven}
        onBudgetChange={toggleBudgetItem}
        initialPhase={readOnly || furthest > 4 ? 'materials' : 'alert'}
        onBack={back}
        onComplete={next}
      />
    );
  } else if (screen === 'step5') {
    body = (
      <Step5
        student={student}
        previousChoice={answers.step3?.choice}
        step3Answer={answers.step3}
        budgetGiven={budgetGiven}
        initialAnswer={answers.step5}
        onDraftChange={setDraft('step5')}
        onBack={back}
        onComplete={next}
      />
    );
  } else if (screen === 'step6') {
    body = (
      <Step6
        student={student}
        stakeholders={stakeholders}
        loadError={stakeholderError}
        step3Answer={answers.step3}
        step5Answer={shown.step5}
        budgetGiven={budgetGiven}
        onBack={back}
        onComplete={next}
      />
    );
  } else if (screen === 'step7') {
    body = (
      <Step7
        student={student}
        stakeholders={stakeholders}
        loadError={stakeholderError}
        initialAnswer={answers.step7}
        initialPhase={ft ? (ft.fieldId === 't7-classify' ? 'classify' : 'writing') : readOnly ? 'classify' : undefined}
        onDraftChange={setDraft('step7')}
        step3Answer={answers.step3}
        step5Answer={shown.step5}
        budgetGiven={budgetGiven}
        onBack={back}
        onComplete={next}
      />
    );
  } else if (screen === 'step8') {
    body = (
      <Step8
        student={student}
        stakeholders={stakeholders}
        step3Answer={answers.step3}
        step5Answer={shown.step5}
        step7Answer={answers.step7}
        budgetGiven={budgetGiven}
        initialAnswer={answers.step8}
        onDraftChange={setDraft('step8')}
        onBack={back}
        onComplete={next}
      />
    );
  } else if (screen === 'step9') {
    body = (
      <Step9
        student={student}
        initialAnswer={answers.step9}
        initialPage={ft ? ft.fieldId.replace('t9-', '') : undefined}
        onDraftChange={setDraft('step9')}
        step3Answer={answers.step3}
        step5Answer={shown.step5}
        step7Answer={answers.step7}
        step8Answer={shown.step8}
        stakeholders={stakeholders}
        budgetGiven={budgetGiven}
        onBack={back}
        onComplete={() => go(CHECK_STEP)}
      />
    );
  } else if (screen === 'check') {
    body = (
      <StepCheck
        student={student}
        answers={shown}
        stakeholders={stakeholders}
        issues={issues}
        onEdit={(n) => go(n)}
        onJump={(i) => go(i.step, { step: i.step, fieldId: i.fieldId, nonce: Date.now() })}
        onBack={() => go(9)}
        onBeforeSubmit={flush}
        onSubmit={submit}
        onViewAll={() => {
          setRecordFrom('check');
          setScreen('record');
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  return (
    <TourismShellContext.Provider value={{ below, readOnly }}>
      {/* key: 같은 단계로 '바로 가기'를 다시 눌러도 그 칸이 열리도록 */}
      <div key={`${screen}-${focusTarget?.nonce || ''}`}>{body}</div>
    </TourismShellContext.Provider>
  );
}
