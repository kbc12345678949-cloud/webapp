// src/StudentLogin.integration.test.jsx
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { spawn } from 'child_process';
import path from 'path';
import App from './App';
import { setApiBase } from './api';

const TEST_PORT = 3992;
let serverProcess;

beforeAll(async () => {
  setApiBase(`http://localhost:${TEST_PORT}`);
  await new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['test_server_login.js'], {
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

describe('학생 로그인 ↔ 실제 서버 통합 테스트', () => {
  it('학번을 입력하지 않고 로그인하면 서버에 요청도 안 가고 안내 문구가 뜬다', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByText('학번을 입력해주세요.')).toBeInTheDocument();
  });

  it('존재하지 않는 학번으로 로그인하면 실제 서버가 404를 반환하고 에러가 표시된다', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('예: 2103'), { target: { value: '99999' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    await waitFor(() =>
      expect(screen.getByText(/일치하는 학생 정보를 찾을 수 없습니다/)).toBeInTheDocument()
    );
  });

  it('반과 학번이 일치하지 않으면(다른 반 학번) 로그인이 거부된다', async () => {
    render(<App />);
    // 시딩 데이터: 학번 10100~10104는 "2학년 1반" 소속. 다른 반으로 선택해서 시도.
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2학년 2반' } });
    fireEvent.change(screen.getByPlaceholderText('예: 2103'), { target: { value: '10100' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    await waitFor(() =>
      expect(screen.getByText(/일치하는 학생 정보를 찾을 수 없습니다/)).toBeInTheDocument()
    );
  });

  it('로그인 성공 시 확인 화면에 학번과 이름이 정확히 뜬다', async () => {
    render(<App />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2학년 1반' } });
    fireEvent.change(screen.getByPlaceholderText('예: 2103'), { target: { value: '10100' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    expect(await screen.findByText('10100 학생0 학생이 맞습니까?')).toBeInTheDocument();
    expect(screen.getByText('2학년 1반')).toBeInTheDocument();
  });

  it('확인 화면에서 "뒤로가기"를 누르면 로그인 폼으로 돌아가고 학번이 초기화된다', async () => {
    render(<App />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2학년 1반' } });
    fireEvent.change(screen.getByPlaceholderText('예: 2103'), { target: { value: '10100' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await screen.findByText('10100 학생0 학생이 맞습니까?');
    fireEvent.click(screen.getByText('뒤로가기'));

    expect(screen.getByPlaceholderText('예: 2103').value).toBe('');
    expect(screen.queryByText(/학생이 맞습니까/)).not.toBeInTheDocument();
  });

  it('올바른 반+학번으로 로그인 후 확인까지 마치면 실제로 인증되어 STEP0 화면으로 넘어간다', async () => {
    render(<App />);
    // test_server_standalone.js 시딩: class_id=1("2학년 1반"), student_no='10100', name='학생0'
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2학년 1반' } });
    fireEvent.change(screen.getByPlaceholderText('예: 2103'), { target: { value: '10100' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await screen.findByText(/학생이 맞습니까/);
    fireEvent.click(screen.getByText('계속 로그인하기'));

    await waitFor(() => expect(screen.getByText('☆☆시 관광정책, 이대로 괜찮은가')).toBeInTheDocument());
    expect(screen.getByText('브리핑 시작하기')).toBeInTheDocument();
    // 상단 헤더에 학번·이름이 정확히 표시되는지 확인
    expect(screen.getByText('10100 학생0')).toBeInTheDocument();
  });
});
