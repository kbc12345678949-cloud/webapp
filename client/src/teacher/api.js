// src/teacher/api.js
// 백엔드 주소는 배포 시 환경변수(VITE_API_BASE)로 바뀐다. 테스트에서는 주입 가능하도록 함수로 감쌈.
let BASE_URL = import.meta.env?.VITE_API_BASE || '';

export function setApiBase(url) {
  BASE_URL = url;
}

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}

async function requestText(path, { method = 'POST', token, text } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'text/csv',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: text,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}

export const teacherApi = {
  login: (username, password) => request('/api/teacher/login', { method: 'POST', body: { username, password } }),
  uploadStudents: (token, csvText) => requestText('/api/teacher/students/upload', { token, text: csvText }),
  getClasses: (token) => request('/api/teacher/classes', { token }),
  getSchedules: (token, projectId) => request(`/api/teacher/schedules/${projectId}`, { token }),
  putSchedule: (token, projectId, payload) =>
    request(`/api/teacher/schedules/${projectId}`, { method: 'PUT', token, body: payload }),
  toggleSchedule: (token, scheduleId, open) =>
    request(`/api/teacher/schedules/${scheduleId}/toggle`, { method: 'POST', token, body: { open } }),
  getDistribution: (token, projectId, stepKey) =>
    request(`/api/teacher/distribution/${projectId}/${stepKey}`, { token }),
  getProgress: (token, projectId, classId) => request(`/api/teacher/progress/${projectId}/${classId}`, { token }),
  getResponses: (token, enrollmentId) => request(`/api/teacher/responses/${enrollmentId}`, { token }),
  getRubric: (token, projectId) => request(`/api/teacher/rubric/${projectId}`, { token }),
  getGrades: (token, projectId, enrollmentId) =>
    request(`/api/teacher/grades/${projectId}/${enrollmentId}`, { token }),
  saveGrade: (token, enrollmentId, rubricItemId, score) =>
    request(`/api/teacher/grades/${enrollmentId}/${rubricItemId}`, { method: 'PUT', token, body: { score } }),
  exportResults: async (token, projectId, classId) => {
    const res = await fetch(`${BASE_URL}/api/teacher/export/${projectId}/${classId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`다운로드 실패 (${res.status})`);
    return res.blob();
  },
};
