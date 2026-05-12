import { lazy, Suspense, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { useDashboardStore } from '../../store/dashboardStore'
import PageTransition from '../Common/PageTransition'

const DashboardHome = lazy(() => import('./DashboardHome'))
const loadLearningProfileView = () => import('../LearningProfile/LearningProfileView')
const LearningProfileView = lazy(loadLearningProfileView)
const HistoryView = lazy(() => import('../History/HistoryView'))
const SettingsView = lazy(() => import('../Settings/SettingsView'))
const AchievementsView = lazy(() => import('../Achievements/AchievementsView'))
const AssignedTasksView = lazy(() => import('../AssignedTasks/AssignedTasksView'))

type DashboardViewId = 'dashboard' | 'profile' | 'history' | 'achievements' | 'tasks' | 'settings'

const NAV_ITEMS: Array<{ id: DashboardViewId; icon: string; label: string }> = [
  { id: 'dashboard', icon: 'f(x)', label: 'Panel' },
  { id: 'profile', icon: 'x2', label: 'Perfil de aprendizaje' },
  { id: 'history', icon: 'n', label: 'Historial' },
  { id: 'achievements', icon: '%', label: 'Logros' },
  { id: 'tasks', icon: 'T', label: 'Tareas asignadas' },
]

const VIEW_LABELS: Record<DashboardViewId, string> = {
  dashboard: 'Panel matematico',
  profile: 'Tu perfil academico',
  history: 'Historial',
  achievements: 'Logros',
  tasks: 'Tareas asignadas',
  settings: 'Ajustes',
}

function ViewFallback() {
  return (
    <div className="math-dashboard-card p-6">
      <div className="animate-pulse space-y-3">
        <div className="h-5 w-48 rounded bg-slate-200" />
        <div className="h-4 w-64 rounded bg-slate-100" />
        <div className="h-32 rounded-lg bg-slate-100" />
      </div>
    </div>
  )
}

function prefetchProfileView() {
  void loadLearningProfileView().then(module => {
    if (typeof (module as any).preloadSkillGraph === 'function') {
      void (module as any).preloadSkillGraph()
    }
  })
}

export default function DashboardView() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const userName = useDashboardStore((state) => state.userName)
  const [currentView, setCurrentView] = useState<DashboardViewId>('dashboard')

  const displayName = (profile as any)?.fullName || userName || user?.email?.split('@')[0] || ''
  const userInitial = displayName.trim().charAt(0).toUpperCase() || '?'

  const navItemClass = (id: DashboardViewId) => `math-nav-item ${currentView === id ? 'is-active' : ''}`

  return (
    <div className="math-dashboard-shell flex h-screen overflow-hidden font-sans">
      <aside className="math-sidebar z-20 hidden w-72 flex-shrink-0 flex-col md:flex">
        <div className="border-b border-slate-100 p-6">
          <div className="math-brand-lockup">
            <span className="math-brand-mark">x2</span>
            <div>
              <h1 className="text-xl font-black text-slate-950">MathLingo</h1>
              <p className="text-xs font-bold text-slate-500">Laboratorio matematico</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6" role="navigation" aria-label="Navegacion principal">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentView(item.id)}
              onMouseEnter={item.id === 'profile' ? prefetchProfileView : undefined}
              onFocus={item.id === 'profile' ? prefetchProfileView : undefined}
              className={navItemClass(item.id)}
              aria-current={currentView === item.id ? 'page' : undefined}
              aria-label={item.label}
            >
              <span className="math-nav-symbol" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}

          <div className="my-4 border-t border-slate-100" role="separator" />

          <button
            type="button"
            onClick={() => setCurrentView('settings')}
            className={navItemClass('settings')}
            aria-current={currentView === 'settings' ? 'page' : undefined}
            aria-label="Ajustes"
          >
            <span className="math-nav-symbol" aria-hidden="true">
              cfg
            </span>
            Ajustes
          </button>

          {(profile as any)?.permissions?.canAccessAdminPanel && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="math-nav-item text-teal-700"
              aria-label="Panel administrativo"
            >
              <span className="math-nav-symbol" aria-hidden="true">
                AD
              </span>
              Panel Admin
            </button>
          )}
        </nav>
      </aside>

      <div className="relative flex h-screen flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
            <PageTransition key="dashboard" className="absolute inset-0 overflow-y-auto">
              <Suspense fallback={<ViewFallback />}>
                <DashboardHome />
              </Suspense>
            </PageTransition>
          )}
        </AnimatePresence>

        {currentView !== 'dashboard' && (
          <>
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/85 px-8 py-5 shadow-sm backdrop-blur-md">
              <div>
                <p className="text-xs font-black text-teal-700">MathLingo</p>
                <div className="text-xl font-black text-slate-900">{VIEW_LABELS[currentView]}</div>
              </div>
              <div
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-teal-200 bg-teal-700 text-lg font-bold text-white shadow-md transition-transform hover:scale-105"
                title={displayName}
                aria-label={`Usuario: ${displayName}`}
              >
                {userInitial}
              </div>
            </header>
            <main className="relative flex-1 overflow-y-auto p-4 md:p-8">
              <AnimatePresence mode="wait">
                {currentView === 'profile' && (
                  <PageTransition key="profile">
                    <Suspense fallback={<ViewFallback />}>
                      <LearningProfileView />
                    </Suspense>
                  </PageTransition>
                )}
                {currentView === 'history' && (
                  <PageTransition key="history">
                    <Suspense fallback={<ViewFallback />}>
                      <HistoryView />
                    </Suspense>
                  </PageTransition>
                )}
                {currentView === 'settings' && (
                  <PageTransition key="settings">
                    <Suspense fallback={<ViewFallback />}>
                      <SettingsView />
                    </Suspense>
                  </PageTransition>
                )}
                {currentView === 'achievements' && (
                  <PageTransition key="achievements">
                    <Suspense fallback={<ViewFallback />}>
                      <AchievementsView />
                    </Suspense>
                  </PageTransition>
                )}
                {currentView === 'tasks' && (
                  <PageTransition key="tasks">
                    <Suspense fallback={<ViewFallback />}>
                      <AssignedTasksView />
                    </Suspense>
                  </PageTransition>
                )}
              </AnimatePresence>
            </main>
          </>
        )}
      </div>
    </div>
  )
}
