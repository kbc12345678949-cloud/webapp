// src/steps/Step1.jsx
import { useState, useEffect } from 'react';
import ProgressHeader from '../components/ProgressHeader';
import MaterialIcon from '../components/MaterialIcon';
import { fetchMaterials } from '../api';

const cardStyle = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card)',
  padding: '18px',
  marginBottom: 18,
};

function OXButtons({ selected, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {[
        { label: 'O', value: true },
        { label: 'X', value: false },
      ].map((opt) => (
        <button
          key={opt.label}
          onClick={() => onSelect(opt.value)}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 8,
            border: `1.5px solid ${selected === opt.value ? 'var(--color-navy)' : 'var(--color-border)'}`,
            background: selected === opt.value ? 'var(--color-navy)' : 'var(--color-card)',
            color: selected === opt.value ? 'var(--color-navy-text-on)' : 'var(--color-text)',
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MCOptions({ options, selectedIndex, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          style={{
            textAlign: 'left',
            padding: '10px 12px',
            borderRadius: 8,
            border: `1.5px solid ${selectedIndex === i ? 'var(--color-navy)' : 'var(--color-border)'}`,
            background: selectedIndex === i ? 'var(--color-navy)' : 'var(--color-card)',
            color: selectedIndex === i ? 'var(--color-navy-text-on)' : 'var(--color-text)',
            fontSize: 13.5,
          }}
        >
          {i + 1}. {opt}
        </button>
      ))}
    </div>
  );
}

function QuestionBlock({ q, answer, onChange }) {
  return (
    <div style={{ marginTop: 14 }}>
      <p style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 500, margin: '0 0 8px' }}>
        {q.prompt}
      </p>
      {q.question_type === 'ox' && <OXButtons selected={answer} onSelect={onChange} />}
      {q.question_type === 'mc' && <MCOptions options={q.options} selectedIndex={answer} onSelect={onChange} />}
      {q.question_type === 'short' && (
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
      )}
    </div>
  );
}

export default function Step1({ onComplete, student, token, projectId, trackId, stepId }) {
  const [materials, setMaterials] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { materialKey: [answer, answer, ...] }

  useEffect(() => {
    if (!token || !projectId) return;
    fetchMaterials(token, projectId, { trackId, stepId })
      .then(setMaterials)
      .catch((err) => setLoadError(err.message));
  }, [token, projectId, trackId, stepId]);

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

  const material = materials[index];
  const isLast = index === materials.length - 1;

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

        <button
          onClick={goNext}
          style={{
            width: '100%',
            background: 'var(--color-navy)',
            color: 'var(--color-navy-text-on)',
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
    </div>
  );
}
