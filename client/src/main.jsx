import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import App from './App.jsx'
import TeacherApp from './teacher/TeacherApp.jsx'

// 라우팅 라이브러리 없이, 주소가 /teacher로 시작하면 교사용 화면을,
// 그 외에는 학생용 화면을 보여준다.
const isTeacher = window.location.pathname.startsWith('/teacher');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isTeacher ? <TeacherApp /> : <App />}
  </StrictMode>,
)
