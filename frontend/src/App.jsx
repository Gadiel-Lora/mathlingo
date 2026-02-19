import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { ProgressProvider } from './context/ProgressContext'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import Lesson from './pages/Lesson'
import Login from './pages/Login'

function App() {
  return (
    <ProgressProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/lesson/:id" element={<Lesson />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </ProgressProvider>
  )
}

export default App
