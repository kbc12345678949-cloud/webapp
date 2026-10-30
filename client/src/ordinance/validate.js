// src/ordinance/validate.js
// 최종 제출 버튼을 누를 때만 쓰는 검사. 평소 화면 이동은 막지 않는다.
// 글자 수는 "띄어쓰기 포함, 앞뒤 빈칸만 빼고 센 글자 수" (관광정책과 같은 방식).
import { STAGES, MATERIAL_KEYS, MATERIAL_KIND } from './content';
import { hasRepeatedCharacterAbuse } from '../utils/textQuality';

export function countChars(text) {
  return String(text || '').trim().length;
}

function shortPrompt(prompt, n = 26) {
  const p = prompt.replace(/\s+/g, ' ');
  return p.length > n ? `${p.slice(0, n)}…` : p;
}

// 문항 하나(일반 서술형)의 상태: null이면 통과
export function textIssue(text, min) {
  const len = countChars(text);
  if (len < min) return `글자 수가 부족해요 (${len} / ${min}자)`;
  if (hasRepeatedCharacterAbuse(text)) return '같은 글자가 반복되고 있어요';
  return null;
}

// 6-1 근거 정리의 부족한 점들. [{ fieldId, reason }]
export function evidenceIssues(answer, min) {
  const checked = MATERIAL_KEYS.filter((k) => (answer?.checked || []).includes(k));
  if (checked.length === 0) return [{ fieldId: '6-1', reason: '근거 자료를 1개 이상 체크해 주세요' }];
  const out = [];
  for (const k of checked) {
    const text = answer?.reasons?.[k] || '';
    const len = countChars(text);
    const label = MATERIAL_KIND[k].no;
    if (len < min) out.push({ fieldId: `6-1-${k}`, reason: `체크한 자료 '${label}'의 설명이 부족해요 (${len} / ${min}자)` });
    else if (hasRepeatedCharacterAbuse(text))
      out.push({ fieldId: `6-1-${k}`, reason: `체크한 자료 '${label}'의 설명에 같은 글자가 반복되고 있어요` });
  }
  return out;
}

// 전체 답안에서 부족한 문항 목록을 만든다.
// 반환: [{ stage, questionId, fieldId, label, reason }]
export function collectIssues(answers) {
  const issues = [];
  for (const stage of STAGES) {
    const a = answers?.[stage.stepKey] || {};
    for (const q of stage.questions) {
      const label = `${stage.no}단계 ${q.id}. ${shortPrompt(q.prompt)}`;
      if (q.type === 'evidence') {
        for (const it of evidenceIssues(a, q.min)) {
          issues.push({ stage: stage.no, questionId: q.id, fieldId: it.fieldId, label, reason: it.reason });
        }
      } else {
        const reason = textIssue(a[q.field], q.min);
        if (reason) issues.push({ stage: stage.no, questionId: q.id, fieldId: q.id, label, reason });
      }
    }
  }
  return issues;
}

// 단계가 모두 채워졌는지 (단계 번호 옆 ✓ 표시용)
export function isStageComplete(stage, answers) {
  return collectIssues(answers).every((i) => i.stage !== stage.no);
}
