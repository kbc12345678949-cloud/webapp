// src/teacher/ExportResults.integration.test.jsx
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { teacherApi, setApiBase } from './api';
import { spawn } from 'child_process';
import path from 'path';

const TEST_PORT = 3994;
let serverProcess;

beforeAll(async () => {
  const base = `http://localhost:${TEST_PORT}`;
  setApiBase(base);
  await new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['test_server_fullflow.js'], {
      cwd: path.resolve(__dirname, '../../../server'),
      env: { ...process.env, TEST_PORT: String(TEST_PORT) },
    });
    serverProcess.stdout.on('data', (d) => {
      if (d.toString().includes('TEST_SERVER_READY')) resolve();
    });
    serverProcess.stderr.on('data', (d) => console.error('[server]', d.toString()));
    setTimeout(() => reject(new Error('서버 부팅 타임아웃')), 8000);
  });
}, 15000);

afterAll(() => {
  serverProcess?.kill();
});

describe('결과 CSV 내보내기 ↔ 실제 서버 통합 테스트', () => {
  it('학생 로그인·채점 후 CSV를 받으면 헤더와 점수가 실제 데이터와 정확히 일치한다', async () => {
    const base = `http://localhost:${TEST_PORT}`;

    // 학생 로그인 + 진입 (enrollment 생성)
    const loginRes = await fetch(`${base}/api/student/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ className: '2학년 1반', studentNo: '2103' }),
    });
    const { token: studentToken } = await loginRes.json();
    const enterRes = await fetch(`${base}/api/student/projects/tourism`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const session = await enterRes.json();

    const { token: teacherToken } = await teacherApi.login('kim', 'teacher1234');

    // 두 항목 채점
    await teacherApi.saveGrade(teacherToken, session.enrollment.id, 1, 20);
    await teacherApi.saveGrade(teacherToken, session.enrollment.id, 2, 15);

    const blob = await teacherApi.exportResults(teacherToken, 1, 1);
    const text = await blob.text();

    expect(text).toContain('학번');
    expect(text).toContain('자료 활용 및 이해관계자 파악');
    expect(text).toContain('"2103"');
    expect(text).toContain('"김예지"');
    expect(text).toContain('"20"');
    expect(text).toContain('"15"');
    expect(text).toContain('"35"'); // 총점 20+15
  });

  it('채점 안 된 항목은 빈 칸으로 표시된다', async () => {
    const { token: teacherToken } = await teacherApi.login('kim', 'teacher1234');
    const blob = await teacherApi.exportResults(teacherToken, 1, 1);
    const text = await blob.text();
    const lines = text.split('\r\n');
    const dataLine = lines.find((l) => l.includes('2103'));
    expect(dataLine).toContain('""'); // 재판단 등 채점 안 한 항목은 빈 문자열
  });

  it('"결과 다운로드" 버튼을 실제로 누르면 다운로드 트리거(a.click)까지 정상 동작한다', async () => {
    const { render, screen, fireEvent, waitFor } = await import('@testing-library/react');
    const { default: ProgressOverview } = await import('./ProgressOverview');
    const { token: teacherToken } = await teacherApi.login('kim', 'teacher1234');

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ProgressOverview token={teacherToken} projectId={1} />);
    fireEvent.click(screen.getByText('결과 다운로드(CSV)'));

    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    clickSpy.mockRestore();
  });
});
