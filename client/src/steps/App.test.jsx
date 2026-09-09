// src/steps/App.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { materials as localMaterials } from '../data/step1Materials';

// 이 파일의 테스트들은 STEP0 이후 화면 로직만 빠르게 확인하는 게 목적이므로,
// 실제 서버 통신이 필요한 부분은 모킹한다. 실제 서버 연결 검증은
// StudentLogin.integration.test.jsx / FullFlow.integration.test.jsx에서 별도로 확인한다.
const mockSteps = [
  'step0', 'step1', 'step3', 'step4', 'step5', 'step6', 'step7', 'step8', 'step9',
].map((key, i) => ({ id: i + 1, step_key: key }));

const mockServerMaterials = localMaterials.map((m, i) => ({
  id: i + 1,
  material_key: m.key,
  title: m.title,
  body: m.body,
  icon: m.icon,
  questions: m.questions.map((q, qi) => ({
    id: i * 10 + qi,
    question_type: q.type,
    prompt: q.prompt,
    options: q.options,
  })),
}));

vi.mock('../api', () => ({
  studentLogin: vi.fn(() =>
    Promise.resolve({ token: 'fake-token', name: '테스트학생', className: '2학년 1반' })
  ),
  enterProject: vi.fn(() =>
    Promise.resolve({
      project: { id: 1 },
      steps: mockSteps,
      tracks: [],
      enrollment: { id: 1 },
      responses: [],
    })
  ),
  fetchMaterials: vi.fn(() => Promise.resolve(mockServerMaterials)),
  saveResponse: vi.fn(() => Promise.resolve({ saved: true })),
  submitFinal: vi.fn(() => Promise.resolve({})),
}));

async function loginAndStart() {
  render(<App />);
  fireEvent.change(screen.getByPlaceholderText('예: 2103'), { target: { value: '2103' } });
  fireEvent.click(screen.getByRole('button', { name: '로그인' }));
  await screen.findByText(/학생이 맞습니까/);
  fireEvent.click(screen.getByText('계속 로그인하기'));
  await screen.findByText('브리핑 시작하기');
}

describe('STEP0 → STEP1 흐름', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('STEP0 화면에 제목과 시작 버튼이 보인다', async () => {
    await loginAndStart();
    expect(screen.getByText('☆☆시 관광정책, 이대로 괜찮은가')).toBeInTheDocument();
    expect(screen.getByText('브리핑 시작하기')).toBeInTheDocument();
  });

  it('시작하기를 누르면 STEP1(자료1)로 넘어간다', async () => {
    await loginAndStart();
    fireEvent.click(screen.getByText('브리핑 시작하기'));
    expect(await screen.findByText('자료 1. 방문객 수 추이')).toBeInTheDocument();
    expect(screen.getByText('다음 자료')).toBeInTheDocument();
  });

  it('객관식 보기를 클릭하면 선택 상태가 반영된다', async () => {
    await loginAndStart();
    fireEvent.click(screen.getByText('브리핑 시작하기'));
    await screen.findByText('자료 1. 방문객 수 추이');
    const optionButton = screen.getByText(/약 24배/).closest('button');
    fireEvent.click(optionButton);
    // 선택된 보기는 배경이 navy로 바뀐다
    expect(optionButton.style.background).toContain('navy');
  });

  it('OX 문제에서 O를 누르면 선택된다', async () => {
    await loginAndStart();
    fireEvent.click(screen.getByText('브리핑 시작하기'));
    await screen.findByText('자료 1. 방문객 수 추이');
    const oButton = screen.getAllByText('O')[0];
    fireEvent.click(oButton);
    expect(oButton.style.background).toContain('navy');
  });

  it('자료 7개를 전부 넘기면 STEP3(1차 판단) 화면으로 전환된다', async () => {
    await loginAndStart();
    fireEvent.click(screen.getByText('브리핑 시작하기'));
    await screen.findByText('자료 1. 방문객 수 추이');
    // 자료 1~6: "다음 자료" 클릭
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByText('다음 자료'));
    }
    // 자료 7(마지막)에서는 버튼 문구가 바뀐다
    expect(screen.getByText('자료 7. 타 도시 사례')).toBeInTheDocument();
    expect(screen.getByText('자료 확인 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByText('자료 확인 완료'));
    expect(screen.getByText('1차 판단')).toBeInTheDocument();
    expect(screen.getByText('관리형 관광')).toBeInTheDocument();
  });

  it('단답형(자료5) 입력이 정상 반영된다', async () => {
    await loginAndStart();
    fireEvent.click(screen.getByText('브리핑 시작하기'));
    await screen.findByText('자료 1. 방문객 수 추이');
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText('다음 자료')); // 자료5로 이동
    expect(screen.getByText('자료 5. 지역 청년 인터뷰')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('답을 입력하세요');
    fireEvent.change(input, { target: { value: '2배' } });
    expect(input.value).toBe('2배');
  });
});
