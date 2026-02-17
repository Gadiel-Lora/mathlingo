import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardPage from './pages/Dashboard'
import LearnPage from './pages/Learn'
import LoginPage from './pages/Login'
import ProfilePage from './pages/Profile'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/learn" element={<LearnPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
