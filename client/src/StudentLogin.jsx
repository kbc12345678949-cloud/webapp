// src/StudentLogin.jsx
import { useState } from 'react';
import ProgressHeader from './components/ProgressHeader';
import { studentLogin } from './api';

const CLASS_OPTIONS = ['2학년 1반', '2학년 2반', '2학년 3반'];

export default function StudentLogin({ onLogin }) {
  const [className, setClassName] = useState(CLASS_OPTIONS[0]);
  const [studentNo, setStudentNo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState('form'); // 'form' | 'confirm'
  const [confirmedData, setConfirmedData] = useState(null); // 서버가 돌려준 {token, name, className}

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!studentNo.trim()) {
      setError('학번을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const data = await studentLogin(className, studentNo.trim());
      setConfirmedData(data);
      setPhase('confirm');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setPhase('form');
    setConfirmedData(null);
    setStudentNo('');
  };

  if (phase === 'confirm') {
    return (
      <div>
        <ProgressHeader projectLabel="TF팀 브리핑" currentStep={0} totalSteps={9} />
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-body)', fontSize: 13, margin: '0 0 10px' }}>
            아래 정보로 로그인하려고 합니다
          </p>
          <p style={{ color: 'var(--color-navy)', fontSize: 22, fontWeight: 600, margin: '0 0 6px' }}>
            {studentNo} {confirmedData.name}
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: '0 0 30px' }}>
            {confirmedData.className}
          </p>
          <p style={{ color: 'var(--color-navy)', fontSize: 15, fontWeight: 500, margin: '0 0 24px' }}>
            {studentNo} {confirmedData.name} 학생이 맞습니까?
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={goBack}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 'var(--radius-button)',
                border: '1.5px solid var(--color-border)',
                background: '#FFFFFF',
                color: 'var(--color-text)',
                fontSize: 15,
              }}
            >
              뒤로가기
            </button>
            <button
              onClick={() => onLogin({ ...confirmedData, studentNo })}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 'var(--radius-button)',
                border: 'none',
                background: 'var(--color-navy)',
                color: 'var(--color-navy-text-on)',
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              계속 로그인하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ProgressHeader projectLabel="TF팀 브리핑" currentStep={0} totalSteps={9} />

      <form onSubmit={submit} style={{ padding: '32px 20px' }}>
        <h3 style={{ color: 'var(--color-navy)', fontSize: 18, fontWeight: 500, margin: '0 0 6px' }}>
          로그인
        </h3>
        <p style={{ color: 'var(--color-text-body)', fontSize: 13, margin: '0 0 22px' }}>
          반을 선택하고 학번을 입력해주세요. 비밀번호는 따로 없습니다.
        </p>

        <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-navy)' }}>반</label>
        <select
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          style={{
            width: '100%',
            padding: 12,
            marginTop: 6,
            marginBottom: 16,
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'var(--font-family)',
            background: 'var(--color-card)',
          }}
        >
          {CLASS_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-navy)' }}>학번</label>
        <input
          type="text"
          inputMode="numeric"
          value={studentNo}
          onChange={(e) => setStudentNo(e.target.value)}
          placeholder="예: 2103"
          style={{
            width: '100%',
            padding: 12,
            marginTop: 6,
            marginBottom: 16,
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'var(--font-family)',
          }}
        />

        {error && (
          <p style={{ color: 'var(--color-coral)', fontSize: 13, marginBottom: 14 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            background: 'var(--color-navy)',
            color: 'var(--color-navy-text-on)',
            border: 'none',
            borderRadius: 'var(--radius-button)',
            padding: 14,
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          {loading ? '확인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
}
