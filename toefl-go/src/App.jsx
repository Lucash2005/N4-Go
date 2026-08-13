import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { ProgressProvider } from './hooks/useProgress'
import Dashboard from './pages/Dashboard'
import Vocab from './pages/Vocab'
import Practice from './pages/Practice'
import Quiz from './pages/Quiz'
import Plan from './pages/Plan'

export default function App() {
  return (
    <ProgressProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="vocab" element={<Vocab />} />
            <Route path="practice" element={<Practice />} />
            <Route path="quiz" element={<Quiz />} />
            <Route path="plan" element={<Plan />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ProgressProvider>
  )
}
