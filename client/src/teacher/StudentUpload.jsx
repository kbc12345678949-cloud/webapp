// src/teacher/StudentUpload.jsx
import { useState } from 'react';
import { teacherApi } from './api';

const PLACEHOLDER = `2학년 1반,10101,김민준
2학년 1반,10102,이서연
2학년 2반,10201,박도윤`;

export default function StudentUpload({ token }) {
  const [csvText, setCsvText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await teacherApi.uploadStudents(token, csvText.trim());
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 640 }}>
      <h2 style={{ color: 'var(--color-navy)', fontSize: 19, fontWeight: 500, marginBottom: 8 }}>
        학생 명단 업로드
      </h2>
      <p style={{ color: 'var(--color-text-body)', fontSize: 13, marginBottom: 14 }}>
        한 줄에 "반이름,학번,이름" 형식으로 입력하거나, 엑셀에서 복사해 붙여넣으세요.
      </p>

      <textarea
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={10}
        style={{
          width: '100%',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: 12,
          fontSize: 13,
          fontFamily: 'monospace',
          resize: 'vertical',
          marginBottom: 12,
        }}
      />

      <button
        onClick={submit}
        disabled={loading || !csvText.trim()}
        style={{
          background: 'var(--color-navy)',
          color: 'var(--color-navy-text-on)',
          border: 'none',
          borderRadius: 8,
          padding: '10px 18px',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        {loading ? '업로드 중...' : '업로드'}
      </button>

      {error && <p style={{ color: 'var(--color-coral)', fontSize: 13, marginTop: 10 }}>{error}</p>}
      {result && (
        <p style={{ color: 'var(--color-teal)', fontSize: 13, marginTop: 10 }}>
          {result.inserted}명의 학생 정보가 등록되었습니다.
        </p>
      )}
    </div>
  );
}
