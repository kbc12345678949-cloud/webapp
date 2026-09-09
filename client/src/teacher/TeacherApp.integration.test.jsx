// src/teacher/TeacherApp.integration.test.jsx
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { spawn } from 'child_process';
import path from 'path';
import TeacherApp from './TeacherApp';
import { setApiBase } from './api';

const TEST_PORT = 3998;
let serverProcess;

beforeAll(async () => {
  setApiBase(`http://localhost:${TEST_PORT}`);
  await new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['test_server_standalone.js'], {
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

describe('교사용 화면 ↔ 실제 서버 통합 테스트', () => {
  it('잘못된 비밀번호로 로그인하면 실제 서버가 401을 반환하고 에러가 표시된다', async () => {
    render(<TeacherApp projectId={1} />);
    fireEvent.change(screen.getByPlaceholderText('아이디'), { target: { value: 'kim' } });
    fireEvent.change(screen.getByPlaceholderText('비밀번호'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('로그인'));
    await waitFor(() => expect(screen.getByText(/아이디 또는 비밀번호/)).toBeInTheDocument());
  });

  it('올바른 로그인 후 실제 예약 시간표를 서버에서 받아와 표시한다', async () => {
    render(<TeacherApp projectId={1} />);
    fireEvent.change(screen.getByPlaceholderText('아이디'), { target: { value: 'kim' } });
    fireEvent.change(screen.getByPlaceholderText('비밀번호'), { target: { value: 'teacher1234' } });
    fireEvent.click(screen.getByText('로그인'));

    await screen.findByText('응시 개폐 관리');
    fireEvent.click(screen.getByText('응시 개폐 관리')); // 기본 탭이 '학생 명단 업로드'로 바뀌어서 명시적으로 이동
    expect(await screen.findByText('2학년 1반 · 1교시')).toBeInTheDocument();
    // 예약 시간이 이미 지금 기준으로 열려있게 시딩했으므로 "응시 가능"으로 보여야 함
    expect(await screen.findByText('응시 가능')).toBeInTheDocument();
  });

  it('"응시 가능" 버튼을 누르면 실제 서버에 toggle 요청이 가서 "수동으로 열려있음"으로 바뀐다', async () => {
    render(<TeacherApp projectId={1} />);
    fireEvent.change(screen.getByPlaceholderText('아이디'), { target: { value: 'kim' } });
    fireEvent.change(screen.getByPlaceholderText('비밀번호'), { target: { value: 'teacher1234' } });
    fireEvent.click(screen.getByText('로그인'));

    await screen.findByText('응시 개폐 관리');
    fireEvent.click(screen.getByText('응시 개폐 관리'));

    const btn = await screen.findByText('응시 가능');
    fireEvent.click(btn); // manually_opened: false -> true 토글
    await waitFor(() => expect(screen.getByText('수동으로 열려있음')).toBeInTheDocument());

    fireEvent.click(screen.getByText('응시 가능')); // 다시 눌러서 false로 되돌림 (다음 테스트 오염 방지)
    await waitFor(() => expect(screen.queryByText('수동으로 열려있음')).not.toBeInTheDocument());
  });

  it('실시간 집계 탭에서 "지금 분포 공개하기"를 누르면 실제 시딩 데이터(A1·B3·C1 / B2·C3)가 정확히 표시된다', async () => {
    render(<TeacherApp projectId={1} />);
    fireEvent.change(screen.getByPlaceholderText('아이디'), { target: { value: 'kim' } });
    fireEvent.change(screen.getByPlaceholderText('비밀번호'), { target: { value: 'teacher1234' } });
    fireEvent.click(screen.getByText('로그인'));

    await screen.findByText('응시 개폐 관리');
    fireEvent.click(screen.getByText('실시간 집계'));
    fireEvent.click(screen.getByText('지금 분포 공개하기'));

    await waitFor(() => expect(screen.getByText('최종 결정 (STEP8) (전체 5명)')).toBeInTheDocument());

    const step3Panel = screen.getByText('1차 판단 (STEP3) (전체 5명)').closest('div');
    const step8Panel = screen.getByText('최종 결정 (STEP8) (전체 5명)').closest('div');

    // STEP3: A 1명(20%), B 3명(60%), C 1명(20%) — A와 C가 값이 같으므로 2번 나와야 정상
    expect(within(step3Panel).getAllByText('1명 (20%)').length).toBe(2); // A, C
    expect(within(step3Panel).getByText('3명 (60%)')).toBeInTheDocument(); // B

    // STEP8: A 0명(0%), B 2명(40%), C 3명(60%)
    expect(within(step8Panel).getByText('0명 (0%)')).toBeInTheDocument();
    expect(within(step8Panel).getByText('2명 (40%)')).toBeInTheDocument();
    expect(within(step8Panel).getByText('3명 (60%)')).toBeInTheDocument();
  });

  it('학생 명단을 업로드하면 실제 서버에 저장되고, 반별 진행 현황에서 조회된다', async () => {
    render(<TeacherApp projectId={1} />);
    fireEvent.change(screen.getByPlaceholderText('아이디'), { target: { value: 'kim' } });
    fireEvent.change(screen.getByPlaceholderText('비밀번호'), { target: { value: 'teacher1234' } });
    fireEvent.click(screen.getByText('로그인'));

    await screen.findByText('응시 개폐 관리'); // 로그인 완료 대기 (탭바가 뜨는 시점)
    const textarea = await screen.findByPlaceholderText(/2학년 1반,10101,김민준/);
    fireEvent.change(textarea, { target: { value: '2학년 1반,99901,테스트학생' } });
    fireEvent.click(screen.getByText('업로드'));

    await waitFor(() => expect(screen.getByText(/1명의 학생 정보가 등록되었습니다/)).toBeInTheDocument());

    // 진행 현황 탭에서 방금 올린 학생이 실제로 조회되는지 확인
    fireEvent.click(screen.getByText('진행 현황'));
    fireEvent.click(screen.getByText('조회'));
    const newStudentRow = (await screen.findByText('테스트학생')).closest('tr');
    expect(within(newStudentRow).getByText('99901')).toBeInTheDocument();
    expect(within(newStudentRow).getByText('미제출')).toBeInTheDocument();
  });

  it('이미 시딩된 학생의 "답안 보기"를 누르면 실제 STEP3·STEP8 답안이 열린다', async () => {
    render(<TeacherApp projectId={1} />);
    fireEvent.change(screen.getByPlaceholderText('아이디'), { target: { value: 'kim' } });
    fireEvent.change(screen.getByPlaceholderText('비밀번호'), { target: { value: 'teacher1234' } });
    fireEvent.click(screen.getByText('로그인'));

    await screen.findByText('응시 개폐 관리'); // 로그인 완료 대기
    fireEvent.click(screen.getByText('진행 현황'));
    fireEvent.click(screen.getByText('조회'));

    const firstStudentRow = await screen.findByText('학생0');
    fireEvent.click(within(firstStudentRow.closest('tr')).getByText('답안 보기'));

    await waitFor(() => expect(screen.getByText('학생0 학생의 답안')).toBeInTheDocument());
    expect(await screen.findByText('1차 판단')).toBeInTheDocument();
    expect(screen.getByText('최종 결정')).toBeInTheDocument();
    // 시딩 데이터: 학생0의 STEP3 선택은 'A'
    expect(screen.getByText(/"choice": "A"/)).toBeInTheDocument();
  });
});
