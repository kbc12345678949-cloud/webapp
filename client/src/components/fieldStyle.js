// src/components/fieldStyle.js
// 관광정책 서술형 입력칸 공통 모양.
// 글자 크기는 16px: 아이폰은 16px보다 작은 입력칸을 누르면 화면을 확대해 버리기 때문.
export function textareaStyle(readOnly = false) {
  return {
    width: '100%',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    lineHeight: 1.6,
    fontFamily: 'var(--font-family)',
    resize: 'vertical',
    background: readOnly ? '#F4F5F7' : '#FFFFFF',
    color: readOnly ? 'var(--color-text-body)' : 'var(--color-text)',
    cursor: readOnly ? 'default' : 'text',
  };
}
