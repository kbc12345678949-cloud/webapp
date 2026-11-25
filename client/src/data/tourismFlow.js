// src/data/tourismFlow.js
// 관광정책 수행평가의 "흐름 규칙"을 한곳에 모아 둔다.
// - 서버에 저장할 답안 모양 정리(앞 단계를 고치면 뒤 단계 값도 맞춰짐)
// - 최종 제출 때 한꺼번에 확인하는 부족 문항 목록
// - 단계 이동 막대에 쓰는 단계 목록, 전체 질문 목록
import { policies, MIN_CHARS_STEP3 } from './policies';
import { hasRepeatedCharacterAbuse } from '../utils/textQuality';

export const MIN_STEP3 = MIN_CHARS_STEP3; // 실제 화면 기준(policies.js)과 같은 값
export const MIN_STEP5 = 75;
export const MIN_BRANCH_HAD = 45;
export const MIN_BRANCH_NONE = 90;
export const MIN_SELF = 45;
export const STAKEHOLDER_COUNT = 6;

// 단계 이동 막대에 나오는 단계 (STEP2는 짝 토론이라 화면이 없다). 10 = 내 답안 전체 확인
export const NAV_STEPS = [
  { no: 1, label: '1', title: '자료 분석' },
  { no: 3, label: '3', title: '1차 판단' },
  { no: 4, label: '4', title: '새로운 상황' },
  { no: 5, label: '5', title: '재판단' },
  { no: 6, label: '6', title: '이해관계자' },
  { no: 7, label: '7', title: '트레이드오프' },
  { no: 8, label: '8', title: '최종 결정' },
  { no: 9, label: '9', title: '성찰' },
  { no: 10, label: '확인', title: '내 답안 전체 확인' },
];
export const CHECK_STEP = 10;

export const screenOf = (no) => (no === CHECK_STEP ? 'check' : `step${no}`);
export const stepNoOf = (screen) => (screen === 'check' ? CHECK_STEP : Number(String(screen).replace('step', '')) || 0);
export const nextStepNo = (no) => {
  const i = NAV_STEPS.findIndex((s) => s.no === no);
  return i >= 0 && i < NAV_STEPS.length - 1 ? NAV_STEPS[i + 1].no : CHECK_STEP;
};
export const prevStepNo = (no) => {
  const i = NAV_STEPS.findIndex((s) => s.no === no);
  return i > 0 ? NAV_STEPS[i - 1].no : 1;
};

const len = (t) => (t || '').trim().length;

// 재판단에서 "유지"면 지금의 1차 판단 정책을 그대로 따른다.
// (1차 판단을 나중에 고쳐도 재판단 값이 옛 정책에 멈춰 있지 않게)
export function normalizedStep5(step3, step5) {
  if (!step5) return step5;
  if (step5.decision === 'keep') return { ...step5, choice: step3?.choice ?? null };
  return step5;
}

// 최종 결정의 최종 선택·예상 문제점·보완 방안은 재판단·트레이드오프에서 그대로 가져온다.
export function normalizedStep8(step3, step5, step7, step8) {
  const s5 = normalizedStep5(step3, step5);
  return {
    finalChoice: s5?.choice ?? null,
    coreReason: step8?.coreReason ?? '',
    expectedProblem: step7?.harmConcern ?? '',
    mitigationPlan: step7?.mitigation ?? '',
  };
}

// 서버에 저장할 단계별 답안. 아직 손대지 않은 단계는 넣지 않는다.
export function payloadsFor(a) {
  const out = {};
  if (a.step1) out.step1 = a.step1;
  if (a.step3 && (a.step3.choice || a.step3.reason)) out.step3 = a.step3;
  if (a.step4 && Object.keys(a.step4.budgetGiven || {}).length > 0) out.step4 = a.step4;
  if (a.step5 && (a.step5.decision || a.step5.reason)) out.step5 = normalizedStep5(a.step3, a.step5);
  if (a.step7 && (Object.keys(a.step7.classification || {}).length > 0 || a.step7.harmConcern || a.step7.mitigation)) {
    out.step7 = a.step7;
  }
  if (a.step8 && a.step8.coreReason) out.step8 = normalizedStep8(a.step3, a.step5, a.step7, a.step8);
  if (a.step9 && (a.step9.branch || a.step9.self1 || a.step9.self2 || a.step9.self3)) out.step9 = a.step9;
  return out;
}

function textIssue(text, min) {
  const n = len(text);
  if (n === 0) return '아직 쓰지 않았어요';
  if (min && n < min) return `${min - n}자 더 써야 해요 (${min}자 이상)`;
  if (hasRepeatedCharacterAbuse(text)) return '같은 글자가 반복되고 있어요';
  return null;
}

// 최종 제출 전에 한꺼번에 확인하는 부족 문항. fieldId는 화면의 입력칸 id(`field-${fieldId}`)와 같다.
export function collectIssues(a, stakeholderCount = STAKEHOLDER_COUNT) {
  const issues = [];
  const add = (step, fieldId, label, reason) => issues.push({ step, fieldId, label, reason });

  const s3 = a.step3 || {};
  if (!s3.choice) add(3, 't3-choice', '1차 판단 · 정책안 선택', '정책안을 고르지 않았어요');
  const r3 = textIssue(s3.reason, MIN_STEP3);
  if (r3) add(3, 't3-reason', '1차 판단 · 근거', r3);

  const s5 = a.step5 || {};
  if (!s5.decision) add(5, 't5-decision', '재판단 · 유지/변경', '유지 또는 변경을 고르지 않았어요');
  else if (s5.decision === 'change' && (!s5.choice || s5.choice === s3.choice)) {
    add(5, 't5-decision', '재판단 · 바꿀 정책', '바꿀 정책을 다시 골라 주세요');
  }
  const r5 = textIssue(s5.reason, MIN_STEP5);
  if (r5) add(5, 't5-reason', '재판단 · 이유', r5);

  const s7 = a.step7 || {};
  const classified = Object.keys(s7.classification || {}).length;
  if (classified < stakeholderCount) {
    add(7, 't7-classify', '트레이드오프 · 이해관계자 분류', `${stakeholderCount}명 중 ${classified}명만 분류했어요`);
  }
  const r7a = textIssue(s7.harmConcern);
  if (r7a) add(7, 't7-harm', '트레이드오프 · 불이익 집단의 불만', r7a);
  const r7b = textIssue(s7.mitigation);
  if (r7b) add(7, 't7-mitigation', '트레이드오프 · 보완책', r7b);

  const s8 = a.step8 || {};
  const r8 = textIssue(s8.coreReason);
  if (r8) add(8, 't8-core', '최종 결정 · 핵심 근거', r8);

  const s9 = a.step9 || {};
  if (s9.branch !== 'had' && s9.branch !== 'none') {
    add(9, 't9-branch', '성찰 · 짝과 의견이 갈렸나요', '있었다/없었다를 고르지 않았어요');
  } else if (s9.branch === 'had') {
    const x = textIssue(s9.hadPoint, MIN_BRANCH_HAD);
    if (x) add(9, 't9-hadPoint', '성찰 · 의견이 갈린 지점', x);
    const y = textIssue(s9.hadChanged, MIN_BRANCH_HAD);
    if (y) add(9, 't9-hadChanged', '성찰 · 논의 후 내 판단', y);
  } else {
    const x = textIssue(s9.noneReason, MIN_BRANCH_NONE);
    if (x) add(9, 't9-noneReason', '성찰 · 의견이 일치한 이유', x);
  }
  ['self1', 'self2', 'self3'].forEach((k, i) => {
    const x = textIssue(s9[k], MIN_SELF);
    if (x) add(9, `t9-${k}`, `성찰 · 돌아보기 ${i + 1}`, x);
  });
  return issues;
}

export const policyText = (id) => {
  const p = policies.find((x) => x.id === id);
  return p ? `${p.label} · ${p.title}` : '';
};

// 전체 질문 보기 (시작 화면·도구 막대)
export const TOURISM_QUESTIONS = [
  { step: 'STEP 1', title: '자료 분석', items: ['자료 7개를 읽고, 자료마다 확인 문제를 풀어요.'] },
  { step: 'STEP 3', title: '1차 판단', items: [`세 정책안 중 하나를 고르고, 그렇게 판단한 근거를 써요. (${MIN_CHARS_STEP3}자 이상)`] },
  { step: 'STEP 4', title: '새로운 상황', items: ['새로 도착한 자료 3개를 읽고, 예산표에서 포기할 항목을 직접 골라 봐요.'] },
  { step: 'STEP 5', title: '재판단', items: ['1차 판단을 유지할지 바꿀지 정하고, 그 이유를 써요. (75자 이상)'] },
  { step: 'STEP 6', title: '이해관계자 분석', items: ['정책으로 영향을 받는 6명의 입장을 읽어요.'] },
  {
    step: 'STEP 7',
    title: '트레이드오프 분석',
    items: ['6명을 혜택 집단·불이익 집단·상관없어 보임으로 나눠요.', '불이익 집단은 어떤 불만을 가질까요?', '그 불만을 줄이기 위한 보완책을 구체적으로 써요.'],
  },
  { step: 'STEP 8', title: '최종 결정', items: ['지금까지의 과정을 돌아보고, 최종 선택의 핵심 근거를 써요.'] },
  {
    step: 'STEP 9',
    title: '성찰',
    items: [
      '짝과 의견이 갈렸던 부분이 있었나요? (있었다면 갈린 지점과 논의 후 내 판단, 없었다면 일치한 이유)',
      '1차 판단에서 최종 결정까지, 내 생각을 가장 크게 흔든 자료나 순간은?',
      '이번 활동에서 가장 어려웠던 부분과 해결하려고 한 방법은?',
      '"정치적 판단을 내린다는 것"에 대해 새롭게 느낀 점은?',
    ],
  },
];
