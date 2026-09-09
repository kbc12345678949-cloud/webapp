import '@testing-library/jest-dom/vitest';

// jsdom은 파일 다운로드 관련 브라우저 API를 구현하지 않으므로 테스트용으로 폴리필한다.
// (실제 브라우저에서는 정상 지원되는 표준 API)
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = () => 'blob:mock-url';
  globalThis.URL.revokeObjectURL = () => {};
}
