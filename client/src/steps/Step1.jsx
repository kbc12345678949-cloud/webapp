// src/steps/Step1.jsx
import { useState, useEffect, useRef } from 'react';
import ProgressHeader from '../components/ProgressHeader';
import MaterialIcon from '../components/MaterialIcon';
import MaterialChart from '../components/MaterialChart';
import { fetchMaterials } from '../api';

const AUTO_ADVANCE_DELAY = 700; // 정답을 맞춘 뒤 다음 자료로 넘어가기 전 잠깐 보여주는 시간(ms)

// 문제 유형별로 실제 정답과 맞는지 판정한다. 단답형은 공백을 무시하고 비교한다.
function isCorrectAnswer(q, answer) {
  if (answer === undefined || answer === null || answer === '') return false;
  if (q.question_type === 'mc') return Number(answer) === Number(q.answer);
  if (q.question_type === 'ox') return answer === (q.answer === 'true');
  if (q.question_type === 'short') {
    return String(answer).trim().replace(/\s/g, '') === String(q.answer).trim().replace(/\s/g, '');
  }
  return false;
}

const cardStyle = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card)',
  padding: '18px',
  marginBottom: 18,
};

function OXButtons({ selected, correctValue, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {[
        { label: 'O', value: true },
        { label: 'X', value: false },
      ].map((opt) => {
        const isSelected = selected === opt.value;
        const isCorrectOption = correctValue !== undefined && opt.value === correctValue;
        const showResult = selected !== undefined;
        let bg = 'var(--color-card)';
        let border = 'var(--color-border)';
        let color = 'var(--color-text)';
        if (showResult && isSelected) {
          bg = isCorrectOption ? 'var(--color-teal)' : 'var(--color-coral)';
          border = bg;
          color = '#FFFFFF';
        } else if (showResult && isCorrectOption) {
          border = 'var(--color-teal)';
        }
        return (
          <button
            key={opt.label}
            onClick={() => onSelect(opt.value)}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 8,
              border: `1.5px solid ${border}`,
              background: bg,
              color,
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function MCOptions({ options, selectedIndex, correctIndex, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map((opt, i) => {
        const isSelected = selectedIndex === i;
        const isCorrectOption = i === correctIndex;
        const showResult = selectedIndex !== undefined;
        let bg = 'var(--color-card)';
        let border = 'var(--color-border)';
        let color = 'var(--color-text)';
        if (showResult && isSelected) {
          bg = isCorrectOption ? 'var(--color-teal)' : 'var(--color-coral)';
          border = bg;
          color = '#FFFFFF';
        } else if (showResult && isCorrectOption) {
          border = 'var(--color-teal)';
        }
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: 8,
              border: `1.5px solid ${border}`,
              background: bg,
              color,
              fontSize: 13.5,
            }}
          >
            {i + 1}. {opt}
          </button>
        );
      })}
    </div>
  );
}

function QuestionBlock({ q, answer, onChange }) {
  const correctIndex = q.question_type === 'mc' && q.answer !== undefined ? Number(q.answer) : undefined;
  const correctBool = q.question_type === 'ox' && q.answer !== undefined ? q.answer === 'true' : undefined;

  return (
    <div style={{ marginTop: 14 }}>
      <p style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 500, margin: '0 0 8px' }}>
        {q.prompt}
      </p>
      {q.question_type === 'ox' && (
        <OXButtons selected={answer} correctValue={correctBool} onSelect={onChange} />
      )}
      {q.question_type === 'mc' && (
        <MCOptions options={q.options} selectedIndex={answer} correctIndex={correctIndex} onSelect={onChange} />
      )}
      {q.question_type === 'short' && (
        <>
          <input
            type="text"
            value={answer || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="답을 입력하세요"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1.5px solid var(--color-border)',
              fontSize: 13.5,
              fontFamily: 'var(--font-family)',
            }}
          />
          <p style={{ fontSize: 12, color: 'var(--color-teal)', margin: '6px 0 0' }}>정답: {q.answer}</p>
        </>
      )}
    </div>
  );
}

export default function Step1({ onComplete, student, token, projectId, trackId, stepId }) {
  const [materials, setMaterials] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { materialKey: [answer, answer, ...] }
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const autoAdvancedRef = useRef(new Set());
  const goNextRef = useRef(() => {});

  useEffect(() => {
    if (!token || !projectId) return;
    fetchMaterials(token, projectId, { trackId, stepId })
      .then(setMaterials)
      .catch((err) => setLoadError(err.message));
  }, [token, projectId, trackId, stepId]);

  // 자료가 아직 로딩 중이어도(= materials가 null이어도) 훅 호출 순서는 항상 동일해야 하므로,
  // 아래 계산들은 materials 유무와 무관하게 안전하게 처리한다.
  const material = materials?.[index];
  const currentAnswers = material ? answers[material.material_key] || [] : [];
  const allCorrect =
    !!material &&
    material.questions.length > 0 &&
    material.questions.every((q, i) => isCorrectAnswer(q, currentAnswers[i]));

  // 확인 문제를 전부 맞히면, 같은 자료를 다시 볼 때(이전 자료로 되돌아왔을 때)는
  // 자동으로 튕겨나가지 않도록 "이미 자동 전환된 자료" 목록을 기억해둔다.
  useEffect(() => {
    if (!allCorrect || autoAdvancedRef.current.has(index)) {
      setAutoAdvancing(false);
      return;
    }
    autoAdvancedRef.current.add(index);
    setAutoAdvancing(true);
    const timer = setTimeout(() => {
      setAutoAdvancing(false);
      goNextRef.current();
    }, AUTO_ADVANCE_DELAY);
    return () => clearTimeout(timer);
  }, [allCorrect, index]);

  if (loadError) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--color-coral)', fontSize: 14 }}>{loadError}</p>
      </div>
    );
  }
  if (!materials) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-body)' }}>
        자료를 불러오는 중...
      </div>
    );
  }

  const isLast = index === materials.length - 1;
  const isFirst = index === 0;

  const setAnswer = (qIdx, value) => {
    setAnswers((prev) => {
      const arr = prev[material.material_key] ? [...prev[material.material_key]] : [];
      arr[qIdx] = value;
      return { ...prev, [material.material_key]: arr };
    });
  };

  const goNext = () => {
    if (isLast) {
      onComplete(answers);
    } else {
      setIndex((i) => i + 1);
    }
  };
  goNextRef.current = goNext;

  const goPrev = () => {
    if (!isFirst) setIndex((i) => i - 1);
  };

  return (
    <div>
      <ProgressHeader projectLabel="TF팀 브리핑" currentStep={1} totalSteps={9} studentNo={student?.studentNo} studentName={student?.name} />

      {/* 자료 진행 점 표시 */}
      <div style={{ display: 'flex', gap: 6, padding: '14px 20px 0' }}>
        {materials.map((m, i) => (
          <div
            key={m.material_key}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i <= index ? 'var(--color-teal)' : 'var(--color-border)',
            }}
          />
        ))}
      </div>

      <div style={{ padding: '16px 20px 26px' }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <MaterialIcon type={material.icon} />
            <span style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--color-navy)' }}>
              {material.title}
            </span>
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--color-text-body)', margin: 0 }}>
            {material.body}
          </p>
          <MaterialChart materialKey={material.material_key} />
        </div>

        <div style={cardStyle}>
          <p style={{ fontSize: 11.5, color: 'var(--color-teal)', fontWeight: 500, margin: '0 0 4px' }}>
            확인 문제
          </p>
          {material.questions.map((q, qIdx) => (
            <QuestionBlock
              key={q.id}
              q={q}
              answer={answers[material.material_key]?.[qIdx]}
              onChange={(v) => setAnswer(qIdx, v)}
            />
          ))}
        </div>

        {autoAdvancing && (
          <p style={{ fontSize: 12.5, color: 'var(--color-teal)', textAlign: 'center', margin: '0 0 8px' }}>
            정답입니다! 잠시 후 {isLast ? '다음 단계로' : '다음 자료로'} 넘어갑니다...
          </p>
        )}
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
            이전 자료
          </button>
          <button
            onClick={goNext}
            disabled={!allCorrect}
            style={{
              flex: 2,
              background: allCorrect ? 'var(--color-navy)' : 'var(--color-border)',
              color: allCorrect ? 'var(--color-navy-text-on)' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-button)',
              padding: 14,
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            {isLast ? '자료 확인 완료' : '다음 자료'}
          </button>
        </div>
        {!allCorrect && (
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8, textAlign: 'center' }}>
            확인 문제를 맞혀야 다음 자료로 넘어갈 수 있어요.
          </p>
        )}
      </div>
    </div>
  );
}
