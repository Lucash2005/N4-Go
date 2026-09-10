import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { ProgressProvider } from './hooks/useProgress'
import Dashboard from './pages/Dashboard'
import Flashcards from './pages/Flashcards'
import Quiz from './pages/Quiz'
import Drill from './pages/Drill'
import Schedule from './pages/Schedule'
import ReadingPractice from './pages/ReadingPractice'
import ListeningPractice from './pages/ListeningPractice'
import WrongBankPage from './pages/WrongBankPage'

export default function App() {
  return (
    <ProgressProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="flashcards" element={<Flashcards />} />
            <Route path="quiz" element={<Quiz />} />
            <Route path="reading" element={<ReadingPractice />} />
            <Route path="listening" element={<ListeningPractice />} />
            <Route path="wrong-bank" element={<WrongBankPage />} />
            <Route path="drill" element={<Drill />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ProgressProvider>
  )
}
