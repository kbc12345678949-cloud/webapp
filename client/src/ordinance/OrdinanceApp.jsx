// src/ordinance/OrdinanceApp.jsx
// '생활 속 문제, 조례로 답하다' 학생 화면 (주소: /ordinance)
// 흐름: 로그인 → 시작 안내(전체 질문 미리 보기) → 1 주제 선택 → 2 배경 자료(→ 주제 고정) → 3~8단계(자유 이동)
//       → 내 답안 전체 확인 → 최종 제출(부족한 문항이 있으면 목록 안내) → 제출 완료
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import StudentLogin from '../StudentLogin';
import ProgressHeader from '../components/ProgressHeader';
import PublicPreview from './PublicPreview';
import {
  PROJECT_CODE,
  PROJECT_LABEL,
  TOTAL_STEPS,
  STAGES,
  STAGE_KEYS,
  MATERIAL_KEYS,
  findTrack,
  materialTitle,
  hintsFor,
  stageByNo,
} from './content';
import { collectIssues, countChars, textIssue, evidenceIssues } from './validate';
import { hasRepeatedCharacterAbuse } from '../utils/textQuality';
import {
  enterProject,
  saveResponse,
  submitFinal,
  selectTrack,
  lockTrack,
  changeTrack,
} from '../api';
import {
  cardStyle,
  primaryButton,
  secondaryButton,
  linkButton,
  CityNotice,
  TrackCards,
  MaterialBody,
  MaterialCard,
  MaterialsAccordion,
  QuestionList,
  AnswerSummary,
  ConfirmModal,
  Sheet,
} from './ui';

const emptyAnswers = () => Object.fromEntries(STAGE_KEYS.map((k) => [k, {}]));

function lastScreenKey(student) {
  return `ordinance:last:${student?.className}:${student?.studentNo}`;
}
function rememberStage(student, no) {
  try {
    localStorage.setItem(lastScreenKey(student), String(no));
  } catch {
    /* 저장 못 해도 동작에는 문제 없음 */
  }
}
function recallStage(student) {
  try {
    const v = Number(localStorage.getItem(lastScreenKey(student)));
    return v >= 3 && v <= 9 ? v : null; // 9 = 내 답안 전체 확인
  } catch {
    return null;
  }
}

function formatKST(d) {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(d));
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return `${get('month')}/${get('day')}(${get('weekday')}) ${get('hour')}:${get('minute')}`;
}

// ---------------- 휴대폰 / 태블릿 화면 모드 ----------------
// 고른 모드는 이 기기에만 기억된다. 태블릿 모드는 화면 폭을 넓혀 좌우 여백을 줄인다.
const LAYOUT_KEY = 'ordinance:layout';
function useLayout() {
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_KEY);
      if (saved === 'phone' || saved === 'tablet') return saved;
    } catch {
      /* 무시 */
    }
    return 'phone';
  });
  useEffect(() => {
    document.documentElement.dataset.layout = layout;
    try {
      localStorage.setItem(LAYOUT_KEY, layout);
    } catch {
      /* 무시 */
    }
  }, [layout]);
  return [layout, setLayout];
}

function LayoutToggle({ layout, onChange }) {
  const btn = (key, label) => {
    const active = layout === key;
    return (
      <button
        type="button"
        onClick={() => onChange(key)}
        aria-pressed={active}
        style={{
          flex: 1,
          padding: '10px 8px',
          borderRadius: 8,
          border: 'none',
          background: active ? 'var(--color-navy)' : 'transparent',
          color: active ? 'var(--color-navy-text-on)' : 'var(--color-text-body)',
          fontSize: 13.5,
          fontWeight: active ? 600 : 400,
        }}
      >
        {label}
      </button>
    );
  };
  return (
    <div style={{ marginBottom: 22 }}>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 6px' }}>화면 크기 선택</p>
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: 4,
          background: '#FFFFFF',
          border: '1px solid var(--color-border)',
          borderRadius: 10,
        }}
      >
        {btn('phone', '📱 휴대폰 모드로 보기')}
        {btn('tablet', '📲 태블릿 모드로 보기')}
      </div>
    </div>
  );
}

// 로그인한 뒤 화면 위쪽(진한 띠)에 두는 작은 전환 버튼. 누르면 다른 모드로 바로 바뀐다.
function LayoutSwitch({ layout, onChange }) {
  const next = layout === 'tablet' ? 'phone' : 'tablet';
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      title="화면 크기 바꾸기"
      style={{
        background: 'rgba(255,255,255,0.12)',
        color: '#FFFFFF',
        border: '1px solid rgba(255,255,255,0.35)',
        borderRadius: 8,
        padding: '5px 8px',
        fontSize: 11,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {next === 'tablet' ? '📲 태블릿 모드' : '📱 휴대폰 모드'}
    </button>
  );
}

export default function OrdinanceApp() {
  const [layout, setLayout] = useLayout();
  const [screen, setScreen] = useState('login');
  const [student, setStudent] = useState(null);
  const [session, setSession] = useState(null); // { project, steps, tracks, enrollment }
  const [answers, setAnswers] = useState(emptyAnswers);
  const [stageNo, setStageNo] = useState(3);
  const [opened, setOpened] = useState([]); // 2단계에서 펼쳐 본 자료
  const [modal, setModal] = useState(null); // 'lock' | 'change1' | 'change2' | 'submit'
  const [sheet, setSheet] = useState(null); // 'materials' | 'questions' | 'answers'
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''); // 화면 위쪽 안내(오류 등)
  const [closedInfo, setClosedInfo] = useState(null);
  const [showIssueList, setShowIssueList] = useState(false);
  const [flagged, setFlagged] = useState(() => new Set());
  const [focusTarget, setFocusTarget] = useState(null); // { fieldId, nonce }
  const [saveState, setSaveState] = useState('');
  const [saveError, setSaveError] = useState('');
  const [retryNeeded, setRetryNeeded] = useState(false);

  const isTestClass = student?.className === '테스트반';
  const enrollment = session?.enrollment;
  const serverTrack = session?.tracks?.find((t) => t.id === enrollment?.track_id) || null;
  const track = serverTrack ? findTrack(serverTrack.code) : null;
  const locked = !!enrollment?.track_locked;
  const submitted = !!enrollment?.submitted_at;

  // ---------------- 자동 저장 ----------------
  // 단계별 답안을 한곳(App)에 모아 두고, 바뀐 단계만 0.8초 뒤 서버에 저장한다.
  // 화면을 옮길 때·제출할 때는 기다리지 않고 바로 저장한다(flush).
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const lastSaved = useRef({});
  const timer = useRef(null);
  const ctxRef = useRef(null); // { token, enrollmentId, stepIds, trackId } — 주제가 고정된 뒤에만 채워짐

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const ctx = ctxRef.current;
    if (!ctx) return true;
    const pending = STAGE_KEYS.filter(
      (k) => JSON.stringify(answersRef.current[k] || {}) !== (lastSaved.current[k] ?? JSON.stringify({}))
    );
    if (pending.length === 0) return true;
    setSaveState('saving');
    try {
      for (const k of pending) {
        const snapshot = answersRef.current[k] || {};
        await saveResponse(ctx.token, ctx.enrollmentId, ctx.stepIds[k], snapshot, { trackId: ctx.trackId });
        lastSaved.current[k] = JSON.stringify(snapshot);
      }
      if (ctxRef.current === ctx) setSaveState('saved');
      return true;
    } catch (err) {
      if (ctxRef.current !== ctx) return true; // 주제를 바꾼 직후 예전 저장 요청이 거절된 경우: 무시
      // 관광정책과 같은 방식: 위쪽 저장 표시에 '저장 실패: 이유'를 띄우고, 다음 저장이 성공하면 사라진다.
      setSaveState('error');
      setSaveError(err.message);
      setRetryNeeded(!err.status); // 인터넷이 끊긴 경우만 잠시 뒤 자동으로 다시 저장
      return false;
    }
  }, []);

  useEffect(() => {
    if (!ctxRef.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
    return () => clearTimeout(timer.current);
  }, [answers, flush]);

  // 인터넷이 잠깐 끊겨 저장에 실패하면 5초마다 다시 시도한다(성공하면 '저장 실패' 표시가 사라짐)
  useEffect(() => {
    if (saveState !== 'error' || !retryNeeded) return;
    const t = setTimeout(() => flush(), 5000);
    return () => clearTimeout(t);
  }, [saveState, retryNeeded, saveError, flush]);

  // 휴대폰에서 다른 앱으로 넘어가거나 창을 닫을 때도 바로 저장
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
    };
  }, [flush]);

  const setupSaver = (sess, token) => {
    const e = sess.enrollment;
    if (!e?.track_locked || !e.track_id || e.submitted_at) {
      ctxRef.current = null;
      return;
    }
    const stepIds = Object.fromEntries(sess.steps.map((s) => [s.step_key, s.id]));
    ctxRef.current = { token, enrollmentId: e.id, stepIds, trackId: e.track_id };
  };

  // ---------------- 입장 ----------------
  const enter = async (stu) => {
    setScreen('loading');
    setMessage('');
    try {
      const data = await enterProject(stu.token, PROJECT_CODE);
      const keyById = Object.fromEntries(data.steps.map((s) => [s.id, s.step_key]));
      const loaded = emptyAnswers();
      lastSaved.current = {};
      for (const r of data.responses || []) {
        const key = keyById[r.step_id];
        if (key) {
          loaded[key] = r.answer || {};
          lastSaved.current[key] = JSON.stringify(r.answer || {});
        }
      }
      answersRef.current = loaded;
      setAnswers(loaded);
      setSession(data);
      if (data.reviewOnly) {
        ctxRef.current = null;
        setScreen('record');
        return;
      }
      setupSaver(data, stu.token);
      const e = data.enrollment;
      if (e.submitted_at) return setScreen('done');
      if (!e.track_id) return setScreen('intro');
      if (!e.track_locked) return setScreen('materials');
      const remembered = recallStage(stu);
      if (remembered === 9) return setScreen('check');
      if (remembered) {
        setStageNo(remembered);
        return setScreen('stage');
      }
      const firstIssue = collectIssues(loaded)[0];
      if (!firstIssue) return setScreen('check');
      setStageNo(firstIssue.stage);
      setScreen('stage');
    } catch (err) {
      if (err.status === 403) {
        setClosedInfo({ message: err.message, schedules: err.schedules || [] });
        setScreen('closed');
      } else {
        setClosedInfo({ message: err.message, schedules: [] });
        setScreen('closed');
      }
    }
  };

  const onLogin = (data) => {
    setStudent(data);
    enter(data);
  };

  // ---------------- 이동 ----------------
  const goStage = (no) => {
    flush();
    setSheet(null);
    if (no === 9) {
      rememberStage(student, 9);
      setScreen('check');
    } else {
      rememberStage(student, no);
      setStageNo(no);
      setScreen('stage');
    }
    window.scrollTo(0, 0);
  };

  const setField = (stepKey, field, value) => {
    setAnswers((prev) => ({ ...prev, [stepKey]: { ...(prev[stepKey] || {}), [field]: value } }));
  };

  // ---------------- 주제 선택·고정·변경 ----------------
  const chooseTrack = async (t) => {
    const sTrack = session.tracks.find((x) => x.code === t.code);
    if (!sTrack) return;
    setBusy(true);
    setMessage('');
    try {
      const updated = await selectTrack(student.token, enrollment.id, sTrack.id);
      setSession((s) => ({ ...s, enrollment: updated }));
      setOpened([]);
      setScreen('materials');
      window.scrollTo(0, 0);
    } catch (err) {
      if (err.status === 409) await enter(student);
      else setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmLock = async () => {
    setBusy(true);
    try {
      const updated = await lockTrack(student.token, enrollment.id);
      const next = { ...session, enrollment: updated };
      setSession(next);
      setupSaver(next, student.token);
      setModal(null);
      goStage(3);
    } catch (err) {
      setModal(null);
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmChange = async () => {
    setBusy(true);
    clearTimeout(timer.current);
    try {
      const updated = await changeTrack(student.token, enrollment.id);
      ctxRef.current = null;
      lastSaved.current = {};
      const cleared = emptyAnswers();
      answersRef.current = cleared;
      setAnswers(cleared);
      setSession((s) => ({ ...s, enrollment: updated }));
      setFlagged(new Set());
      setShowIssueList(false);
      setOpened([]);
      setSaveState('');
      setModal(null);
      setSheet(null);
      try {
        localStorage.removeItem(lastScreenKey(student));
      } catch {
        /* 무시 */
      }
      setScreen('track');
      window.scrollTo(0, 0);
    } catch (err) {
      setModal(null);
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  // ---------------- 제출 ----------------
  const issues = useMemo(() => collectIssues(answers), [answers]);
  const issuesByQuestion = useMemo(() => {
    const m = {};
    issues.forEach((i) => {
      m[i.questionId] = m[i.questionId] || [];
      m[i.questionId].push(i.reason);
    });
    return m;
  }, [issues]);

  const issueListRef = useRef(null);
  const trySubmit = async () => {
    setMessage('');
    const ok = await flush();
    if (!ok) {
      setMessage('답안을 저장하지 못해 제출하지 않았어요. 인터넷 연결을 확인하고 다시 눌러 주세요.');
      return;
    }
    const now = collectIssues(answersRef.current);
    if (now.length > 0) {
      setFlagged(new Set(now.map((i) => i.fieldId)));
      setShowIssueList(true);
      setTimeout(() => issueListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      return;
    }
    setModal('submit');
  };

  const doSubmit = async () => {
    setBusy(true);
    try {
      const ok = await flush();
      if (!ok) {
        setModal(null);
        setMessage('답안을 저장하지 못해 제출하지 않았어요. 인터넷 연결을 확인하고 다시 눌러 주세요.');
        return;
      }
      const updated = await submitFinal(student.token, enrollment.id);
      ctxRef.current = null;
      setSession((s) => ({ ...s, enrollment: updated }));
      setModal(null);
      setScreen('done');
      window.scrollTo(0, 0);
    } catch (err) {
      setModal(null);
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  const jumpTo = (issue) => {
    setFlagged((prev) => new Set([...prev, issue.fieldId]));
    goStage(issue.stage);
    setFocusTarget({ fieldId: issue.fieldId, nonce: Date.now() });
  };

  const editFrom = (stage, questionId) => {
    goStage(stage);
    setFocusTarget({ fieldId: questionId, nonce: Date.now() });
  };

  // ---------------- 화면 ----------------
  if (screen === 'previewMaterials' || screen === 'previewQuestions') {
    return (
      <PublicPreview mode={screen === 'previewMaterials' ? 'materials' : 'questions'} onBack={() => setScreen('login')} />
    );
  }

  if (screen === 'login') {
    return (
      <StudentLogin
        projectLabel={PROJECT_LABEL}
        totalSteps={TOTAL_STEPS}
        onLogin={onLogin}
        extraActions={<PreviewButtons onOpen={setScreen} />}
        topSlot={<LayoutToggle layout={layout} onChange={setLayout} />}
      />
    );
  }

  const header = (current) => (
    <ProgressHeader
      projectLabel={PROJECT_LABEL}
      currentStep={current}
      totalSteps={TOTAL_STEPS}
      studentNo={student?.studentNo}
      studentName={student?.name}
      extra={<LayoutSwitch layout={layout} onChange={setLayout} />}
    />
  );

  if (screen === 'loading') {
    return (
      <div>
        {header(0)}
        <p style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-body)' }}>불러오는 중...</p>
      </div>
    );
  }

  if (screen === 'closed') {
    return (
      <ClosedScreen
        header={header(0)}
        info={closedInfo}
        onRetry={() => enter(student)}
        onLogout={() => {
          setStudent(null);
          setScreen('login');
        }}
        onPreview={setScreen}
      />
    );
  }

  if (screen === 'record') {
    return <RecordScreen header={header(TOTAL_STEPS)} track={track} enrollment={enrollment} answers={answers} />;
  }

  if (screen === 'done') {
    return (
      <div>
        {header(TOTAL_STEPS)}
        <div style={{ padding: '22px 18px 40px' }}>
          <div style={{ ...cardStyle, textAlign: 'center', marginBottom: 18, padding: '22px 16px' }}>
            <div style={{ fontSize: 34 }}>✅</div>
            <p style={{ margin: '6px 0 4px', fontSize: 18, fontWeight: 600, color: 'var(--color-navy)' }}>
              최종 제출이 완료되었어요
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-body)', lineHeight: 1.6 }}>
              수고했어요! 제출한 답안은 더 이상 수정할 수 없어요.
              <br />
              아래에서 내가 쓴 내용을 다시 볼 수 있어요.
            </p>
          </div>
          {track && <TrackBadge track={track} />}
          <AnswerSummary track={track} answers={answers} />
        </div>
      </div>
    );
  }

  // ---- 시작 안내 ----
  if (screen === 'intro') {
    return (
      <div>
        {header(0)}
        <div style={{ padding: '20px 18px 40px' }}>
          <h3 style={{ color: 'var(--color-navy)', fontSize: 19, fontWeight: 600, margin: '0 0 8px' }}>
            생활 속 문제, 조례로 답하다
          </h3>
          <p style={{ fontSize: 13.5, color: 'var(--color-text-body)', lineHeight: 1.7, margin: '0 0 14px' }}>
            □□시 시민이 되어, 6개 생활 문제 중 하나를 골라 <b>그 문제를 해결할 조례</b>를 직접 만들어 봅니다.
          </p>
          <CityNotice />
          <div style={{ ...cardStyle, marginBottom: 14 }}>
            <p style={{ margin: '0 0 8px', fontSize: 13.5, fontWeight: 600, color: 'var(--color-navy)' }}>진행 방법</p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.75, color: 'var(--color-text-body)' }}>
              <li>1차시: 주제를 고르고 자료를 꼼꼼히 읽어요. (여유가 있으면 3단계 시작)</li>
              <li>2차시: 3~8단계 질문에 답하고, 내 답안을 확인한 뒤 최종 제출해요.</li>
              <li>쓰는 내용은 자동으로 저장돼요. 다음 시간에 로그인하면 이어서 쓸 수 있어요.</li>
              <li>3~8단계는 글자 수와 상관없이 자유롭게 앞뒤로 이동할 수 있어요.</li>
              <li>최종 제출할 때 모든 문항의 최소 글자 수를 채웠는지 확인해요.</li>
            </ul>
          </div>
          <details style={{ ...cardStyle, marginBottom: 18 }}>
            <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--color-teal)' }}>
              📋 전체 질문 미리 보기
            </summary>
            <div style={{ marginTop: 12 }}>
              <QuestionList track={null} />
            </div>
          </details>
          <button onClick={() => setScreen('track')} style={primaryButton(true)}>
            시작하기 → 1단계 주제 선택
          </button>
        </div>
      </div>
    );
  }

  // ---- 1단계 주제 선택 ----
  if (screen === 'track') {
    return (
      <div>
        {header(1)}
        {sheet === 'questions' && (
          <Sheet title="전체 질문 보기" onClose={() => setSheet(null)}>
            <QuestionList track={null} />
          </Sheet>
        )}
        <div style={{ padding: '18px 18px 40px' }}>
          <StageTitle no={1} title="주제 선택" />
          <CityNotice />
          <p style={{ fontSize: 13, color: 'var(--color-text-body)', lineHeight: 1.6, margin: '0 0 12px' }}>
            해결하고 싶은 문제를 하나 고르세요. 2단계에서 자료를 읽어 보고 다시 바꿀 수 있어요.
          </p>
          {message && <ErrorLine text={message} />}
          <TrackCards selectedCode={track?.code} onSelect={chooseTrack} busy={busy} />
          <button onClick={() => setSheet('questions')} style={{ ...linkButton, marginTop: 16 }}>
            📋 전체 질문 미리 보기
          </button>
        </div>
      </div>
    );
  }

  // ---- 2단계 배경 자료 ----
  if (screen === 'materials') {
    if (!track) return null;
    const unread = MATERIAL_KEYS.filter((k) => !opened.includes(k)).length;
    return (
      <div>
        {header(2)}
        {locked && <TopicBanner track={track} onChange={() => setModal('change1')} />}
        {modal === 'lock' && (
          <ConfirmModal
            message={'다음으로 넘어가면 이 주제로 고정됩니다.\n나중에 바꾸면 작성한 내용이 모두 삭제됩니다.'}
            yesLabel="확인"
            noLabel="취소"
            busy={busy}
            onYes={confirmLock}
            onNo={() => setModal(null)}
          />
        )}
        <ChangeModals modal={modal} setModal={setModal} busy={busy} onConfirm={confirmChange} />
        <div style={{ padding: '18px 18px 40px' }}>
          <StageTitle no={2} title="배경 자료" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <TrackBadge track={track} inline />
            {!locked && (
              <button onClick={() => setScreen('track')} style={linkButton}>
                ← 주제 다시 고르기
              </button>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-body)', lineHeight: 1.6, margin: '0 0 12px' }}>
            자료 5종을 하나씩 눌러 읽어 보세요. 3단계부터는 이 자료를 근거로 답을 써요.
          </p>
          {message && <ErrorLine text={message} />}
          <MaterialsAccordion
            track={track}
            opened={opened}
            onOpen={(k) => setOpened((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]))}
          />
          {!locked && unread > 0 && (
            <p style={{ fontSize: 12.5, color: 'var(--color-coral)', margin: '4px 0 10px' }}>
              아직 열어 보지 않은 자료가 {unread}개 있어요.
            </p>
          )}
          <button
            onClick={() => (locked ? goStage(3) : setModal('lock'))}
            style={{ ...primaryButton(true), marginTop: 6 }}
          >
            다음: 3단계 문제 인식으로 →
          </button>
        </div>
      </div>
    );
  }

  // ---- 3~8단계, 내 답안 전체 확인 ----
  const onCheck = screen === 'check';
  const stage = onCheck ? null : stageByNo(stageNo);
  if (!track) return null;

  return (
    <div>
      {header(onCheck ? TOTAL_STEPS : stageNo)}
      <TopicBanner track={track} onChange={() => setModal('change1')} />
      <ChangeModals modal={modal} setModal={setModal} busy={busy} onConfirm={confirmChange} />
      {modal === 'submit' && (
        <ConfirmModal
          message={'최종 제출하시겠습니까?\n제출하면 더 이상 수정할 수 없어요.'}
          yesLabel="제출하기"
          noLabel="취소"
          busy={busy}
          onYes={doSubmit}
          onNo={() => setModal(null)}
        />
      )}
      {sheet === 'materials' && (
        <Sheet title={`자료 다시 보기 · ${track.short}`} onClose={() => setSheet(null)}>
          {MATERIAL_KEYS.map((k) => (
            <MaterialCard key={k} track={track} mkey={k} />
          ))}
        </Sheet>
      )}
      {sheet === 'questions' && (
        <Sheet title="전체 질문 보기" onClose={() => setSheet(null)}>
          <QuestionList track={track} />
        </Sheet>
      )}
      {sheet === 'answers' && (
        <Sheet title="내 답변 다시 보기" onClose={() => setSheet(null)}>
          <AnswerSummary track={track} answers={answers} />
        </Sheet>
      )}

      <StageNav current={onCheck ? 9 : stageNo} issues={issues} onGo={goStage} />
      <Toolbar onOpen={setSheet} saveState={saveState} saveError={saveError} />

      <div style={{ padding: '6px 18px 40px' }}>
        {message && <ErrorLine text={message} />}

        {!onCheck && stage && (
          <>
            <StageTitle no={stage.no} title={stage.title} />
            <p style={{ fontSize: 13, color: 'var(--color-text-body)', lineHeight: 1.6, margin: '0 0 14px' }}>
              {stage.intro}
            </p>
            {stage.showOpponent && (
              <div style={{ ...cardStyle, marginBottom: 14, background: '#FFF9F6' }}>
                <p style={{ margin: '0 0 8px', fontSize: 12.5, fontWeight: 600, color: 'var(--color-coral)' }}>
                  📎 반대 측 인터뷰 다시 보기
                </p>
                <MaterialBody track={track} mkey="m3" />
              </div>
            )}
            {stage.questions.map((q) =>
              q.type === 'evidence' ? (
                <EvidenceQuestion
                  key={q.id}
                  q={q}
                  track={track}
                  answer={answers[stage.stepKey]}
                  onChange={(next) => setAnswers((prev) => ({ ...prev, [stage.stepKey]: next }))}
                  flagged={flagged}
                  focusTarget={focusTarget}
                />
              ) : (
                <TextQuestion
                  key={q.id}
                  q={q}
                  track={track}
                  value={answers[stage.stepKey]?.[q.field] || ''}
                  onChange={(v) => setField(stage.stepKey, q.field, v)}
                  flagged={flagged.has(q.id)}
                  focusTarget={focusTarget}
                />
              )
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                onClick={() => (stage.no === 3 ? (flush(), setScreen('materials')) : goStage(stage.no - 1))}
                style={{ ...secondaryButton, flex: 1 }}
              >
                ← {stage.no === 3 ? '2단계 자료' : `${stage.no - 1}단계`}
              </button>
              <button onClick={() => goStage(stage.no + 1)} style={{ ...primaryButton(true), flex: 1.4 }}>
                {stage.no === 8 ? '내 답안 전체 확인 →' : `${stage.no + 1}단계 →`}
              </button>
            </div>
          </>
        )}

        {onCheck && (
          <>
            <h3 style={{ color: 'var(--color-navy)', fontSize: 18, fontWeight: 600, margin: '8px 0 6px' }}>
              내 답안 전체 확인
            </h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-body)', lineHeight: 1.6, margin: '0 0 14px' }}>
              제출 전에 내가 쓴 답을 한 번에 확인하세요. <b style={{ color: 'var(--color-coral)' }}>부족</b> 표시가 있는 문항은
              [수정하기]를 눌러 고칠 수 있어요.
            </p>

            {showIssueList && (
              <div ref={issueListRef}>
                <IssueList
                  issues={issues}
                  onJump={jumpTo}
                  isTestClass={isTestClass}
                  onForceSubmit={() => setModal('submit')}
                />
              </div>
            )}

            <AnswerSummary track={track} answers={answers} issuesByQuestion={issuesByQuestion} onEdit={editFrom} />

            <button onClick={trySubmit} style={{ ...primaryButton(true), marginTop: 6 }}>
              최종 제출
            </button>
            <button onClick={() => goStage(8)} style={{ ...secondaryButton, marginTop: 10 }}>
              ← 8단계로 돌아가기
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 작은 화면 조각들
// ============================================================

function PreviewButtons({ onOpen }) {
  const btn = {
    flex: 1,
    background: '#FFFFFF',
    color: 'var(--color-teal)',
    border: '1.5px solid var(--color-teal)',
    borderRadius: 'var(--radius-button)',
    padding: '12px 8px',
    fontSize: 13.5,
    fontWeight: 500,
  };
  return (
    <div style={{ marginTop: 18 }}>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', margin: '0 0 8px' }}>
        로그인 없이 미리 보기 (읽기 전용)
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => onOpen('previewMaterials')} style={btn}>
          📚 주제별 자료 보기
        </button>
        <button type="button" onClick={() => onOpen('previewQuestions')} style={btn}>
          📋 주제별 질문 보기
        </button>
      </div>
    </div>
  );
}

function StageTitle({ no, title }) {
  return (
    <h3 style={{ color: 'var(--color-navy)', fontSize: 18, fontWeight: 600, margin: '6px 0 8px' }}>
      <span style={{ color: 'var(--color-teal)', fontSize: 14, marginRight: 6 }}>{no}단계</span>
      {title}
    </h3>
  );
}

function ErrorLine({ text }) {
  return (
    <p
      style={{
        background: '#FBE7E1',
        color: 'var(--color-coral)',
        fontSize: 13,
        padding: '10px 12px',
        borderRadius: 8,
        margin: '0 0 12px',
      }}
    >
      {text}
    </p>
  );
}

function TrackBadge({ track, inline }) {
  return (
    <div
      style={{
        display: inline ? 'inline-block' : 'block',
        background: 'var(--color-navy)',
        color: 'var(--color-navy-text-on)',
        borderRadius: 10,
        padding: '8px 12px',
        marginBottom: inline ? 0 : 14,
        fontSize: 13.5,
        fontWeight: 600,
      }}
    >
      {track.icon} {track.short}
    </div>
  );
}

function TopicBanner({ track, onChange }) {
  return (
    <div
      style={{
        background: '#EAF3F1',
        borderBottom: '1px solid var(--color-border)',
        padding: '9px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span style={{ flex: 1, fontSize: 12.5, color: 'var(--color-navy)', lineHeight: 1.45 }}>
        📌 '{track.short}' 주제로 고정되어 있습니다.
      </span>
      <button
        onClick={onChange}
        style={{
          flexShrink: 0,
          background: '#FFFFFF',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 12,
          color: 'var(--color-navy)',
        }}
      >
        주제 변경하기
      </button>
    </div>
  );
}

function ChangeModals({ modal, setModal, busy, onConfirm }) {
  if (modal === 'change1') {
    return (
      <ConfirmModal
        message={'주제를 변경하시겠습니까?\n변경하면 현재까지 작성된 내용은 삭제됩니다.'}
        danger
        onYes={() => setModal('change2')}
        onNo={() => setModal(null)}
      />
    );
  }
  if (modal === 'change2') {
    return <ConfirmModal message="정말 주제를 변경하겠습니까?" danger busy={busy} onYes={onConfirm} onNo={() => setModal(null)} />;
  }
  return null;
}

function StageNav({ current, issues, onGo }) {
  const incomplete = new Set(issues.map((i) => i.stage));
  const items = [...STAGES.map((s) => ({ no: s.no, label: String(s.no) })), { no: 9, label: '확인' }];
  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        padding: '10px 14px 4px',
        overflowX: 'auto',
      }}
    >
      {items.map((it) => {
        const active = it.no === current;
        const done = it.no <= 8 && !incomplete.has(it.no);
        return (
          <button
            key={it.no}
            onClick={() => onGo(it.no)}
            aria-label={it.no === 9 ? '내 답안 전체 확인' : `${it.no}단계로 이동`}
            style={{
              flexShrink: 0,
              minWidth: it.no === 9 ? 52 : 40,
              height: 36,
              borderRadius: 999,
              border: `1.5px solid ${active ? 'var(--color-navy)' : 'var(--color-border)'}`,
              background: active ? 'var(--color-navy)' : '#FFFFFF',
              color: active ? 'var(--color-navy-text-on)' : 'var(--color-navy)',
              fontSize: 13,
              fontWeight: 600,
              position: 'relative',
            }}
          >
            {it.label}
            {done && (
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

function Toolbar({ onOpen, saveState, saveError }) {
  const btn = {
    background: '#FFFFFF',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: '6px 9px',
    fontSize: 12,
    color: 'var(--color-navy)',
  };
  return (
    <div style={{ display: 'flex', gap: 6, padding: '6px 14px 6px', alignItems: 'center', flexWrap: 'wrap' }}>
      <button onClick={() => onOpen('materials')} style={btn}>
        📎 자료 다시 보기
      </button>
      <button onClick={() => onOpen('questions')} style={btn}>
        📋 전체 질문
      </button>
      <button onClick={() => onOpen('answers')} style={btn}>
        📝 내 답변
      </button>
      <span style={{ marginLeft: 'auto', fontSize: 11, color: saveState === 'error' ? 'var(--color-coral)' : 'var(--color-text-muted)' }}>
        {saveState === 'saving' && '저장 중...'}
        {saveState === 'saved' && '✓ 자동 저장됨'}
        {saveState === 'error' && `저장 실패: ${saveError}`}
      </span>
    </div>
  );
}

function Hints({ items }) {
  return (
    <div
      style={{
        margin: '0 0 8px',
        padding: '8px 11px',
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
      }}
    >
      <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-teal)', margin: '0 0 3px' }}>💡 참고 질문</p>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {items.map((h, i) => (
          <li key={i} style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--color-text-body)' }}>
            {h}
          </li>
        ))}
      </ul>
    </div>
  );
}

function useFocus(ref, fieldId, focusTarget) {
  useEffect(() => {
    if (!focusTarget || focusTarget.fieldId !== fieldId || !ref.current) return;
    const el = ref.current;
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget?.nonce]);
}

const textareaStyle = (bad) => ({
  width: '100%',
  border: `${bad ? 2 : 1}px solid ${bad ? 'var(--color-coral)' : 'var(--color-border)'}`,
  borderRadius: 8,
  padding: 10,
  fontSize: 16, // 아이폰은 16px보다 작은 입력칸을 누르면 화면을 확대하므로 16px로 맞춘다
  lineHeight: 1.6,
  fontFamily: 'var(--font-family)',
  resize: 'vertical',
  background: bad ? '#FFF7F4' : '#FFFFFF',
});

function Counter({ text, min }) {
  const len = countChars(text);
  const abuse = len >= min && hasRepeatedCharacterAbuse(text);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 12 }}>
      <span style={{ color: len >= min && !abuse ? 'var(--color-teal)' : 'var(--color-text-muted)' }}>
        {len} / {min}자 {len >= min && !abuse ? '✓' : ''}
      </span>
      {abuse && <span style={{ color: 'var(--color-coral)' }}>같은 글자가 반복되고 있어요</span>}
    </div>
  );
}

function TextQuestion({ q, track, value, onChange, flagged, focusTarget }) {
  const ref = useRef(null);
  const [showLaw, setShowLaw] = useState(false);
  useFocus(ref, q.id, focusTarget);
  const bad = flagged && !!textIssue(value, q.min);
  return (
    <div style={{ ...cardStyle, marginBottom: 14 }}>
      {q.notice && (
        <div
          style={{
            background: '#EAF3F1',
            color: 'var(--color-teal)',
            fontSize: 12.5,
            fontWeight: 500,
            borderRadius: 8,
            padding: '8px 10px',
            marginBottom: 10,
          }}
        >
          ℹ️ {q.notice}
        </div>
      )}
      <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.6, color: 'var(--color-navy)', fontWeight: 500 }}>
        <b>{q.id}.</b> {q.label && <span style={{ color: 'var(--color-teal)' }}>[{q.label}] </span>}
        {q.prompt}
      </p>
      {q.showLaw && (
        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => setShowLaw((v) => !v)}
            style={{
              background: '#FFFFFF',
              border: '1.5px solid var(--color-teal)',
              color: 'var(--color-teal)',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            ⚖️ 관련 상위법 다시 보기 {showLaw ? '▲' : '▼'}
          </button>
          {showLaw && (
            <div style={{ marginTop: 8, padding: 12, background: 'var(--color-bg)', borderRadius: 8 }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--color-teal)' }}>
                {materialTitle(track, 'm5')}
              </p>
              <MaterialBody track={track} mkey="m5" />
            </div>
          )}
        </div>
      )}
      <Hints items={hintsFor(q, track)} />
      <textarea
        ref={ref}
        id={`field-${q.id}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={q.rows || 4}
        placeholder="여기에 답을 써 보세요."
        style={textareaStyle(bad)}
      />
      <Counter text={value} min={q.min} />
    </div>
  );
}

function EvidenceQuestion({ q, track, answer, onChange, flagged, focusTarget }) {
  const firstRef = useRef(null);
  useFocus(firstRef, '6-1', focusTarget);
  const checked = answer?.checked || [];
  const reasons = answer?.reasons || {};
  const problems = evidenceIssues(answer, q.min);
  const noneChecked = flagged.has('6-1') && problems.some((p) => p.fieldId === '6-1');

  const toggle = (k) => {
    const next = checked.includes(k) ? checked.filter((x) => x !== k) : MATERIAL_KEYS.filter((x) => x === k || checked.includes(x));
    onChange({ ...(answer || {}), checked: next, reasons });
  };
  const setReason = (k, v) => onChange({ ...(answer || {}), checked, reasons: { ...reasons, [k]: v } });

  return (
    <div style={{ ...cardStyle, marginBottom: 14, borderColor: noneChecked ? 'var(--color-coral)' : 'var(--color-border)', borderWidth: noneChecked ? 2 : 1 }}>
      <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.6, color: 'var(--color-navy)', fontWeight: 500 }}>
        <b>{q.id}.</b> {q.prompt}
      </p>
      <Hints items={hintsFor(q, track)} />
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 8px' }}>
        근거로 쓸 자료를 체크하면 설명 칸이 열려요. (체크한 자료마다 {q.min}자 이상)
      </p>
      {MATERIAL_KEYS.map((k, idx) => (
        <EvidenceRow
          key={k}
          k={k}
          idx={idx}
          track={track}
          isChecked={checked.includes(k)}
          onToggle={() => toggle(k)}
          reason={reasons[k] || ''}
          onReason={(v) => setReason(k, v)}
          min={q.min}
          inputRef={idx === 0 ? firstRef : null}
          flagged={flagged.has(`6-1-${k}`)}
          focusTarget={focusTarget}
        />
      ))}
    </div>
  );
}

function EvidenceRow({ k, track, isChecked, onToggle, reason, onReason, min, inputRef, flagged, focusTarget }) {
  const [peek, setPeek] = useState(false);
  const ref = useRef(null);
  useFocus(ref, `6-1-${k}`, focusTarget);
  const bad = flagged && isChecked && !!textIssue(reason, min);
  return (
    <div
      style={{
        border: `1px solid ${isChecked ? 'var(--color-teal)' : 'var(--color-border)'}`,
        borderRadius: 10,
        padding: '10px 12px',
        marginBottom: 8,
        background: isChecked ? '#F4FAF8' : '#FFFFFF',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          ref={inputRef}
          type="checkbox"
          id={`check-${k}`}
          checked={isChecked}
          onChange={onToggle}
          style={{ width: 20, height: 20, accentColor: 'var(--color-teal)' }}
        />
        <label htmlFor={`check-${k}`} style={{ flex: 1, fontSize: 13.5, color: 'var(--color-navy)', fontWeight: 500 }}>
          {materialTitle(track, k)}
        </label>
        <button onClick={() => setPeek((v) => !v)} style={{ ...linkButton, fontSize: 12 }}>
          {peek ? '접기' : '내용 보기'}
        </button>
      </div>
      {peek && (
        <div style={{ marginTop: 8, padding: 10, background: 'var(--color-bg)', borderRadius: 8 }}>
          <MaterialBody track={track} mkey={k} />
        </div>
      )}
      {isChecked && (
        <div style={{ marginTop: 8 }}>
          <textarea
            ref={ref}
            id={`field-6-1-${k}`}
            value={reason}
            onChange={(e) => onReason(e.target.value)}
            rows={3}
            placeholder="이 자료가 왜, 어떻게 내 조례를 뒷받침하나요?"
            style={textareaStyle(bad)}
          />
          <Counter text={reason} min={min} />
        </div>
      )}
    </div>
  );
}

function IssueList({ issues, onJump, isTestClass, onForceSubmit }) {
  if (issues.length === 0) {
    return (
      <div style={{ ...cardStyle, borderColor: 'var(--color-teal)', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-teal)', fontWeight: 600 }}>
          ✓ 부족한 문항이 모두 채워졌어요. 아래 [최종 제출]을 다시 눌러 주세요.
        </p>
      </div>
    );
  }
  return (
    <div style={{ ...cardStyle, border: '2px solid var(--color-coral)', marginBottom: 18, background: '#FFF9F7' }}>
      <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--color-coral)' }}>
        ⚠️ 아직 부족한 문항 ({issues.length}개)
      </p>
      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--color-text-body)' }}>
        아래 문항을 채워야 제출할 수 있어요. [바로 가기]를 누르면 그 칸으로 이동해요.
      </p>
      {issues.map((i, idx) => (
        <div
          key={`${i.fieldId}-${idx}`}
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            padding: '9px 0',
            borderTop: idx === 0 ? 'none' : '1px solid #F0D8D0',
          }}
        >
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-navy)', lineHeight: 1.45 }}>{i.label}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--color-coral)', fontWeight: 500 }}>{i.reason}</p>
          </div>
          <button
            onClick={() => onJump(i)}
            style={{
              flexShrink: 0,
              background: 'var(--color-coral)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              padding: '7px 10px',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            바로 가기
          </button>
        </div>
      ))}
      {isTestClass && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--color-border)' }}>
          <p style={{ margin: '0 0 6px', fontSize: 11.5, color: 'var(--color-text-muted)' }}>테스트반 전용: 조건과 상관없이 제출해 볼 수 있어요.</p>
          <button onClick={onForceSubmit} style={{ ...secondaryButton, borderColor: 'var(--color-coral)', color: 'var(--color-coral)' }}>
            그래도 제출
          </button>
        </div>
      )}
    </div>
  );
}

function ClosedScreen({ header, info, onRetry, onLogout, onPreview }) {
  return (
    <div>
      {header}
      <div style={{ padding: '26px 18px 40px' }}>
        <div style={{ ...cardStyle, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 30 }}>⏰</div>
          <p style={{ margin: '6px 0 8px', fontSize: 16, fontWeight: 600, color: 'var(--color-navy)' }}>
            {info?.message || '지금은 응시 시간이 아닙니다.'}
          </p>
          {info?.schedules?.length > 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--color-text-body)', lineHeight: 1.7 }}>
              <p style={{ margin: '0 0 2px', fontWeight: 600 }}>우리 반 응시 시간</p>
              {info.schedules.map((s) => (
                <div key={s.id}>
                  {s.session_no}차시: {formatKST(s.starts_at)} ~ {formatKST(s.ends_at).split(' ').pop()}
                </div>
              ))}
            </div>
          )}
          <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--color-text-muted)' }}>
            응시 시간 전에도 아래 버튼으로 자료와 질문을 미리 볼 수 있어요.
          </p>
        </div>
        <PreviewButtons onOpen={onPreview} />
        <button onClick={onRetry} style={{ ...primaryButton(true), marginTop: 18 }}>
          다시 시도
        </button>
        <button onClick={onLogout} style={{ ...secondaryButton, marginTop: 10 }}>
          처음 화면으로
        </button>
      </div>
    </div>
  );
}

function RecordScreen({ header, track, enrollment, answers }) {
  return (
    <div>
      {header}
      <div style={{ padding: '20px 18px 40px' }}>
        <h3 style={{ color: 'var(--color-navy)', fontSize: 19, fontWeight: 600, margin: '0 0 6px' }}>나의 수행평가 기록</h3>
        <p style={{ fontSize: 12.5, color: 'var(--color-text-body)', lineHeight: 1.6, margin: '0 0 14px' }}>
          수행평가가 끝나 보기만 할 수 있어요. 내가 고른 주제의 자료와 내가 쓴 답을 순서대로 볼 수 있어요.
        </p>
        {!enrollment || !track ? (
          <div style={cardStyle}>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-text-muted)' }}>이 수행평가에 남은 기록이 없어요.</p>
          </div>
        ) : (
          <>
            <TrackBadge track={track} />
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
              {enrollment.submitted_at ? `제출: ${formatKST(enrollment.submitted_at)}` : '최종 제출하지 않은 기록이에요.'}
            </p>
            <p style={{ margin: '0 0 8px', fontSize: 14.5, fontWeight: 600, color: 'var(--color-navy)' }}>2단계 · 배경 자료</p>
            {MATERIAL_KEYS.map((k) => (
              <MaterialCard key={k} track={track} mkey={k} defaultOpen={false} />
            ))}
            <div style={{ height: 8 }} />
            <AnswerSummary track={track} answers={answers} />
          </>
        )}
      </div>
    </div>
  );
}
