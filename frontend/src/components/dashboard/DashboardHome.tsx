import { lazy, Suspense } from 'react'

import { useUserProfile } from '../../hooks/useUserProfile'
import { useDashboardStore } from '../../store/dashboardStore'
import WelcomeSection from './WelcomeSection'
import ProgressBars from './ProgressBars'
import SkillsGrid from './SkillsGrid'
import UpcomingTasks from './UpcomingTasks'
import Recommendations from './Recommendations'
import Leaderboard from './Leaderboard'
import StatisticsTable from './StatisticsTable'
import SkillAlerts from './SkillAlerts'
import DateRangeSelector from './DateRangeSelector'
import ExportButton from './ExportButton'
import DualPathPanel from './DualPathPanel'
import MathProblemInput from './MathProblemInput'

const ProgressChart = lazy(() => import('./ProgressChart'))

function ChartFallback() {
  return (
    <div className="math-dashboard-card p-6">
      <div className="animate-pulse space-y-3">
        <div className="h-5 w-40 rounded bg-slate-200" />
        <div className="h-4 w-64 rounded bg-slate-100" />
        <div className="h-72 rounded-lg bg-slate-100" />
      </div>
    </div>
  )
}

export default function DashboardHome() {
  useUserProfile()
  const { userName } = useDashboardStore()
  const userInitial = userName ? userName.charAt(0).toUpperCase() : '?'

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/85 px-8 py-4 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <p className="text-xs font-black text-teal-700">MathLingo</p>
            <div className="text-lg font-black text-slate-900">Panel matematico</div>
          </div>
          <DateRangeSelector />
        </div>
        <div className="flex items-center gap-4">
          <ExportButton />
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 md:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            Conectado
          </div>
          <button className="relative text-slate-400 transition-colors hover:text-slate-600" aria-label="Notificaciones">
            <span className="math-formula-token h-9 min-h-0 px-3" aria-hidden="true">!</span>
            <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500"></span>
          </button>
          <div
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-teal-200 bg-teal-700 text-lg font-bold text-white shadow-sm transition-transform hover:scale-105"
            title={userName || 'Usuario'}
          >
            {userInitial}
          </div>
        </div>
      </header>
      <main id="dashboard-export-area" className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-8 pb-20">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex h-full flex-col justify-center lg:col-span-2">
              <WelcomeSection />
            </div>
            <div className="flex h-full flex-col lg:col-span-1">
              <ProgressBars />
              <SkillAlerts />
            </div>
          </div>

          {/* Práctica Rápida — input de problemas matemáticos */}
          <MathProblemInput />

          <DualPathPanel />

          <div className="mt-10">
            <SkillsGrid />
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <UpcomingTasks />
            <Recommendations />
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <Suspense fallback={<ChartFallback />}>
                <ProgressChart />
              </Suspense>
            </div>
            <div>
              <Leaderboard />
            </div>
          </div>
          <div className="mt-6">
            <StatisticsTable />
          </div>
        </div>
      </main>
    </>
  )
}
