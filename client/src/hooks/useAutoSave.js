// src/hooks/useAutoSave.js
// STEP3·5·7·8·9가 공통으로 쓰는 자동 저장 로직.
// payload가 바뀌면 800ms 뒤 실제 서버에 저장하고, 상태('saving'|'saved'|'error')를 돌려준다.
import { useState, useRef, useEffect } from 'react';
import { saveResponse } from '../api';

export function useAutoSave(token, enrollmentId, stepId, payload, { skip = false } = {}) {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const timer = useRef(null);
  const payloadRef = useRef(payload);
  payloadRef.current = payload;
  const serializedPayload = JSON.stringify(payload);

  useEffect(() => {
    if (skip || !token || !enrollmentId || !stepId) return;
    setStatus('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await saveResponse(token, enrollmentId, stepId, payloadRef.current);
        setStatus('saved');
        setError('');
      } catch (err) {
        setStatus('error');
        setError(err.message);
      }
    }, 800);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedPayload, token, enrollmentId, stepId, skip]);

  return { status, error };
}
