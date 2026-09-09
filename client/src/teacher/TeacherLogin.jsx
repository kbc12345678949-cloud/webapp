// src/teacher/TeacherLogin.jsx
import { useState } from 'react';
import { teacherApi } from './api';

export default function TeacherLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await teacherApi.login(username, password);
      onLogin(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '60px auto', padding: 20 }}>
      <h2 style={{ color: 'var(--color-navy)', fontSize: 20, fontWeight: 500, marginBottom: 20 }}>
        교사 로그인
      </h2>
      <form onSubmit={submit}>
        <input
          type="text"
          placeholder="아이디"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: '100%',
            padding: 12,
            marginBottom: 10,
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'var(--font-family)',
          }}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: 12,
            marginBottom: 14,
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'var(--font-family)',
          }}
        />
        {error && <p style={{ color: 'var(--color-coral)', fontSize: 13, marginBottom: 10 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            background: 'var(--color-navy)',
            color: 'var(--color-navy-text-on)',
            border: 'none',
            borderRadius: 8,
            padding: 12,
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
}
