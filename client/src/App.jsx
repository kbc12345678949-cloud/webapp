// src/App.jsx
import { useState, useEffect } from 'react';
import StudentLogin from './StudentLogin';
import Step0 from './steps/Step0';
import Step1 from './steps/Step1';
import Step3 from './steps/Step3';
import Step4 from './steps/Step4';
import Step5 from './steps/Step5';
import Step6 from './steps/Step6';
import Step7 from './steps/Step7';
import Step8 from './steps/Step8';
import Step9 from './steps/Step9';
import Done from './steps/Done';
import { enterProject, fetchStakeholders } from './api';

const PROJECT_CODE = 'tourism';

// 각 스텝의 "완료 기준"을 실제로 검사한다. 응답이 존재한다고 해서 완료된 게 아니라,
// 최소 글자 수 등 제출 버튼이 활성화되는 조건을 그대로 충족해야 완료로 본다.
function isStep3Complete(a) {
  return !!(a && a.choice && (a.reason || '').trim().length >= 100);
}
function isStep5Complete(a) {
  return !!(
    a &&
    (a.decision === 'keep' || (a.decision === 'change' && a.choice)) &&
    (a.reason || '').trim().length >= 50
  );
}
function isStep7Complete(a) {
  return !!(a && (a.mitigation || '').trim().length > 0);
}
function isStep8Complete(a) {
  return !!(
    a &&
    a.finalChoice &&
    (a.coreReason || '').trim() &&
    (a.expectedProblem || '').trim() &&
    (a.mitigationPlan || '').trim()
  );
}

// 저장된 응답을 보고 어느 화면으로 돌아가야 하는지 판단한다.
// "응답이 있는지"가 아니라 "그 스텝의 완료 기준을 충족했는지"로 판단해야,
// 최소 글자 수를 못 채운 미완성 자동저장본이 있어도 그 스텝을 건너뛰지 않는다.
function resumeScreen(enrollment, r) {
  if (enrollment.submitted_at) return 'done';
  if (r.step3 === undefined) return 'step0';
  if (!isStep3Complete(r.step3)) return 'step3';
  if (r.step5 === undefined) return 'step4';
  if (!isStep5Complete(r.step5)) return 'step5';
  if (r.step7 === undefined) return 'step6';
  if (!isStep7Complete(r.step7)) return 'step7';
  if (r.step8 === undefined) return 'step8';
  if (!isStep8Complete(r.step8)) return 'step8';
  return 'step9';
}

export default function App() {
  const [screen, setScreen] = useState('login');
  const [student, setStudent] = useState(null);
  const [session, setSession] = useState(null); // { project, steps, enrollment }
  const [loadError, setLoadError] = useState('');
  const [step1Progress, setStep1Progress] = useState({ answers: {}, index: 0 });
  const [step3Answer, setStep3Answer] = useState(null);
  const [step5Answer, setStep5Answer] = useState(null);
  const [step7Answer, setStep7Answer] = useState(null);
  const [step8Answer, setStep8Answer] = useState(null);
  const [step9Answer, setStep9Answer] = useState(null);
  const [stakeholders, setStakeholders] = useState(null);
  const [stakeholderError, setStakeholderError] = useState('');

  const stepId = (key) => session?.steps.find((s) => s.step_key === key)?.id;

  const afterLogin = async (data) => {
    setStudent(data);
    setScreen('loading');
    try {
      const sessionData = await enterProject(data.token, PROJECT_CODE);
      setSession(sessionData);

      // 저장된 응답을 step_key 기준으로 정리하고, STEP3·5·7 답은 이후 화면(STEP8 등)에서
      // 바로 쓸 수 있도록 그 자리에서 복원해둔다.
      const keyById = Object.fromEntries(sessionData.steps.map((s) => [s.id, s.step_key]));
      const responseByKey = {};
      for (const r of sessionData.responses) {
        responseByKey[keyById[r.step_id]] = r.answer;
      }
      if (responseByKey.step3) setStep3Answer(responseByKey.step3);
      if (responseByKey.step5) setStep5Answer(responseByKey.step5);
      if (responseByKey.step7) setStep7Answer(responseByKey.step7);
      if (responseByKey.step8) setStep8Answer(responseByKey.step8);
      if (responseByKey.step9) setStep9Answer(responseByKey.step9);

      setScreen(resumeScreen(sessionData.enrollment, responseByKey));
    } catch (err) {
      setLoadError(err.message);
      setScreen('loadError');
    }
  };

  // 이해관계자는 STEP6·7 둘 다 같은 목록을 쓰므로, STEP6에 진입할 때 한 번만 가져와 공유한다.
  // (새로고침 후 STEP7·8로 바로 복귀하는 경우에도 필요하므로 STEP7·8 진입 시에도 함께 확인한다)
  useEffect(() => {
    if (!['step6', 'step7', 'step8', 'done'].includes(screen)) return;
    if (stakeholders || !student?.token || !session?.project.id) return;
    fetchStakeholders(student.token, session.project.id)
      .then(setStakeholders)
      .catch((err) => setStakeholderError(err.message));
  }, [screen, stakeholders, student, session]);

  if (screen === 'loading') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-body)' }}>
        불러오는 중...
      </div>
    );
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

  return (
    <div>
      {screen === 'login' && <StudentLogin onLogin={afterLogin} />}
      {screen === 'step0' && <Step0 student={student} onStart={() => setScreen('step1')} />}
      {screen === 'step1' && (
        <Step1
          student={student}
          token={student?.token}
          projectId={session?.project.id}
          stepId={stepId('step1')}
          initialAnswers={step1Progress.answers}
          initialIndex={step1Progress.index}
          onDraftChange={setStep1Progress}
          onComplete={() => setScreen('step3')}
        />
      )}
      {screen === 'step3' && (
        <Step3
          student={student}
          token={student?.token}
          enrollmentId={session?.enrollment.id}
          stepId={stepId('step3')}
          initialAnswer={step3Answer}
          onDraftChange={setStep3Answer}
          onBack={() => setScreen('step1')}
          onComplete={(data) => {
            setStep3Answer(data);
            setScreen('step4');
          }}
        />
      )}
      {screen === 'step4' && (
        <Step4
          student={student}
          token={student?.token}
          projectId={session?.project.id}
          stepId={stepId('step4')}
          previousChoice={step3Answer?.choice}
          onBack={() => setScreen('step3')}
          onComplete={() => setScreen('step5')}
        />
      )}
      {screen === 'step5' && (
        <Step5
          student={student}
          token={student?.token}
          enrollmentId={session?.enrollment.id}
          stepId={stepId('step5')}
          previousChoice={step3Answer?.choice}
          initialAnswer={step5Answer}
          onDraftChange={setStep5Answer}
          onBack={() => setScreen('step4')}
          onComplete={(data) => {
            setStep5Answer(data);
            setScreen('step6');
          }}
        />
      )}
      {screen === 'step6' && (
        <Step6
          student={student}
          stakeholders={stakeholders}
          loadError={stakeholderError}
          onBack={() => setScreen('step5')}
          onComplete={() => setScreen('step7')}
        />
      )}
      {screen === 'step7' && (
        <Step7
          student={student}
          token={student?.token}
          enrollmentId={session?.enrollment.id}
          stepId={stepId('step7')}
          stakeholders={stakeholders}
          loadError={stakeholderError}
          initialAnswer={step7Answer}
          onDraftChange={setStep7Answer}
          onBack={() => setScreen('step6')}
          onComplete={(data) => {
            setStep7Answer(data);
            setScreen('step8');
          }}
        />
      )}
      {screen === 'step8' && (
        <Step8
          student={student}
          token={student?.token}
          enrollmentId={session?.enrollment.id}
          stepId={stepId('step8')}
          stakeholders={stakeholders}
          step3Answer={step3Answer}
          step5Answer={step5Answer}
          step7Answer={step7Answer}
          initialAnswer={step8Answer}
          onDraftChange={setStep8Answer}
          onBack={() => setScreen('step7')}
          onComplete={(data) => {
            setStep8Answer(data);
            setScreen('step9');
          }}
        />
      )}
      {screen === 'step9' && (
        <Step9
          student={student}
          token={student?.token}
          enrollmentId={session?.enrollment.id}
          stepId={stepId('step9')}
          initialAnswer={step9Answer}
          onDraftChange={setStep9Answer}
          onBack={() => setScreen('step8')}
          onSubmit={() => setScreen('done')}
        />
      )}
      {screen === 'done' && (
        <Done
          student={student}
          step3Answer={step3Answer}
          step5Answer={step5Answer}
          step7Answer={step7Answer}
          step8Answer={step8Answer}
          step9Answer={step9Answer}
          stakeholders={stakeholders}
        />
      )}
    </div>
  );
}
