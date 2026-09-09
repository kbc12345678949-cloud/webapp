// src/teacher/GradingPanel.integration.test.jsx
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { spawn } from 'child_process';
import path from 'path';
import GradingPanel from './GradingPanel';
import { teacherApi, setApiBase } from './api';

const TEST_PORT = 3995;
let serverProcess;
let teacherToken;
let enrollmentId;

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

  // 학생 로그인으로 enrollment를 실제로 하나 만들어둔다
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
  enrollmentId = session.enrollment.id;

  const t = await teacherApi.login('kim', 'teacher1234');
  teacherToken = t.token;
}, 15000);

afterAll(() => {
  serverProcess?.kill();
});

describe('GradingPanel ↔ 실제 서버 통합 테스트', () => {
  it('루브릭 6개 항목이 실제 서버에서 로드되고, 초기 총점은 0점이다', async () => {
    render(<GradingPanel token={teacherToken} projectId={1} enrollmentId={enrollmentId} studentName="김예지" />);
    expect(await screen.findByText(/자료 활용 및 이해관계자 파악/)).toBeInTheDocument();
    expect(screen.getByText(/^성찰/)).toBeInTheDocument();
    expect(screen.getByText('총점 0점')).toBeInTheDocument();

    // 아직 채점 안 한 항목은 "미제출" 버튼이 기본으로 활성 표시되어야 한다
    const firstItemCard = screen.getByText(/자료 활용 및 이해관계자 파악/).closest('div');
    const noneButton = within(firstItemCard).getByText('미제출(0점)');
    expect(noneButton.style.background).toContain('navy');
  });

  it('"상"을 누르면 실제 서버에 저장되고 총점이 즉시 반영된다', async () => {
    render(<GradingPanel token={teacherToken} projectId={1} enrollmentId={enrollmentId} studentName="김예지" />);
    await screen.findByText(/자료 활용 및 이해관계자 파악/);

    const firstItemCard = screen.getByText(/자료 활용 및 이해관계자 파악/).closest('div');
    fireEvent.click(within(firstItemCard).getByText('상 (20)'));

    await waitFor(() => expect(screen.getByText('총점 20점')).toBeInTheDocument());

    // 실제 서버에 정말 저장됐는지 API로 다시 확인
    const check = await teacherApi.getGrades(teacherToken, 1, enrollmentId);
    expect(check.items[0].score).toBe(20);
    expect(check.total).toBe(20);
  });

  it('등급을 바꾸면(상→하) 총점도 실제로 다시 계산된다', async () => {
    render(<GradingPanel token={teacherToken} projectId={1} enrollmentId={enrollmentId} studentName="김예지" />);
    const firstItemCard = await screen.findByText(/자료 활용 및 이해관계자 파악/).then((el) => el.closest('div'));

    fireEvent.click(within(firstItemCard).getByText('하 (5)'));
    await waitFor(() => expect(screen.getByText('총점 5점')).toBeInTheDocument());

    const check = await teacherApi.getGrades(teacherToken, 1, enrollmentId);
    expect(check.items[0].score).toBe(5);
  });

  it('여러 항목을 채점하면 합계가 정확히 누적된다', async () => {
    render(<GradingPanel token={teacherToken} projectId={1} enrollmentId={enrollmentId} studentName="김예지" />);
    await screen.findByText(/자료 활용 및 이해관계자 파악/);

    const judgmentCard = screen.getByText(/1차 판단의 논리성/).closest('div');
    fireEvent.click(within(judgmentCard).getByText('중 (15)'));
    await waitFor(() => expect(screen.getByText('총점 20점')).toBeInTheDocument()); // 5(자료) + 15(1차판단)

    const reflectionCard = screen.getByText(/^성찰/).closest('div');
    fireEvent.click(within(reflectionCard).getByText('상 (10)'));
    await waitFor(() => expect(screen.getByText('총점 30점')).toBeInTheDocument()); // 5+15+10
  });
});
