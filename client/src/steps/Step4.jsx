// src/steps/Step4.jsx
import { useState, useEffect } from 'react';
import ProgressHeader from '../components/ProgressHeader';
import { policies } from '../data/policies';
import { fetchMaterials } from '../api';

export default function Step4({ previousChoice, onComplete, student, token, projectId, stepId }) {
  const [phase, setPhase] = useState('alert'); // 'alert' | 'materials'
  const [materials, setMaterials] = useState(null);
  const [loadError, setLoadError] = useState('');
  const policy = policies.find((p) => p.id === previousChoice);

  useEffect(() => {
    if (phase !== 'materials' || materials || !token || !projectId) return;
    fetchMaterials(token, projectId, { stepId })
      .then(setMaterials)
      .catch((err) => setLoadError(err.message));
  }, [phase, materials, token, projectId, stepId]);

  if (phase === 'alert') {
    return (
      <div style={{ background: 'var(--color-navy)', minHeight: '100vh' }}>
        <ProgressHeader projectLabel="TF팀 브리핑" currentStep={4} totalSteps={9} studentNo={student?.studentNo} studentName={student?.name} />

        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              background: 'var(--color-coral)',
              color: '#FFF3EE',
              fontSize: 11,
              fontWeight: 500,
              padding: '4px 12px',
              borderRadius: 20,
              marginBottom: 20,
              letterSpacing: 0.5,
            }}
          >
            속보
          </div>

          <p style={{ color: 'var(--color-border)', fontSize: 13, margin: '0 0 10px' }}>
            팀장으로부터 메시지
          </p>
          <p style={{ color: '#FFFFFF', fontSize: 16, lineHeight: 1.7, margin: '0 0 30px' }}>
            "방금 발표 났어요. 확인해보세요."
          </p>

          <div
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 'var(--radius-card)',
              padding: '16px 18px',
              textAlign: 'left',
              marginBottom: 28,
            }}
          >
            <p style={{ color: '#FFFFFF', fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>
              당신이 선택한 <strong>{policy ? `${policy.label}(${policy.title})` : '정책'}</strong>에
              영향을 줄 수 있는 소식이 도착했습니다.
            </p>
          </div>

          <button
            onClick={() => setPhase('materials')}
            style={{
              width: '100%',
              background: 'var(--color-coral)',
              color: '#FFF3EE',
              border: 'none',
              borderRadius: 'var(--radius-button)',
              padding: 14,
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            확인하기
          </button>
        </div>
      </div>
    );
  }

  // phase === 'materials'
  return (
    <div>
      <ProgressHeader projectLabel="TF팀 브리핑" currentStep={4} totalSteps={9} studentNo={student?.studentNo} studentName={student?.name} />
      <div style={{ padding: '20px 20px 26px' }}>
        <h3 style={{ color: 'var(--color-navy)', fontSize: 17, fontWeight: 500, margin: '0 0 4px' }}>
          중앙정부 공모 사업 선정
        </h3>
        <p style={{ color: 'var(--color-text-body)', fontSize: 13, margin: '0 0 16px' }}>
          중앙정부 관광 활성화 공모 사업에 선정되어 사업비 30억 원을 확보했습니다. 아래 새로운 자료를
          확인해주세요.
        </p>

        {loadError && <p style={{ color: 'var(--color-coral)', fontSize: 13 }}>{loadError}</p>}
        {!materials && !loadError && (
          <p style={{ color: 'var(--color-text-body)', fontSize: 13 }}>자료를 불러오는 중...</p>
        )}
        {materials &&
          materials.map((m) => (
            <div
              key={m.material_key}
              style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderLeft: '3px solid var(--color-coral)',
                borderRadius: '0 var(--radius-card) var(--radius-card) 0',
                padding: '14px 16px',
                marginBottom: 12,
              }}
            >
              <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--color-navy)', margin: '0 0 6px' }}>
                {m.title}
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--color-text-body)', margin: 0 }}>
                {m.body}
              </p>
            </div>
          ))}

        <button
          onClick={onComplete}
          style={{
            width: '100%',
            background: 'var(--color-navy)',
            color: 'var(--color-navy-text-on)',
            border: 'none',
            borderRadius: 'var(--radius-button)',
            padding: 14,
            fontSize: 16,
            fontWeight: 500,
            marginTop: 8,
          }}
        >
          다음 단계로
        </button>
      </div>
    </div>
  );
}
