// src/steps/Step7.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Step7 from './Step7';
import { mockStakeholders } from '../data/stakeholders.test-fixture';

vi.mock('../api', () => ({
  saveResponse: vi.fn(() => Promise.resolve({ saved: true })),
}));

const STEP_PROPS = { token: 'fake-token', enrollmentId: 1, stepId: 1, stakeholders: mockStakeholders };

describe('Step7 트레이드오프 분석', () => {
  it('6명을 다 분류하기 전까지는 "분류 완료" 버튼이 비활성화된다', () => {
    render(<Step7 {...STEP_PROPS} onComplete={() => {}} />);
    expect(screen.getByText('분류 완료')).toBeDisabled();
    expect(screen.getByText('6명 모두 분류해주세요. (0/6)')).toBeInTheDocument();
  });

  it('한 명씩 분류할 때마다 진행 카운트가 올라간다', () => {
    render(<Step7 {...STEP_PROPS} onComplete={() => {}} />);
    const card = screen.getByText('원도심 임차 상인').closest('div');
    fireEvent.click(within(card.parentElement).getByText('불이익 집단'));
    expect(screen.getByText('6명 모두 분류해주세요. (1/6)')).toBeInTheDocument();
  });

  it('6명을 모두 분류하면 "다음 화면(서술)"으로 넘어가고, 불이익으로 고른 이름이 정확히 나온다', () => {
    render(<Step7 {...STEP_PROPS} onComplete={() => {}} />);
    const names = ['원도심 임차 상인', '건물주(임대인)', '오래 거주한 주민', '지역 청년', '숙박업 종사자', '시 재정 담당 부서'];
    const tagsToPick = ['불이익 집단', '혜택 집단', '불이익 집단', '상관없어 보임', '혜택 집단', '상관없어 보임'];

    names.forEach((name, i) => {
      const card = screen.getByText(name).closest('div').parentElement;
      fireEvent.click(within(card).getByText(tagsToPick[i]));
    });

    fireEvent.click(screen.getByText('분류 완료'));

    // writing 단계로 전환되었는지 확인
    expect(screen.getByText('보완책 제안')).toBeInTheDocument();
    // 불이익으로 분류한 두 명(임차 상인, 오래 거주한 주민)의 이름이 문구에 정확히 들어감
    expect(screen.getByText(/원도심 임차 상인, 오래 거주한 주민/)).toBeInTheDocument();
  });

  it('불이익 집단이 하나도 없으면 다시 생각해보라는 안내가 뜬다', () => {
    render(<Step7 {...STEP_PROPS} onComplete={() => {}} />);
    const names = ['원도심 임차 상인', '건물주(임대인)', '오래 거주한 주민', '지역 청년', '숙박업 종사자', '시 재정 담당 부서'];
    names.forEach((name) => {
      const card = screen.getByText(name).closest('div').parentElement;
      fireEvent.click(within(card).getByText('상관없어 보임'));
    });
    fireEvent.click(screen.getByText('분류 완료'));
    expect(screen.getByText(/정말 아무도 손해를 보지 않는지/)).toBeInTheDocument();
  });

  it('서술 없이는 제출 버튼이 비활성화되고, 작성하면 최종 데이터가 정확히 전달된다', async () => {
    let result = null;
    render(<Step7 {...STEP_PROPS} onComplete={(d) => (result = d)} />);
    const card = (name) => screen.getByText(name).closest('div').parentElement;
    fireEvent.click(within(card('원도심 임차 상인')).getByText('불이익 집단'));
    fireEvent.click(within(card('건물주(임대인)')).getByText('혜택 집단'));
    fireEvent.click(within(card('오래 거주한 주민')).getByText('상관없어 보임'));
    fireEvent.click(within(card('지역 청년')).getByText('상관없어 보임'));
    fireEvent.click(within(card('숙박업 종사자')).getByText('상관없어 보임'));
    fireEvent.click(within(card('시 재정 담당 부서')).getByText('상관없어 보임'));
    fireEvent.click(screen.getByText('분류 완료'));

    expect(screen.getByText('다음 단계로')).toBeDisabled();
    const textarea = screen.getByPlaceholderText('보완책을 구체적으로 서술해주세요.');
    fireEvent.change(textarea, { target: { value: '홍보 지원을 확대해 손실을 보완한다.' } });
    fireEvent.click(screen.getByText('다음 단계로'));

    await vi.waitFor(() => expect(result).not.toBeNull());
    expect(result.mitigation).toBe('홍보 지원을 확대해 손실을 보완한다.');
    expect(result.classification.s1).toBe('harm');
    expect(result.classification.s2).toBe('benefit');
  });
});
