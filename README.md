# 관광 정책 결정 시뮬레이션 — 배포 안내

## 구조

- `client/` — 학생·교사용 화면 (React)
- `server/` — API 서버 (Express + PostgreSQL). 배포 시 `client`의 빌드 결과물도 함께 서빙한다.

## Render 배포 절차

### 1. PostgreSQL 데이터베이스 생성

Render 대시보드 → New → PostgreSQL. 생성 후 나오는 **Internal Database URL**을 복사해둔다.

### 2. Web Service 생성

Render 대시보드 → New → Web Service → 이 GitHub 저장소 연결.

| 설정 항목 | 값 |
|---|---|
| Root Directory | (비워둠, 저장소 최상위) |
| Build Command | `cd client && npm install && npm run build && cd ../server && npm install` |
| Start Command | `cd server && npm start` |

### 3. 환경변수 설정

Web Service의 Environment 탭에서 아래 값을 추가한다.

| 변수명 | 값 |
|---|---|
| `DATABASE_URL` | 1번에서 복사한 Internal Database URL |
| `JWT_SECRET` | **무작위 문자열** (아래 "안전한 값 만드는 법" 참고). 이 값이 없으면 서버가 아예 시작되지 않도록 만들어뒀다 |

**JWT_SECRET 안전한 값 만드는 법**: 터미널이 있다면 `openssl rand -hex 32` 실행 결과를 복사해서 쓰면 된다. 터미널이 없다면 아무 웹사이트의 회원가입도 거치지 않는 "랜덤 문자열 생성기"로 32자 이상의 무작위 영문+숫자 조합을 만들어 써도 된다. **다른 사람에게 공유하거나 이 저장소에 커밋하지 않는다.**

### 4. 배포 후 딱 한 번 실행할 것

Render의 Shell 탭(또는 로컬에서 `DATABASE_URL`을 같은 값으로 설정하고)에서 순서대로 실행한다.

```bash
cd server
node db/seed_production.js          # 자료·이해관계자·루브릭 등록
node db/create_teacher.js <아이디> <비밀번호>   # 교사 계정 생성 (비밀번호 8자 이상)
```

학생 명단은 위 단계와 별도로, 배포 후 교사 화면(학생 명단 업로드)에서 CSV를 붙여넣어 등록한다.

### 5. 확인

배포된 주소로 접속해서 `/api/health`가 `{"ok":true}`를 반환하는지, 루트 주소(`/`)가 로그인 화면을 정상적으로 보여주는지 확인한다.

## 로컬에서 테스트 실행

```bash
cd server && npm test        # 백엔드 API 테스트
cd client && npx vitest run  # 프런트엔드 테스트 (실제 서버를 띄워 검증하므로 몇 초 걸림)
```
