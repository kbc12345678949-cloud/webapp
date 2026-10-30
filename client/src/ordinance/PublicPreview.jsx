// src/ordinance/PublicPreview.jsx
// 로그인 없이 보는 [주제별 자료 보기] / [주제별 질문 보기]. 읽기 전용이고 학생 답은 보이지 않는다.
import { useState } from 'react';
import ProgressHeader from '../components/ProgressHeader';
import { PROJECT_LABEL, MATERIAL_KEYS, TOTAL_STEPS } from './content';
import { TrackCards, MaterialCard, QuestionList, CityNotice, linkButton, secondaryButton } from './ui';

export default function PublicPreview({ mode, onBack }) {
  const [track, setTrack] = useState(null);
  const isMaterials = mode === 'materials';

  return (
    <div>
      <ProgressHeader projectLabel={PROJECT_LABEL} currentStep={0} totalSteps={TOTAL_STEPS} />
      <div style={{ padding: '18px 18px 40px' }}>
        <button onClick={track ? () => setTrack(null) : onBack} style={{ ...linkButton, marginBottom: 12 }}>
          ← {track ? '다른 주제 고르기' : '로그인 화면으로'}
        </button>

        <h3 style={{ color: 'var(--color-navy)', fontSize: 18, fontWeight: 600, margin: '0 0 4px' }}>
          {isMaterials ? '주제별 자료 보기' : '주제별 질문 보기'}
        </h3>
        <p style={{ color: 'var(--color-text-body)', fontSize: 12.5, margin: '0 0 14px', lineHeight: 1.6 }}>
          미리 보기 화면이에요. 여기서는 답을 쓰거나 저장할 수 없어요. 답은 우리 반 응시 시간에 로그인해서 씁니다.
        </p>

        {!track && (
          <>
            <CityNotice />
            <p style={{ fontSize: 13, color: 'var(--color-navy)', fontWeight: 500, margin: '0 0 10px' }}>
              {isMaterials ? '자료를 볼 주제를 고르세요.' : '질문을 볼 주제를 고르세요.'}
            </p>
            <TrackCards onSelect={setTrack} />
          </>
        )}

        {track && (
          <>
            <div
              style={{
                background: 'var(--color-navy)',
                color: 'var(--color-navy-text-on)',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 14,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {track.icon} {track.short} <span style={{ fontWeight: 400, fontSize: 12.5 }}>— {track.title}</span>
            </div>
            {isMaterials ? (
              MATERIAL_KEYS.map((k) => <MaterialCard key={k} track={track} mkey={k} />)
            ) : (
              <QuestionList track={track} />
            )}
            <button onClick={() => setTrack(null)} style={{ ...secondaryButton, marginTop: 10 }}>
              다른 주제 보기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
