// src/utils/textQuality.js
// "아아아아아아..." 처럼 같은 글자만 반복해서 글자 수만 채우는 답안을 걸러낸다.
// 두 가지 방식으로 판정한다:
// ① 전체 글자 중 가장 많이 나온 한 글자의 비중이 너무 높은 경우
// ② 같은 글자가 연속으로 너무 길게 이어지는 경우
// 정상적인 한국어 문장에서는 어떤 한 글자가 이 정도로 몰리지 않는다.

const MAX_SINGLE_CHAR_RATIO = 0.4; // 공백 제외 전체 글자 중 40% 넘게 같은 글자면 반복으로 판정
const MAX_CONSECUTIVE_RUN = 8; // 같은 글자가 8번 넘게 연속되면 반복으로 판정

export function hasRepeatedCharacterAbuse(text) {
  const stripped = String(text || '').replace(/\s/g, '');
  if (stripped.length < 10) return false; // 너무 짧으면 판정하지 않음(어차피 최소 글자수에서 걸러짐)

  const counts = {};
  let maxRun = 1;
  let currentRun = 1;
  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    counts[ch] = (counts[ch] || 0) + 1;
    if (i > 0 && stripped[i] === stripped[i - 1]) {
      currentRun++;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 1;
    }
  }
  const maxCount = Math.max(...Object.values(counts));
  const ratio = maxCount / stripped.length;

  return ratio > MAX_SINGLE_CHAR_RATIO || maxRun > MAX_CONSECUTIVE_RUN;
}
