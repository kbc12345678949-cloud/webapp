// src/steps/Step9.jsx
import { useState, useEffect } from 'react';
import ProgressHeader from '../components/ProgressHeader';
import { saveResponse, submitFinal } from '../api';
import { hasRepeatedCharacterAbuse } from '../utils/textQuality';
import ReviewPanel from '../components/ReviewPanel';
import HintQuestions from '../components/HintQuestions';

const MIN_BRANCH_HAD = 45; // "있었다" 경로: 질문 2개 × 45자 = 90자
const MIN_BRANCH_NONE = 90; // "없었다" 경로: 질문 1개 × 90자 = 90자 (동일 총량)
const MIN_SELF = 45;

function TextField({ label, value, onChange, min, placeholder, hints }) {
  const count = value.trim().length;
  const abuse = hasRepeatedCharacterAbuse(value);
  const ok = count >= min && !abuse;
  return (
    <div>
      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 8px' }}>{label}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        placeholder={placeholder}
        style={{
          width: '100%',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: 10,
          fontSize: 13.5,
          fontFamily: 'var(--font-family)',
          resize: 'vertical',
        }}
      />
      {abuse ? (
        <span style={{ fontSize: 11.5, color: 'var(--color-coral)' }}>
          같은 글자가 반복되고 있어요. 내용을 구체적으로 써주세요.
        </span>
      ) : (
        <span style={{ fontSize: 11.5, color: ok ? 'var(--color-teal)' : 'var(--color-text-muted)' }}>
          {count} / {min}자 이상
        </span>
      )}
      <HintQuestions questions={hints} />
    </div>
  );
}

export default function Step9({ onSubmit, onBack, student, token, enrollmentId, stepId, initialAnswer, onDraftChange, step3Answer, step5Answer, step7Answer, step8Answer, stakeholders, budgetGiven }) {
  const [branch, setBranch] = useState(initialAnswer?.branch ?? null);
  const [hadPoint, setHadPoint] = useState(initialAnswer?.hadPoint ?? '');
  const [hadChanged, setHadChanged] = useState(initialAnswer?.hadChanged ?? '');
  const [noneReason, setNoneReason] = useState(initialAnswer?.noneReason ?? '');
  const [self1, setSelf1] = useState(initialAnswer?.self1 ?? '');
  const [self2, setSelf2] = useState(initialAnswer?.self2 ?? '');
  const [self3, setSelf3] = useState(initialAnswer?.self3 ?? '');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [index, setIndex] = useState(0); // STEP1처럼, 질문을 하나씩 넘겨보는 방식

  const branchOk =
    branch === 'had'
      ? hadPoint.trim().length >= MIN_BRANCH_HAD &&
        !hasRepeatedCharacterAbuse(hadPoint) &&
        hadChanged.trim().length >= MIN_BRANCH_HAD &&
        !hasRepeatedCharacterAbuse(hadChanged)
      : branch === 'none'
      ? noneReason.trim().length >= MIN_BRANCH_NONE && !hasRepeatedCharacterAbuse(noneReason)
      : false;

  const selfOk =
    self1.trim().length >= MIN_SELF &&
    !hasRepeatedCharacterAbuse(self1) &&
    self2.trim().length >= MIN_SELF &&
    !hasRepeatedCharacterAbuse(self2) &&
    self3.trim().length >= MIN_SELF &&
    !hasRepeatedCharacterAbuse(self3);

  const canSubmit = branchOk && selfOk;

  const finalPayload = {
    branch,
    hadPoint: branch === 'had' ? hadPoint : undefined,
    hadChanged: branch === 'had' ? hadChanged : undefined,
    noneReason: branch === 'none' ? noneReason : undefined,
    self1,
    self2,
    self3,
  };

  useEffect(() => {
    onDraftChange?.(finalPayload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, hadPoint, hadChanged, noneReason, self1, self2, self3]);

  // 페이지 구성: branch 선택에 따라 뒤에 올 질문 구성이 달라진다.
  // (하나씩 자유롭게 앞뒤로 오갈 수 있고, 한 방향으로만 진행하는 게 아니다)
  const pages = ['branch'];
  if (branch === 'had') pages.push('hadPoint', 'hadChanged');
  else if (branch === 'none') pages.push('noneReason');
  pages.push('self1', 'self2', 'self3');

  const page = pages[Math.min(index, pages.length - 1)];
  const isFirst = index === 0;
  const isLast = index === pages.length - 1;
  const branchChosen = branch === 'had' || branch === 'none';

  const goPrev = () => {
    if (!isFirst) setIndex((i) => i - 1);
  };
  const goNext = () => {
    if (page === 'branch' && !branchChosen) return; // 분기를 골라야 다음으로 갈 수 있다
    if (!isLast) setIndex((i) => i + 1);
  };

  return (
    <div>
      <ProgressHeader projectLabel="TF팀 브리핑" currentStep={9} totalSteps={9} studentNo={student?.studentNo} studentName={student?.name} />
      <div style={{ padding: '20px 20px 26px' }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              display: 'block',
              background: 'none',
              border: 'none',
              color: 'var(--color-teal)',
              fontSize: 13,
              padding: 0,
              marginBottom: 14,
              cursor: 'pointer',
            }}
          >
            ← 이전 단계로 (최종 결정 다시 보기)
          </button>
        )}
        <ReviewPanel
          currentStep={9}
          step3Answer={step3Answer}
          step5Answer={step5Answer}
          step7Answer={step7Answer}
          step8Answer={step8Answer}
          stakeholders={stakeholders}
          budgetGiven={budgetGiven}
        />
        <h3 style={{ color: 'var(--color-navy)', fontSize: 17, fontWeight: 500, margin: '0 0 4px' }}>
          성찰
        </h3>
        <p style={{ color: 'var(--color-text-body)', fontSize: 13, margin: '0 0 16px' }}>
          마지막 단계입니다. 오늘의 판단 과정을 돌아봐 주세요. ({index + 1} / {pages.length})
        </p>

        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: 18,
            marginBottom: 20,
            minHeight: 220,
          }}
        >
          {page === 'branch' && (
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 12px' }}>
                짝과 의견이 갈렸던 부분이 있었나요?
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { key: 'had', label: '있었다' },
                  { key: 'none', label: '없었다' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setBranch(opt.key)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: 8,
                      border: `1.5px solid ${branch === opt.key ? 'var(--color-navy)' : 'var(--color-border)'}`,
                      background: branch === opt.key ? 'var(--color-navy)' : 'var(--color-card)',
                      color: branch === opt.key ? 'var(--color-navy-text-on)' : 'var(--color-text)',
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {page === 'hadPoint' && (
            <TextField
              label="어떤 지점에서 의견이 갈렸고, 짝의 근거는 무엇이었나요?"
              value={hadPoint}
              onChange={setHadPoint}
              min={MIN_BRANCH_HAD}
              placeholder="갈린 지점과 짝의 근거를 써주세요."
              hints={[
                '짝의 주장 중 가장 설득력 있었던 부분은 무엇이었나요?',
                '나와 짝은 같은 자료를 보고도 왜 다른 결론에 도달했을까요?',
              ]}
            />
          )}

          {page === 'hadChanged' && (
            <TextField
              label="논의 후 내 판단이 달라졌나요, 그대로였나요? 그 이유는?"
              value={hadChanged}
              onChange={setHadChanged}
              min={MIN_BRANCH_HAD}
              placeholder="판단 변화 여부와 이유를 써주세요."
              hints={['짝의 근거를 듣고 나서도 내 생각을 지켰다면, 그 이유는 무엇인가요?']}
            />
          )}

          {page === 'noneReason' && (
            <TextField
              label="짝과 의견이 일치한 이유는 무엇이라고 생각하나요?"
              value={noneReason}
              onChange={setNoneReason}
              min={MIN_BRANCH_NONE}
              placeholder="같은 자료를 보고 같은 결론에 도달한 것인지, 논의 과정에서 한쪽으로 맞춰진 것인지 서술해주세요."
              hints={[
                '같은 자료를 봐서 같은 결론에 도달한 건지, 원래부터 비슷한 생각을 갖고 있었던 건지 구분해서 생각해보세요.',
                '짝과 대화하면서, 서로 다른 부분에서 같은 결론에 도달했다는 걸 발견했나요?',
              ]}
            />
          )}

          {page === 'self1' && (
            <TextField
              label="1차 판단에서 최종 결정까지 오는 동안, 내 생각을 가장 크게 흔든 자료나 순간은 무엇이었나요?"
              value={self1}
              onChange={setSelf1}
              min={MIN_SELF}
              hints={[
                '자료 하나였나요, 아니면 짝과의 대화였나요? 그 순간을 구체적으로 떠올려보세요.',
                '그 자료나 순간이 없었다면, 최종 결정이 달라졌을까요?',
              ]}
            />
          )}

          {page === 'self2' && (
            <TextField
              label="이번 활동에서 가장 어려웠던 부분은 무엇이었고, 어떻게 해결하려고 했나요?"
              value={self2}
              onChange={setSelf2}
              min={MIN_SELF}
              hints={[
                '그 어려움을 해결하기 위해 실제로 어떤 행동을 했나요?',
                '그 어려움이 특정 STEP(예: 트레이드오프 분석)에서 유독 컸다면, 왜 그랬을까요?',
              ]}
            />
          )}

          {page === 'self3' && (
            <TextField
              label='이번 활동을 통해 "정치적 판단을 내린다는 것"에 대해 새롭게 느낀 점이 있다면?'
              value={self3}
              onChange={setSelf3}
              min={MIN_SELF}
              hints={[
                '수업 전에 갖고 있던 생각과 비교해서, 달라진 부분이 있다면 무엇인가요?',
                '"정치적 판단"이 생각보다 쉬웠나요, 어려웠나요? 그 이유는?',
              ]}
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={goPrev}
            disabled={isFirst}
            style={{
              flex: 1,
              background: isFirst ? 'var(--color-border)' : '#FFFFFF',
              color: isFirst ? 'var(--color-text-muted)' : 'var(--color-navy)',
              border: `1.5px solid ${isFirst ? 'var(--color-border)' : 'var(--color-navy)'}`,
              borderRadius: 'var(--radius-button)',
              padding: 14,
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            이전 질문
          </button>
          {isLast ? (
            <button
              disabled={!canSubmit}
              onClick={() => setShowConfirm(true)}
              style={{
                flex: 2,
                background: canSubmit ? 'var(--color-navy)' : 'var(--color-border)',
                color: canSubmit ? 'var(--color-navy-text-on)' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-button)',
                padding: 14,
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              최종 제출하기
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={page === 'branch' && !branchChosen}
              style={{
                flex: 2,
                background: page === 'branch' && !branchChosen ? 'var(--color-border)' : 'var(--color-navy)',
                color: page === 'branch' && !branchChosen ? 'var(--color-text-muted)' : 'var(--color-navy-text-on)',
                border: 'none',
                borderRadius: 'var(--radius-button)',
                padding: 14,
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              다음 질문
            </button>
          )}
        </div>
        {isLast && !canSubmit && (
          <p style={{ fontSize: 12, color: 'var(--color-coral)', marginTop: 8, textAlign: 'center' }}>
            아직 다 채우지 못한 질문이 있어요. "이전 질문"으로 돌아가서 확인해주세요.
          </p>
        )}
      </div>

      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(27,42,65,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 'var(--radius-card)',
              padding: 22,
              maxWidth: 320,
              width: '100%',
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 10px' }}>
              최종 제출하시겠습니까?
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-body)', lineHeight: 1.6, margin: '0 0 20px' }}>
              최종 제출 후에는 답안을 수정할 수 없습니다.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  border: '1.5px solid var(--color-border)',
                  background: '#FFFFFF',
                  color: 'var(--color-text)',
                  fontSize: 14,
                }}
              >
                취소
              </button>
              <button
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);
                  setSubmitError('');
                  try {
                    await saveResponse(token, enrollmentId, stepId, finalPayload);
                    await submitFinal(token, enrollmentId);
                    setShowConfirm(false);
                    onSubmit(finalPayload);
                  } catch (err) {
                    setSubmitError(err.message);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--color-navy)',
                  color: 'var(--color-navy-text-on)',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                제출
              </button>
            </div>
            {submitting && (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10, textAlign: 'center' }}>
                제출 처리 중입니다...
              </p>
            )}
            {submitError && (
              <p style={{ fontSize: 12, color: 'var(--color-coral)', marginTop: 10, textAlign: 'center' }}>
                제출에 실패했습니다: {submitError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
