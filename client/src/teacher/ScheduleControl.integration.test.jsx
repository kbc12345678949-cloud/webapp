// src/teacher/ScheduleControl.integration.test.jsx
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { spawn } from 'child_process';
import path from 'path';
import ScheduleControl from './ScheduleControl';
import { teacherApi, setApiBase } from './api';

const TEST_PORT = 3993;
let serverProcess;
let teacherToken;

beforeAll(async () => {
  const base = `http://localhost:${TEST_PORT}`;
  setApiBase(base);
  await new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['test_server_schedule.js'], {
      cwd: path.resolve(__dirname, '../../../server'),
      env: { ...process.env, TEST_PORT: String(TEST_PORT) },
    });
    serverProcess.stdout.on('data', (d) => {
      if (d.toString().includes('TEST_SERVER_READY')) resolve();
    });
    serverProcess.stderr.on('data', (d) => console.error('[server]', d.toString()));
    setTimeout(() => reject(new Error('서버 부팅 타임아웃')), 8000);
  });
  const t = await teacherApi.login('kim', 'teacher1234');
  teacherToken = t.token;
}, 15000);

afterAll(() => {
  serverProcess?.kill();
});

describe('ScheduleControl ↔ 실제 서버 통합 테스트', () => {
  it('처음엔 예약이 하나도 없다', async () => {
    render(<ScheduleControl token={teacherToken} projectId={1} />);
    await screen.findByText('9월 21~23일 실제 운영 시간표 (종 치는 시각 ±5분 버퍼 적용)');
    expect(screen.queryByText('응시 가능')).not.toBeInTheDocument();
    expect(screen.queryByText('응시 마감')).not.toBeInTheDocument();
  });

  it('"실제 시간표 6건 한 번에 등록"을 누르면 3개 반 × 2교시 = 6건이 실제 서버에 정확히 저장된다', async () => {
    render(<ScheduleControl token={teacherToken} projectId={1} />);
    await screen.findByText('실제 시간표 6건 한 번에 등록');
    fireEvent.click(screen.getByText('실제 시간표 6건 한 번에 등록'));

    await waitFor(() => expect(screen.getByText('실제 운영 시간표 6건 등록 완료')).toBeInTheDocument());

    expect(screen.getAllByText('2학년 1반 · 1교시').length).toBe(1);
    expect(screen.getAllByText('2학년 1반 · 2교시').length).toBe(1);
    expect(screen.getAllByText('2학년 2반 · 1교시').length).toBe(1);
    expect(screen.getAllByText('2학년 2반 · 2교시').length).toBe(1);
    expect(screen.getAllByText('2학년 3반 · 1교시').length).toBe(1);
    expect(screen.getAllByText('2학년 3반 · 2교시').length).toBe(1);

    // 실제 서버에 정확한 시각으로 저장됐는지 API로 교차 확인 (2학년 1반 1교시: 9/22 11:45~12:45 KST)
    const saved = await teacherApi.getSchedules(teacherToken, 1);
    const class1session1 = saved.find((s) => s.class_name === '2학년 1반' && s.session_no === 1);

    // 이 서버는 "테스트반"이 먼저 생성되어 실제 class_id가 1이 아니라 2번이다.
    // 그런데도 정확히 "2학년 1반"에 매핑됐다는 게, 이름 기반 조회가 순서와 무관함을 보여준다.
    expect(class1session1.class_id).toBe(2);

    const startsAt = new Date(class1session1.starts_at);
    // UTC로 변환해서 확인 (KST 11:45 = UTC 02:45)
    expect(startsAt.getUTCHours()).toBe(2);
    expect(startsAt.getUTCMinutes()).toBe(45);
    expect(startsAt.getUTCMonth()).toBe(8); // 0-indexed: 9월 = 8
    expect(startsAt.getUTCDate()).toBe(22);
  });

  it('수동 입력 폼으로 예약을 추가/수정하면 실제로 저장된다', async () => {
    render(<ScheduleControl token={teacherToken} projectId={1} />);
    await screen.findByText('예약 직접 입력/수정');

    fireEvent.change(screen.getByDisplayValue('반 선택'), { target: { value: '2학년 1반' } });
    fireEvent.change(screen.getByLabelText('시작'), { target: { value: '2026-09-24T09:00' } });
    fireEvent.change(screen.getByLabelText('종료'), { target: { value: '2026-09-24T09:50' } });
    fireEvent.click(screen.getByText('저장'));

    await waitFor(async () => {
      const saved = await teacherApi.getSchedules(teacherToken, 1);
      const updated = saved.find((s) => s.class_name === '2학년 1반' && s.session_no === 1);
      expect(new Date(updated.starts_at).getUTCDate()).toBe(24);
    });
  });
});
