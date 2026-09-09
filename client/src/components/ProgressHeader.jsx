// src/components/ProgressHeader.jsx
// 모든 STEP 화면 상단에 공통으로 쓰이는 헤더.
// 프로젝트명, 로그인한 학생 정보(학번·이름), 진행 표시(현재/전체)를 보여준다.

export default function ProgressHeader({ projectLabel, currentStep, totalSteps, studentNo, studentName }) {
  return (
    <div
      style={{
        background: 'var(--color-navy)',
        padding: '10px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ color: 'var(--color-border)', fontSize: 11, letterSpacing: 0.3 }}>
        {projectLabel}
      </span>

      <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
        {studentName && (
          <div style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 500 }}>
            {studentNo} {studentName}
          </div>
        )}
        <div style={{ color: 'var(--color-text-muted)', fontSize: 10.5 }}>
          {currentStep} / {totalSteps}
        </div>
      </div>
    </div>
  );
}
