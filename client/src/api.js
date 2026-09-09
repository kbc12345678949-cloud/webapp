// src/api.js
// 학생용 백엔드 호출. 배포 시 VITE_API_BASE 환경변수로 실제 서버 주소가 들어간다.
let BASE_URL = import.meta.env?.VITE_API_BASE || '';

export function setApiBase(url) {
  BASE_URL = url;
}

export async function enterProject(token, projectCode) {
  const res = await fetch(`${BASE_URL}/api/student/projects/${projectCode}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data; // { project, steps, tracks, enrollment, responses }
}

export async function fetchMaterials(token, projectId, { trackId, stepId } = {}) {
  const params = new URLSearchParams();
  if (trackId) params.set('trackId', trackId);
  if (stepId) params.set('stepId', stepId);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE_URL}/api/student/projects/${projectId}/materials${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}

export async function fetchStakeholders(token, projectId, trackId) {
  const qs = trackId ? `?trackId=${trackId}` : '';
  const res = await fetch(`${BASE_URL}/api/student/projects/${projectId}/stakeholders${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}

export async function saveResponse(token, enrollmentId, stepId, answer) {
  const res = await fetch(`${BASE_URL}/api/student/enrollments/${enrollmentId}/responses/${stepId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ answer }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `저장 실패 (${res.status})`);
  return data;
}

export async function submitFinal(token, enrollmentId) {
  const res = await fetch(`${BASE_URL}/api/student/enrollments/${enrollmentId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `제출 실패 (${res.status})`);
  return data;
}
export async function studentLogin(className, studentNo) {
  const res = await fetch(`${BASE_URL}/api/student/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ className, studentNo }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `로그인 실패 (${res.status})`);
  return data; // { token, name, className }
}
