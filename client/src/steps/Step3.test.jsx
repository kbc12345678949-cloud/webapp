// src/steps/Step3.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Step3 from './Step3';

vi.mock('../api', () => ({
  saveResponse: vi.fn(() => Promise.resolve({ saved: true })),
}));

const STEP_PROPS = { token: 'fake-token', enrollmentId: 1, stepId: 1 };

const SHORT_TEXT = '이유가 짧습니다.'; // 100자 미만
const LONG_TEXT =
  '방문객 수가 인구의 24배에 달할 만큼 관광 수요가 크지만, 임차 상인 인터뷰를 보면 매출은 늘어도 ' +
  '임대료 걱정이 크다는 걸 알 수 있다. 그래서 두 위험을 동시에 완화할 수 있는 절충안을 선택한다.'; // 100자 이상

describe('Step3 1차 판단', () => {
  it('정책안 3개(A/B/C)와 서술 입력창이 모두 보인다', () => {
    render(<Step3 {...STEP_PROPS} onComplete={() => {}} />);
    expect(screen.getByText('관광 확대')).toBeInTheDocument();
    expect(screen.getByText('관리형 관광')).toBeInTheDocument();
    expect(screen.getByText('주민 생활권 우선')).toBeInTheDocument();
  });

  it('아무것도 안 하면 다음 버튼이 비활성화 상태다', () => {
    render(<Step3 {...STEP_PROPS} onComplete={() => {}} />);
    const btn = screen.getByText('다음 단계로');
    expect(btn).toBeDisabled();
    expect(screen.getByText('정책안을 선택해주세요.')).toBeInTheDocument();
  });

  it('정책만 고르고 글자 수가 부족하면 여전히 비활성화다', () => {
    render(<Step3 {...STEP_PROPS} onComplete={() => {}} />);
    fireEvent.click(screen.getByText('관리형 관광'));
    const textarea = screen.getByPlaceholderText(/이 정책을 선택한 이유를/);
    fireEvent.change(textarea, { target: { value: SHORT_TEXT } });
    expect(screen.getByText('다음 단계로')).toBeDisabled();
    expect(screen.getByText(/자 더 작성해주세요/)).toBeInTheDocument();
  });

  it('정책 선택 + 100자 이상 작성하면 버튼이 활성화되고 제출된다', async () => {
    let submitted = null;
    render(<Step3 {...STEP_PROPS} onComplete={(data) => (submitted = data)} />);
    fireEvent.click(screen.getByText('관리형 관광'));
    const textarea = screen.getByPlaceholderText(/이 정책을 선택한 이유를/);
    fireEvent.change(textarea, { target: { value: LONG_TEXT } });

    const btn = screen.getByText('다음 단계로');
    expect(btn).not.toBeDisabled();

    fireEvent.click(btn);
    await vi.waitFor(() => expect(submitted).toEqual({ choice: 'B', reason: LONG_TEXT }));
  });

  it('글자 수 카운터가 실시간으로 표시된다', () => {
    render(<Step3 {...STEP_PROPS} onComplete={() => {}} />);
    const textarea = screen.getByPlaceholderText(/이 정책을 선택한 이유를/);
    fireEvent.change(textarea, { target: { value: '12345' } });
    expect(screen.getByText('5 / 100자 이상')).toBeInTheDocument();
  });
});
