import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import App from './App.jsx'
import TeacherApp from './teacher/TeacherApp.jsx'
import OrdinanceApp from './ordinance/OrdinanceApp.jsx'

// 라우팅 라이브러리 없이, 주소가 /teacher로 시작하면 교사용 화면을,
// 그 외에는 학생용 화면을 보여준다.
// /ordinance로 시작하면 '생활 속 문제, 조례로 답하다' 학생 화면을 보여준다.
const path = window.location.pathname;
const isTeacher = path.startsWith('/teacher');
const isOrdinance = path.startsWith('/ordinance');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isTeacher ? <TeacherApp /> : isOrdinance ? <OrdinanceApp /> : <App />}
  </StrictMode>,
)
