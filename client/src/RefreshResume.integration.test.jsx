// src/RefreshResume.integration.test.jsx
// "새로고침하면 답이 다 없어지는 거 아니냐"는 질문에 대한 실제 답:
// 로그인 → STEP3까지 진행 → (새로고침을 흉내내어) App을 다시 마운트 →
// 다시 로그인 → 저장된 답이 그대로 채워진 채로, 정확히 이어서 진행할 다음 화면으로 돌아가는지 확인한다.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { spawn } from 'child_process';
import path from 'path';
import App from './App';
import { setApiBase } from './api';

const TEST_PORT = 3991;
let serverProcess;

beforeAll(async () => {
  const base = `http://localhost:${TEST_PORT}`;
  setApiBase(base);
  await new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['test_server_fullflow.js'], {
      cwd: path.resolve(__dirname, '../../server'),
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

const login = async () => {
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '2학년 1반' } });
  fireEvent.change(screen.getByPlaceholderText('예: 2103'), { target: { value: '2103' } });
  fireEvent.click(screen.getByRole('button', { name: '로그인' }));
  await screen.findByText(/학생이 맞습니까/);
  fireEvent.click(screen.getByText('계속 로그인하기'));
};

describe('새로고침 후 진행상황 복원', () => {
  it('STEP3까지 답하고 "새로고침"(재마운트) 하면, 다시 로그인 시 STEP4로 자동 이동하고 STEP3 내용도 그대로 남아있다', async () => {
    // 1) 처음 로그인해서 STEP3까지 진행하고 답을 저장한다
    render(<App />);
    await login();
    await screen.findByText('☆☆시 관광정책, 이대로 괜찮은가');
    fireEvent.click(screen.getByText('브리핑 시작하기'));

    await screen.findByText('자료 1. 방문객 수 추이');
    fireEvent.click(screen.getAllByText('O')[0]);
    fireEvent.click(screen.getByText('다음 자료'));
    await screen.findByText('자료 2. 임차 상인 인터뷰');
    fireEvent.click(screen.getByText(/임대료 상승/));
    fireEvent.click(screen.getByText('자료 확인 완료'));

    await screen.findByText('1차 판단');
    fireEvent.click(screen.getByText('관리형 관광'));
    const reasonText =
      '방문객이 인구의 24배에 달할 만큼 관광 수요가 크지만, 임차 상인은 매출이 늘어도 임대료 상승을 걱정하고 있다. 그래서 관광 수요와 생활권 보호를 동시에 고려한 절충안인 B안을 최종적으로 선택한다.';
    fireEvent.change(screen.getByPlaceholderText(/이 정책을 선택한 이유를/), {
      target: { value: reasonText },
    });
    fireEvent.click(screen.getByText('다음 단계로'));

    // STEP4 진입까지 확인 (여기서 저장이 완료된 상태)
    await screen.findByText(/B안\(관리형 관광\)/);

    // 2) "새로고침"을 흉내낸다: 화면을 완전히 지우고(unmount) App을 처음부터 다시 마운트한다.
    cleanup();
    render(<App />);

    // 로그인 화면부터 다시 시작해야 한다 (진짜 새로고침이면 이렇게 됨)
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();

    // 3) 다시 로그인한다
    await login();

    // 4) STEP0이 아니라 곧바로 STEP4로 이동해야 한다 (STEP3까지 저장되어 있었으므로)
    await waitFor(() => expect(screen.getByText(/B안\(관리형 관광\)/)).toBeInTheDocument());
    expect(screen.queryByText('☆☆시 관광정책, 이대로 괜찮은가')).not.toBeInTheDocument();

    // 5) STEP4~7을 통과해서 STEP8까지 가서, STEP3에서 썼던 근거가 여전히 살아있는지 확인한다
    fireEvent.click(screen.getByText('확인하기'));
    await screen.findByText('임대료 추이 자료');
    fireEvent.click(screen.getByText('다음 단계로'));

    await screen.findByText('재판단');
    fireEvent.click(screen.getByText('기존 선택 유지'));
    fireEvent.change(screen.getByPlaceholderText(/유지 또는 변경한 이유를/), {
      target: { value: '재정 부서 메모를 확인해도 여전히 B안이 관광 활성화와 생활권 보호를 함께 고려한 가장 균형 잡힌 선택이라고 판단했다.' },
    });
    fireEvent.click(screen.getByText('다음 단계로'));

    await screen.findByText('이해관계자 분석');
    await screen.findByText('원도심 임차 상인');
    fireEvent.click(screen.getByText('다음 단계로'));

    await screen.findByText('트레이드오프 분석');
    const names = ['원도심 임차 상인', '건물주(임대인)', '오래 거주한 주민', '지역 청년', '숙박업 종사자', '시 재정 담당 부서'];
    const tags = ['불이익 집단', '혜택 집단', '상관없어 보임', '상관없어 보임', '혜택 집단', '상관없어 보임'];
    names.forEach((name, i) => {
      const card = screen.getByText(name).closest('div').parentElement;
      fireEvent.click(within(card).getByText(tags[i]));
    });
    fireEvent.click(screen.getByText('분류 완료'));
    await screen.findByText('보완책 제안');
    fireEvent.change(screen.getByPlaceholderText('보완책을 구체적으로 서술해주세요.'), {
      target: { value: '홍보 지원으로 손실을 보완한다.' },
    });
    fireEvent.click(screen.getByText('다음 단계로'));

    // STEP8의 "나의 선택 여정" 요약에 원래 STEP3에서 썼던 이유(reasonText)가 그대로 살아있어야 한다
    await screen.findByText('최종 결정');
    expect(screen.getByText(new RegExp(reasonText.slice(0, 20)))).toBeInTheDocument();
  }, 20000);

  it('100자 미달인 미완성 STEP3 답만 저장된 상태로 로그인하면, STEP3을 건너뛰지 않고 그 자리에서 이어 쓰게 한다', async () => {
    const base = `http://localhost:${TEST_PORT}`;

    // 1) UI를 거치지 않고, 실제 API로 새 학생을 만들고 "미완성" STEP3 답만 미리 심어둔다.
    const teacherLoginRes = await fetch(`${base}/api/teacher/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'kim', password: 'teacher1234' }),
    });
    const { token: teacherToken } = await teacherLoginRes.json();
    await fetch(`${base}/api/teacher/students/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}`, 'Content-Type': 'text/csv' },
      body: '2학년 1반,99001,미완성학생',
    });

    const loginRes = await fetch(`${base}/api/student/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ className: '2학년 1반', studentNo: '99001' }),
    });
    const { token: studentToken } = await loginRes.json();
    const enterRes = await fetch(`${base}/api/student/projects/tourism`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const session = await enterRes.json();
    const step3Id = session.steps.find((s) => s.step_key === 'step3').id;
    await fetch(`${base}/api/student/enrollments/${session.enrollment.id}/responses/${step3Id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ answer: { choice: 'B', reason: '아직 다 못 씀' } }), // 100자 미달
    });

    // 2) 이 상태에서 실제로 화면에 로그인해본다.
    render(<App />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2학년 1반' } });
    fireEvent.change(screen.getByPlaceholderText('예: 2103'), { target: { value: '99001' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    await screen.findByText(/학생이 맞습니까/);
    fireEvent.click(screen.getByText('계속 로그인하기'));

    // 3) STEP4로 건너뛰지 않고, STEP3에 머물러야 하며, 이미 썼던 짧은 답이 그대로 복원되어야 한다.
    await waitFor(() => expect(screen.getByText('1차 판단')).toBeInTheDocument());
    expect(screen.queryByText(/B안\(관리형 관광\)/)).not.toBeInTheDocument(); // STEP4로 건너뛰지 않았음
    expect(screen.getByDisplayValue('아직 다 못 씀')).toBeInTheDocument(); // 이전에 쓰던 내용 복원
    expect(screen.getByText('다음 단계로')).toBeDisabled(); // 여전히 100자 미달이라 제출은 안 됨
  });

  it('이미 제출을 마친 학생이 나중에 다시 로그인하면, 처음부터 다시 시키지 않고 곧바로 "완료" 화면을 보여준다', async () => {
    const base = `http://localhost:${TEST_PORT}`;

    // 1) UI 없이, 이미 제출까지 완료된 학생을 하나 만들어둔다.
    const teacherLoginRes = await fetch(`${base}/api/teacher/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'kim', password: 'teacher1234' }),
    });
    const { token: teacherToken } = await teacherLoginRes.json();
    await fetch(`${base}/api/teacher/students/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}`, 'Content-Type': 'text/csv' },
      body: '2학년 1반,99002,제출완료학생',
    });
    const loginRes = await fetch(`${base}/api/student/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ className: '2학년 1반', studentNo: '99002' }),
    });
    const { token: studentToken } = await loginRes.json();
    const enterRes = await fetch(`${base}/api/student/projects/tourism`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const session = await enterRes.json();
    await fetch(`${base}/api/student/enrollments/${session.enrollment.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    // 2) 실제 화면에 이 학생으로 로그인해본다 (마치 며칠 뒤 다시 접속한 것처럼).
    render(<App />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2학년 1반' } });
    fireEvent.change(screen.getByPlaceholderText('예: 2103'), { target: { value: '99002' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    await screen.findByText(/학생이 맞습니까/);
    fireEvent.click(screen.getByText('계속 로그인하기'));

    // 3) STEP0부터 다시 시키지 않고, 곧바로 "완료" 화면이 떠야 한다.
    await waitFor(() => expect(screen.getByText('제출이 완료되었습니다. 수고하셨습니다.')).toBeInTheDocument());
    expect(screen.queryByText('☆☆시 관광정책, 이대로 괜찮은가')).not.toBeInTheDocument();
  });
});
