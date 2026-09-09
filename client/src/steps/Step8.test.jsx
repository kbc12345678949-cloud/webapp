// src/steps/Step8.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Step8 from './Step8';
import { mockStakeholders } from '../data/stakeholders.test-fixture';

vi.mock('../api', () => ({
  saveResponse: vi.fn(() => Promise.resolve({ saved: true })),
}));

const STEP_PROPS = { token: 'fake-token', enrollmentId: 1, stepId: 1, stakeholders: mockStakeholders };

const mockStep3 = { choice: 'B', reason: 'B안이 두 위험을 동시에 완화할 수 있는 절충안이라고 판단했다.' };
const mockStep5 = { decision: 'keep', choice: 'B', reason: '재정 부서 메모를 보고도 여전히 B안이 낫다고 판단했다.' };
const mockStep7 = {
  classification: { s1: 'harm', s2: 'benefit', s3: 'neutral', s4: 'neutral', s5: 'harm', s6: 'neutral' },
  mitigation: '숙박업계에는 홍보 지원을 확대해 손실을 보완한다.',
};

describe('Step8 최종 결정', () => {
  it('나의 선택 여정에 STEP3·5·7 내용이 정확히 요약되어 나타난다', () => {
    render(<Step8 {...STEP_PROPS} step3Answer={mockStep3} step5Answer={mockStep5} step7Answer={mockStep7} onComplete={() => {}} />);
    expect(screen.getAllByText(/B안 · 관리형 관광/).length).toBeGreaterThan(0);
    expect(screen.getByText(/유지/)).toBeInTheDocument();
    expect(screen.getByText(/혜택: 건물주\(임대인\)/)).toBeInTheDocument();
    expect(screen.getByText(/불이익: 원도심 임차 상인, 숙박업 종사자/)).toBeInTheDocument();
  });

  it('아무 것도 입력하지 않으면 버튼이 비활성화된다', () => {
    render(<Step8 {...STEP_PROPS} step3Answer={mockStep3} step5Answer={mockStep5} step7Answer={mockStep7} onComplete={() => {}} />);
    expect(screen.getByText('다음 단계로')).toBeDisabled();
  });

  it('최종 선택은 STEP5의 선택(B)이 기본값으로 미리 채워진다', () => {
    render(<Step8 {...STEP_PROPS} step3Answer={mockStep3} step5Answer={mockStep5} step7Answer={mockStep7} onComplete={() => {}} />);
    const bButton = screen.getByText('B안');
    expect(bButton.style.background).toContain('navy');
  });

  it('4개 항목을 모두 채우면 제출되고 값이 정확히 전달된다', async () => {
    let result = null;
    render(
      <Step8
        {...STEP_PROPS}
        step3Answer={mockStep3}
        step5Answer={mockStep5}
        step7Answer={mockStep7}
        onComplete={(d) => (result = d)}
      />
    );
    fireEvent.change(screen.getByPlaceholderText('최종 선택의 핵심 근거를 서술해주세요.'), {
      target: { value: '핵심 근거 내용' },
    });
    fireEvent.change(screen.getByPlaceholderText('이 정책을 시행했을 때 예상되는 문제점을 서술해주세요.'), {
      target: { value: '예상 문제점 내용' },
    });
    fireEvent.change(screen.getByPlaceholderText('예상 문제점을 줄이기 위한 보완 방안을 서술해주세요.'), {
      target: { value: '보완 방안 내용' },
    });
    fireEvent.click(screen.getByText('다음 단계로'));

    await vi.waitFor(() =>
      expect(result).toEqual({
        finalChoice: 'B',
        coreReason: '핵심 근거 내용',
        expectedProblem: '예상 문제점 내용',
        mitigationPlan: '보완 방안 내용',
      })
    );
  });

  it('최종 선택을 C로 바꾸면 반영된다', () => {
    render(<Step8 {...STEP_PROPS} step3Answer={mockStep3} step5Answer={mockStep5} step7Answer={mockStep7} onComplete={() => {}} />);
    fireEvent.click(screen.getByText('C안'));
    expect(screen.getByText('C안').style.background).toContain('navy');
    expect(screen.getByText('B안').style.background).not.toContain('navy');
  });
});
