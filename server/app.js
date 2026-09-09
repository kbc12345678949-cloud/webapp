// server/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const { router: studentRouter } = require('./routes/student');
  const { router: teacherRouter } = require('./routes/teacher');

  app.use('/api/student', studentRouter);
  app.use('/api/teacher', teacherRouter);

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // 클라이언트(React) 빌드 결과물 서빙: client/dist가 있을 때만 활성화한다.
  // (백엔드만 따로 개발·테스트할 때는 이 폴더가 없어도 서버가 정상 동작해야 하므로 존재 여부를 확인한다.)
  const clientDist = path.join(__dirname, '../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    // API가 아닌 나머지 모든 경로는 React가 자체적으로 라우팅하도록 index.html을 돌려준다.
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // 전역 에러 처리: 예상 못한 오류가 나도 스택 트레이스·SQL 쿼리·내부 파일 경로 같은 세부 정보가
  // 사용자에게 그대로 노출되지 않도록 막는다. 자세한 내용은 서버 로그에만 남긴다.
  app.use((err, req, res, next) => {
    console.error('처리되지 않은 오류:', err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  });

  return app;
}

module.exports = { createApp };

// 실제 배포 시 (Render 등)에는 이 파일을 직접 실행
if (require.main === module) {
  // JWT_SECRET을 설정하지 않으면 코드에 노출된 기본값으로 서명되어, 누구나 로그인 토큰을 위조할 수 있다.
  // 그래서 실제로 서버를 띄우는 시점에는 반드시 이 값이 설정되어 있어야만 시작한다.
  // (테스트 스크립트에서 require('./app')로 불러올 때는 이 검사를 거치지 않으므로 테스트는 그대로 동작한다)
  if (!process.env.JWT_SECRET) {
    console.error(
      '오류: JWT_SECRET 환경변수가 설정되지 않았습니다. 코드에 노출된 기본값으로 서버를 띄우면 누구나 로그인 토큰을 위조할 수 있어 매우 위험합니다.\n' +
        '배포 환경(Render 등)의 환경변수에 JWT_SECRET을 무작위 문자열로 설정한 뒤 다시 시작해주세요.'
    );
    process.exit(1);
  }
  const app = createApp();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));
}
