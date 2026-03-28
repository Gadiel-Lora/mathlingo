import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { ProgressProvider } from './context/ProgressContext'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useAIStore } from './store/aiStore'

const Branch = lazy(() => import('./pages/Branch'))
const Course = lazy(() => import('./pages/Course'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Landing = lazy(() => import('./pages/Landing'))
const Lesson = lazy(() => import('./pages/Lesson'))
const Login = lazy(() => import('./pages/Login'))
const GlobalXPAnimation = lazy(() => import('./components/Common/GlobalXPAnimation'))
const Onboarding = lazy(() => import('./components/Common/Onboarding'))
const ConnectionStatusBanner = lazy(() => import('./components/Common/ConnectionStatusBanner'))
const KeyboardShortcutsOverlay = lazy(() => import('./components/Common/KeyboardShortcutsOverlay'))

function GlobalShortcuts() {
  const { toggleTheme } = useTheme()
  const toggleSidebar = useAIStore(state => state.toggleSidebar)

  useKeyboardShortcuts([
    { key: 'm', ctrlKey: true, action: toggleTheme, preventDefault: true },
    { key: 'h', ctrlKey: true, action: toggleSidebar, preventDefault: true },
  ])

  return null
}

function RouteFallback() {
  return (
    <div className="cm-shell px-6 pt-20 pb-16">
      <div className="cm-orb cm-orb-cyan left-[-6rem] top-[8rem] h-56 w-56" />
      <div className="cm-orb cm-orb-coral right-[-4rem] top-[16rem] h-44 w-44" />
      <main className="cm-page mx-auto max-w-xl">
        <section className="cm-card space-y-3 p-8 text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-coastal-neon">MATHLINGO</p>
          <h1 className="text-2xl font-semibold tracking-tight text-coastal-mist">Cargando vista</h1>
          <p className="text-sm text-coastal-mist/75">Preparando el siguiente modulo...</p>
        </section>
      </main>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProgressProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lesson/:id"
                  element={
                    <ProtectedRoute>
                      <Lesson />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/course/:id"
                  element={
                    <ProtectedRoute>
                      <Course />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/branch/:id"
                  element={
                    <ProtectedRoute>
                      <Branch />
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<Login />} />
              </Routes>
            </Suspense>
            <Toaster
              position="top-right"
              toastOptions={{
                className: 'font-bold text-sm shadow-xl border border-slate-100 rounded-xl',
                duration: 4000,
              }}
            />
            <Suspense fallback={null}>
              <GlobalXPAnimation />
            </Suspense>
            <Suspense fallback={null}>
              <Onboarding />
            </Suspense>
            <GlobalShortcuts />
            <Suspense fallback={null}>
              <ConnectionStatusBanner />
            </Suspense>
            <Suspense fallback={null}>
              <KeyboardShortcutsOverlay />
            </Suspense>
          </BrowserRouter>
        </ProgressProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
