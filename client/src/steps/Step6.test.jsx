// src/steps/Step6.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Step6 from './Step6';
import { mockStakeholders } from '../data/stakeholders.test-fixture';

describe('Step6 이해관계자 분석', () => {
  it('이해관계자 6명 이름이 전부 보인다', () => {
    render(<Step6 stakeholders={mockStakeholders} onComplete={() => {}} />);
    ['원도심 임차 상인', '건물주(임대인)', '오래 거주한 주민', '지역 청년', '숙박업 종사자', '시 재정 담당 부서'].forEach(
      (name) => expect(screen.getByText(name)).toBeInTheDocument()
    );
  });

  it('자료3~5에서 만난 인물 3명에만 연결 배지가 붙는다', () => {
    render(<Step6 stakeholders={mockStakeholders} onComplete={() => {}} />);
    expect(screen.getByText('자료 3에서 만난 분')).toBeInTheDocument();
    expect(screen.getByText('자료 4에서 만난 분')).toBeInTheDocument();
    expect(screen.getByText('자료 5에서 만난 분')).toBeInTheDocument();
    // 건물주·숙박업·재정부서는 배지가 없어야 함(자료에 등장 안 함)
    expect(screen.queryByText('자료 1에서 만난 분')).not.toBeInTheDocument();
    expect(screen.queryByText('자료 6에서 만난 분')).not.toBeInTheDocument();
  });

  it('각 인물의 4개 정보(원하는것/이익/불이익/가치)가 표시된다', () => {
    render(<Step6 stakeholders={mockStakeholders} onComplete={() => {}} />);
    expect(screen.getByText('생계 안정, 경제성')).toBeInTheDocument(); // 임차상인 가치
    expect(screen.getByText('재산권, 투자 회수')).toBeInTheDocument(); // 건물주 가치
    expect(screen.getByText('예산 효율성, 재정 지속 가능성')).toBeInTheDocument(); // 재정부서 가치
  });

  it('다음 단계로 누르면 onComplete가 호출된다', () => {
    let called = false;
    render(<Step6 stakeholders={mockStakeholders} onComplete={() => (called = true)} />);
    fireEvent.click(screen.getByText('다음 단계로'));
    expect(called).toBe(true);
  });
});
