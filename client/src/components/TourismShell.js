// src/components/TourismShell.js
// 관광정책 화면 공통 틀(단계 이동 막대·도구 막대·보기 전용 표시)을 각 STEP에 내려보내는 통로.
// ProgressHeader가 이 값을 읽어 헤더 바로 아래에 막대를 붙인다.
// 조례 화면처럼 Provider 밖에서 쓰면 기본값(null)이라 아무것도 바뀌지 않는다.
import { createContext, useContext } from 'react';

export const TourismShellContext = createContext({ below: null, readOnly: false });

export function useTourismShell() {
  return useContext(TourismShellContext);
}
