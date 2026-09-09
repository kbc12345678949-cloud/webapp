// src/steps/Step9.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Step9 from './Step9';

vi.mock('../api', () => ({
  saveResponse: vi.fn(() => Promise.resolve({ saved: true })),
  submitFinal: vi.fn(() => Promise.resolve({})),
}));

const STEP_PROPS = { token: 'fake-token', enrollmentId: 1, stepId: 1 };

const LEN30 = '이 문장은 서른 글자를 채우기 위해 적당히 길게 늘려 쓴 문장입니다.'; // >=30자
const LEN60 =
  '같은 자료를 보고도 서로 다른 결론에 도달할 수 있었는데, 짝과 이야기해보니 결국 비슷한 이유로 같은 정책을 선택했다는 걸 알게 되었다.'; // >=60자

describe('Step9 성찰', () => {
  it('분기 선택 전에는 하위 질문이 보이지 않는다', () => {
    render(<Step9 {...STEP_PROPS} onSubmit={() => {}} />);
    expect(screen.queryByText(/어떤 지점에서 의견이 갈렸고/)).not.toBeInTheDocument();
    expect(screen.queryByText(/짝과 의견이 일치한 이유/)).not.toBeInTheDocument();
  });

  it('"있었다"를 고르면 2개 질문이, "없었다"를 고르면 1개 질문이 나온다', () => {
    render(<Step9 {...STEP_PROPS} onSubmit={() => {}} />);
    fireEvent.click(screen.getByText('있었다'));
    expect(screen.getByText(/어떤 지점에서 의견이 갈렸고/)).toBeInTheDocument();
    expect(screen.getByText(/논의 후 내 판단이 달라졌나요/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('없었다'));
    expect(screen.queryByText(/어떤 지점에서 의견이 갈렸고/)).not.toBeInTheDocument();
    expect(screen.getByText(/짝과 의견이 일치한 이유/)).toBeInTheDocument();
  });

  it('두 경로의 최소 글자 수 총합이 똑같다(있었다: 30+30, 없었다: 60)', () => {
    render(<Step9 {...STEP_PROPS} onSubmit={() => {}} />);
    fireEvent.click(screen.getByText('있었다'));
    // 분기 질문 2개(30자) + 자기성찰 3개(30자) = 총 5개
    expect(screen.getAllByText('0 / 30자 이상').length).toBe(5);

    fireEvent.click(screen.getByText('없었다'));
    // 분기 질문 1개(60자) + 자기성찰 3개(30자, 그대로 유지)
    expect(screen.getByText('0 / 60자 이상')).toBeInTheDocument();
    expect(screen.getAllByText('0 / 30자 이상').length).toBe(3);
  });

  it('모든 조건을 채우기 전엔 최종 제출 버튼이 비활성화된다', () => {
    render(<Step9 {...STEP_PROPS} onSubmit={() => {}} />);
    expect(screen.getByText('최종 제출하기')).toBeDisabled();
  });

  it('"없었다" 경로 + 자기성찰 3개를 다 채우면 제출 확인 팝업이 뜬다', () => {
    render(<Step9 {...STEP_PROPS} onSubmit={() => {}} />);
    fireEvent.click(screen.getByText('없었다'));
    fireEvent.change(screen.getByPlaceholderText(/같은 자료를 보고 같은 결론에/), {
      target: { value: LEN60 },
    });
    const selfBoxes = screen.getAllByRole('textbox').filter((el) => el.placeholder === '');
    // 자기성찰 3개는 placeholder가 없으므로 순서대로 채운다
    fireEvent.change(selfBoxes[0], { target: { value: LEN30 } });
    fireEvent.change(selfBoxes[1], { target: { value: LEN30 } });
    fireEvent.change(selfBoxes[2], { target: { value: LEN30 } });

    fireEvent.click(screen.getByText('최종 제출하기'));
    expect(screen.getByText('최종 제출하시겠습니까?')).toBeInTheDocument();
    expect(screen.getByText('최종 제출 후에는 답안을 수정할 수 없습니다.')).toBeInTheDocument();
  });

  it('팝업에서 "취소"를 누르면 제출되지 않고 팝업만 닫힌다', async () => {
    let submitted = false;
    render(<Step9 {...STEP_PROPS} onSubmit={() => (submitted = true)} />);
    fireEvent.click(screen.getByText('없었다'));
    fireEvent.change(screen.getByPlaceholderText(/같은 자료를 보고 같은 결론에/), {
      target: { value: LEN60 },
    });
    const selfBoxes = screen.getAllByRole('textbox').filter((el) => el.placeholder === '');
    selfBoxes.forEach((box) => fireEvent.change(box, { target: { value: LEN30 } }));

    fireEvent.click(screen.getByText('최종 제출하기'));
    fireEvent.click(screen.getByText('취소'));
    expect(screen.queryByText('최종 제출하시겠습니까?')).not.toBeInTheDocument();
    expect(submitted).toBe(false);
  });

  it('팝업에서 "제출"을 누르면 onSubmit이 정확한 데이터로 호출된다', async () => {
    let result = null;
    render(<Step9 {...STEP_PROPS} onSubmit={(d) => (result = d)} />);
    fireEvent.click(screen.getByText('없었다'));
    fireEvent.change(screen.getByPlaceholderText(/같은 자료를 보고 같은 결론에/), {
      target: { value: LEN60 },
    });
    const selfBoxes = screen.getAllByRole('textbox').filter((el) => el.placeholder === '');
    selfBoxes.forEach((box) => fireEvent.change(box, { target: { value: LEN30 } }));

    fireEvent.click(screen.getByText('최종 제출하기'));
    fireEvent.click(screen.getByText('제출'));

    await vi.waitFor(() => expect(result).not.toBeNull());
    expect(result.branch).toBe('none');
    expect(result.noneReason).toBe(LEN60);
    expect(result.self1).toBe(LEN30);
    expect(result.hadPoint).toBeUndefined();
  });
});
