// src/steps/Step5.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Step5 from './Step5';

vi.mock('../api', () => ({
  saveResponse: vi.fn(() => Promise.resolve({ saved: true })),
}));

const STEP_PROPS = { token: 'fake-token', enrollmentId: 1, stepId: 1 };

const LONG_ENOUGH = '재정 부서 메모를 자세히 보니 운영비 부담이 매년 계속 발생한다는 걸 알게 되어 판단을 조정했다.'; // 54자, 50자 이상

describe('Step5 재판단', () => {
  it('1차 판단(B안)이 리마인드 카드로 정확히 보인다', () => {
    render(<Step5 {...STEP_PROPS} previousChoice="B" onComplete={() => {}} />);
    expect(screen.getByText('B안 · 관리형 관광')).toBeInTheDocument();
  });

  it('아무 선택 없으면 버튼 비활성화 + 안내 문구', () => {
    render(<Step5 {...STEP_PROPS} previousChoice="B" onComplete={() => {}} />);
    expect(screen.getByText('다음 단계로')).toBeDisabled();
    expect(screen.getByText('유지 또는 변경 여부를 선택해주세요.')).toBeInTheDocument();
  });

  it('"기존 선택 유지" + 50자 이상 작성하면 원래 정책(B) 그대로 제출된다', async () => {
    let result = null;
    render(<Step5 {...STEP_PROPS} previousChoice="B" onComplete={(d) => (result = d)} />);
    fireEvent.click(screen.getByText('기존 선택 유지'));
    fireEvent.change(screen.getByPlaceholderText(/유지 또는 변경한 이유를/), {
      target: { value: LONG_ENOUGH },
    });
    fireEvent.click(screen.getByText('다음 단계로'));
    await vi.waitFor(() => expect(result).toEqual({ decision: 'keep', choice: 'B', reason: LONG_ENOUGH }));
  });

  it('"다른 정책으로 변경" 선택 시 새 정책 3개가 나타나고, 고르지 않으면 여전히 비활성화', () => {
    render(<Step5 {...STEP_PROPS} previousChoice="B" onComplete={() => {}} />);
    fireEvent.click(screen.getByText('다른 정책으로 변경'));
    expect(screen.getByText('A안 · 관광 확대')).toBeInTheDocument();
    expect(screen.getByText('C안 · 주민 생활권 우선')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/유지 또는 변경한 이유를/), {
      target: { value: LONG_ENOUGH },
    });
    expect(screen.getByText('다음 단계로')).toBeDisabled();
  });

  it('변경 + 새 정책(C) 선택 + 50자 이상이면 C안으로 제출된다', async () => {
    let result = null;
    render(<Step5 {...STEP_PROPS} previousChoice="B" onComplete={(d) => (result = d)} />);
    fireEvent.click(screen.getByText('다른 정책으로 변경'));
    fireEvent.click(screen.getByText('C안 · 주민 생활권 우선'));
    fireEvent.change(screen.getByPlaceholderText(/유지 또는 변경한 이유를/), {
      target: { value: LONG_ENOUGH },
    });
    fireEvent.click(screen.getByText('다음 단계로'));
    await vi.waitFor(() => expect(result).toEqual({ decision: 'change', choice: 'C', reason: LONG_ENOUGH }));
  });

  it('50자 미만이면 부족한 글자 수를 정확히 알려준다', () => {
    render(<Step5 {...STEP_PROPS} previousChoice="A" onComplete={() => {}} />);
    fireEvent.click(screen.getByText('기존 선택 유지'));
    fireEvent.change(screen.getByPlaceholderText(/유지 또는 변경한 이유를/), {
      target: { value: '짧은 이유' },
    });
    expect(screen.getByText('45자 더 작성해주세요.')).toBeInTheDocument();
  });
});
