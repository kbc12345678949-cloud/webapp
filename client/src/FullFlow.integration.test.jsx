// src/FullFlow.integration.test.jsx
// 로그인 → STEP0~9 전체 여정을 실제 서버(pg-mem 기반)로 끝까지 관통시키는 테스트.
// 마지막에는 교사 API로 실제 저장된 답안을 다시 조회해 데이터가 정말 남았는지 교차 확인한다.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { spawn } from 'child_process';
import path from 'path';
import App from './App';
import { setApiBase } from './api';
import { teacherApi, setApiBase as setTeacherApiBase } from './teacher/api';

const TEST_PORT = 3996;
let serverProcess;

beforeAll(async () => {
  const base = `http://localhost:${TEST_PORT}`;
  setApiBase(base);
  setTeacherApiBase(base);
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

const LONG_100 =
  '방문객이 인구의 24배에 달할 만큼 관광 수요가 크지만, 임차 상인은 매출이 늘어도 임대료 상승을 ' +
  '걱정하고 있다. 그래서 관광 수요를 유지하면서도 생활권을 보호하는 절충안인 B안을 선택한다.';
const LONG_50 = '재정 부서 메모를 확인했지만, 그럼에도 여전히 B안이 가장 균형 잡힌 선택이라고 판단하여 유지한다.';
const LONG_60_SELF =
  '같은 자료를 보고도 서로 다른 결론에 도달할 수 있었는데, 짝과 이야기해보니 결국 비슷한 이유로 같은 정책을 선택했다는 걸 알게 되었다.';
const LONG_30_SELF = '이 문장은 서른 글자를 채우기 위해 적당히 길게 늘려 쓴 문장입니다.';

describe('STEP0~9 전체 여정 ↔ 실제 서버 통합 테스트', () => {
  it('로그인부터 최종 제출까지 실제 서버와 통신하며 끝까지 완주하고, 교사 화면에서 결과가 확인된다', async () => {
    render(<App />);

    // 로그인
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2학년 1반' } });
    fireEvent.change(screen.getByPlaceholderText('예: 2103'), { target: { value: '2103' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    await screen.findByText(/학생이 맞습니까/);
    fireEvent.click(screen.getByText('계속 로그인하기'));

    // STEP0
    await screen.findByText('☆☆시 관광정책, 이대로 괜찮은가');
    expect(screen.getByText('2103 김예지')).toBeInTheDocument(); // 헤더에 학번·이름 표시 확인
    fireEvent.click(screen.getByText('브리핑 시작하기'));

    // STEP1: 자료 2개(실제 서버가 심어둔 내용)
    await screen.findByText('자료 1. 방문객 수 추이');
    fireEvent.click(screen.getAllByText('O')[0]); // ox 질문 답하기
    fireEvent.click(screen.getByText('다음 자료'));

    await screen.findByText('자료 2. 임차 상인 인터뷰');
    fireEvent.click(screen.getByText(/임대료 상승/)); // mc 질문 답하기
    fireEvent.click(screen.getByText('자료 확인 완료'));

    // STEP3: 1차 판단
    await screen.findByText('1차 판단');
    fireEvent.click(screen.getByText('관리형 관광'));
    fireEvent.change(screen.getByPlaceholderText(/이 정책을 선택한 이유를/), {
      target: { value: LONG_100 },
    });
    fireEvent.click(screen.getByText('다음 단계로'));

    // STEP4: 새로운 상황 (개인화 문구 확인 후 진행)
    await screen.findByText(/B안\(관리형 관광\)/);
    fireEvent.click(screen.getByText('확인하기'));
    await screen.findByText('임대료 추이 자료');
    fireEvent.click(screen.getByText('다음 단계로'));

    // STEP5: 재판단
    await screen.findByText('재판단');
    fireEvent.click(screen.getByText('기존 선택 유지'));
    fireEvent.change(screen.getByPlaceholderText(/유지 또는 변경한 이유를/), {
      target: { value: LONG_50 },
    });
    fireEvent.click(screen.getByText('다음 단계로'));

    // STEP6: 이해관계자 (서버에서 실제로 불러올 때까지 대기 후 확인)
    await screen.findByText('이해관계자 분석');
    await screen.findByText('원도심 임차 상인'); // 실제 서버에서 온 이해관계자 데이터 로딩 대기
    fireEvent.click(screen.getByText('다음 단계로'));

    // STEP7: 트레이드오프
    await screen.findByText('트레이드오프 분석');
    const stakeholderNames = [
      '원도심 임차 상인', '건물주(임대인)', '오래 거주한 주민',
      '지역 청년', '숙박업 종사자', '시 재정 담당 부서',
    ];
    const tags = ['불이익 집단', '혜택 집단', '상관없어 보임', '상관없어 보임', '혜택 집단', '상관없어 보임'];
    stakeholderNames.forEach((name, i) => {
      const card = screen.getByText(name).closest('div').parentElement;
      fireEvent.click(within(card).getByText(tags[i]));
    });
    fireEvent.click(screen.getByText('분류 완료'));
    await screen.findByText('보완책 제안');
    fireEvent.change(screen.getByPlaceholderText('보완책을 구체적으로 서술해주세요.'), {
      target: { value: '홍보 지원을 확대해 임차 상인의 손실을 보완한다.' },
    });
    fireEvent.click(screen.getByText('다음 단계로'));

    // STEP8: 최종 결정
    await screen.findByText('최종 결정');
    fireEvent.change(screen.getByPlaceholderText('최종 선택의 핵심 근거를 서술해주세요.'), {
      target: { value: '핵심 근거' },
    });
    fireEvent.change(screen.getByPlaceholderText('이 정책을 시행했을 때 예상되는 문제점을 서술해주세요.'), {
      target: { value: '예상 문제점' },
    });
    fireEvent.change(screen.getByPlaceholderText('예상 문제점을 줄이기 위한 보완 방안을 서술해주세요.'), {
      target: { value: '보완 방안' },
    });
    fireEvent.click(screen.getByText('다음 단계로'));

    // STEP9: 성찰 + 최종 제출
    await screen.findByText('성찰');
    fireEvent.click(screen.getByText('없었다'));
    fireEvent.change(screen.getByPlaceholderText(/같은 자료를 보고 같은 결론에/), {
      target: { value: LONG_60_SELF },
    });
    const selfBoxes = screen.getAllByRole('textbox').filter((el) => el.placeholder === '');
    selfBoxes.forEach((box) => fireEvent.change(box, { target: { value: LONG_30_SELF } }));

    fireEvent.click(screen.getByText('최종 제출하기'));
    await screen.findByText('최종 제출하시겠습니까?');
    fireEvent.click(screen.getByText('제출'));

    // 제출 완료 화면
    await waitFor(() => expect(screen.getByText('제출이 완료되었습니다. 수고하셨습니다.')).toBeInTheDocument());

    // 교차 확인: 교사 API로 실제 서버에 저장된 데이터를 다시 조회
    const { token: teacherToken } = await teacherApi.login('kim', 'teacher1234');
    const progress = await teacherApi.getProgress(teacherToken, 1, 1);
    const me = progress.find((p) => p.student_no === '2103');
    expect(me.submitted_at).not.toBeNull(); // 실제로 제출 완료 처리됨
    expect(Number(me.steps_done)).toBe(5); // step3·5·7·8·9 다섯 번 저장됨

    const responses = await teacherApi.getResponses(teacherToken, me.enrollment_id);
    const step3 = responses.find((r) => r.step_key === 'step3');
    expect(step3.answer.choice).toBe('B');
    expect(step3.answer.reason).toBe(LONG_100);

    const step9 = responses.find((r) => r.step_key === 'step9');
    expect(step9.answer.branch).toBe('none');
  }, 20000);
});
