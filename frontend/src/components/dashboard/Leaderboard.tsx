import { useState } from 'react'
import { useDashboardStore } from '../../store/dashboardStore'

export default function Leaderboard() {
  const [type, setType] = useState<'global' | 'class'>('global')
  const { leaderboardData } = useDashboardStore()

  return (
    <section className="math-dashboard-card flex h-full flex-col p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-teal-700">Ranking</p>
          <h2 className="text-xl font-black text-slate-950">Tabla de dominio</h2>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setType('global')}
            className={`rounded-md px-3 py-1.5 text-sm font-black transition-all ${type === 'global' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Global
          </button>
          <button
            onClick={() => setType('class')}
            className={`rounded-md px-3 py-1.5 text-sm font-black transition-all ${type === 'class' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Clase
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-2">
        {leaderboardData.slice(0, 5).map((entry, idx) => (
          <div
            key={entry.studentId}
            className={`flex items-center gap-4 rounded-lg p-3 transition-colors ${entry.isCurrentUser ? 'border border-teal-200 bg-teal-50' : 'hover:bg-slate-50'}`}
          >
            <span className="w-8 text-center font-serif text-lg font-black text-slate-400">#{idx + 1}</span>
            <span className="math-formula-token min-h-0 px-2 py-1">{idx < 3 ? `top ${idx + 1}` : 'rank'}</span>

            <div className="flex-1">
              <p className="flex items-center gap-2 font-black text-slate-900">
                {entry.name}
                {entry.isCurrentUser && <span className="rounded bg-teal-100 px-2 py-0.5 text-[10px] font-black text-teal-700">Tu</span>}
              </p>
              <p className="text-xs font-medium text-slate-500">{entry.skillsmastered} skills dominadas</p>
            </div>

            <div className="text-right">
              <p className="text-lg font-black leading-none text-teal-700">{entry.xp.toLocaleString()}</p>
              <p className="mt-0.5 text-[10px] font-black text-slate-400">XP</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
