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

const ProgressChart = lazy(() => import('./ProgressChart'))

function ChartFallback() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="animate-pulse space-y-3">
        <div className="h-5 w-40 rounded bg-slate-200" />
        <div className="h-4 w-64 rounded bg-slate-100" />
        <div className="h-72 rounded-2xl bg-slate-100" />
      </div>
    </div>
  )
}

export default function DashboardHome() {
  useUserProfile()  // Carga datos reales del usuario autenticado
  const { userName } = useDashboardStore()
  const userInitial = userName ? userName.charAt(0).toUpperCase() : '?'

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 px-8 py-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="hidden text-lg font-semibold text-slate-800 sm:block">Resumen Principal</div>
          <DateRangeSelector />
        </div>
        <div className="flex items-center gap-4">
          <ExportButton />
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 md:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            Conectado
          </div>
          <button className="relative text-slate-400 transition-colors hover:text-slate-600" aria-label="Notificaciones">
            <span className="text-xl" aria-hidden="true">AL</span>
            <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500"></span>
          </button>
          <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-indigo-500 to-purple-500 text-lg font-bold text-white shadow-sm transition-transform hover:scale-105">
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
