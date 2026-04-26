import { lazy, Suspense, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
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
  { id: 'dashboard', icon: 'DB', label: 'Dashboard' },
  { id: 'profile', icon: 'PF', label: 'Perfil de Aprendizaje' },
  { id: 'history', icon: 'HI', label: 'Historial' },
  { id: 'achievements', icon: 'LG', label: 'Logros' },
  { id: 'tasks', icon: 'TS', label: 'Tareas Asignadas' },
]

function ViewFallback() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="animate-pulse space-y-3">
        <div className="h-5 w-48 rounded bg-slate-200" />
        <div className="h-4 w-64 rounded bg-slate-100" />
        <div className="h-32 rounded-2xl bg-slate-100" />
      </div>
    </div>
  )
}

function prefetchProfileView() {
  void loadLearningProfileView().then(module => {
    if (typeof module.preloadSkillGraph === 'function') {
      void module.preloadSkillGraph()
    }
  })
}

export default function DashboardView() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [currentView, setCurrentView] = useState<DashboardViewId>('dashboard')

  const navItemClass = (id: DashboardViewId) => `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors cursor-pointer ${
    currentView === id ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
  }`

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <div className="z-20 hidden w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm md:flex">
        <div className="flex items-center justify-center border-b border-slate-100 p-6">
          <h1 className="text-2xl font-black tracking-tight text-indigo-600">
            Elite<span className="text-purple-600">Math</span>
          </h1>
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
              <span className="text-xs font-black uppercase tracking-[0.2em]" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
          <div className="my-4 border-t border-slate-100" role="separator"></div>
          <button
            type="button"
            onClick={() => setCurrentView('settings')}
            className={navItemClass('settings')}
            aria-current={currentView === 'settings' ? 'page' : undefined}
            aria-label="Ajustes"
          >
            <span className="text-xs font-black uppercase tracking-[0.2em]" aria-hidden="true">
              ST
            </span>
            Ajustes
          </button>
          {profile?.permissions?.canAccessAdminPanel && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-teal-700 transition-colors hover:bg-slate-50"
              aria-label="Panel administrativo"
            >
              <span className="text-xs font-black uppercase tracking-[0.2em]" aria-hidden="true">
                AD
              </span>
              Panel Admin
            </button>
          )}
        </nav>
      </div>

      <div className="relative flex h-screen flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
            <PageTransition key="dashboard" className="absolute inset-0">
              <Suspense fallback={<ViewFallback />}>
                <DashboardHome />
              </Suspense>
            </PageTransition>
          )}
        </AnimatePresence>

        {currentView !== 'dashboard' && (
          <>
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 px-8 py-5 backdrop-blur-md shadow-sm">
              <div className="text-xl font-bold capitalize tracking-tight text-slate-800">
                {currentView === 'profile' ? 'Tu Perfil Academico' : currentView}
              </div>
              <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-indigo-500 to-purple-500 text-lg font-bold text-white shadow-md transition-transform hover:scale-105">
                J
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
