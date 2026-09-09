// src/steps/Step4.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Step4 from './Step4';
import { step4Materials } from '../data/step4Materials';

vi.mock('../api', () => ({
  fetchMaterials: vi.fn(() =>
    Promise.resolve(
      step4Materials.map((m) => ({ material_key: m.key, title: m.title, body: m.body }))
    )
  ),
}));

const STEP_PROPS = { token: 'fake-token', projectId: 1, stepId: 4 };

describe('Step4 새로운 상황', () => {
  it('처음엔 알림 화면(속보)이 뜨고, 자료는 아직 안 보인다', () => {
    render(<Step4 {...STEP_PROPS} previousChoice="B" onComplete={() => {}} />);
    expect(screen.getByText('속보')).toBeInTheDocument();
    expect(screen.getByText('팀장으로부터 메시지')).toBeInTheDocument();
    expect(screen.queryByText('임대료 추이 자료')).not.toBeInTheDocument();
  });

  it('개인화 문구가 STEP3에서 고른 정책(B안)을 정확히 반영한다', () => {
    render(<Step4 {...STEP_PROPS} previousChoice="B" onComplete={() => {}} />);
    expect(screen.getByText(/B안\(관리형 관광\)/)).toBeInTheDocument();
  });

  it('다른 정책(A안)을 골랐을 땐 문구도 그에 맞게 바뀐다', () => {
    render(<Step4 {...STEP_PROPS} previousChoice="A" onComplete={() => {}} />);
    expect(screen.getByText(/A안\(관광 확대\)/)).toBeInTheDocument();
  });

  it('"확인하기"를 누르면 새 자료 3장이 나타난다', async () => {
    render(<Step4 {...STEP_PROPS} previousChoice="C" onComplete={() => {}} />);
    fireEvent.click(screen.getByText('확인하기'));
    expect(await screen.findByText('임대료 추이 자료')).toBeInTheDocument();
    expect(screen.getByText('재정 부서 메모')).toBeInTheDocument();
    expect(screen.getByText('주민 여론조사')).toBeInTheDocument();
  });

  it('자료 확인 후 다음 단계로 누르면 onComplete가 호출된다', async () => {
    let called = false;
    render(<Step4 {...STEP_PROPS} previousChoice="C" onComplete={() => (called = true)} />);
    fireEvent.click(screen.getByText('확인하기'));
    await screen.findByText('임대료 추이 자료');
    fireEvent.click(screen.getByText('다음 단계로'));
    expect(called).toBe(true);
  });
});
