import { useState } from 'react'
import { motion } from 'framer-motion'
import { useDashboardStore } from '../../store/dashboardStore'

export default function Leaderboard() {
  const [type, setType] = useState<'global' | 'class'>('global')
  const { leaderboardData } = useDashboardStore()

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-full">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span>🏆</span> Leaderboard
        </h2>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setType('global')}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${type === 'global' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            🌍 Global
          </button>
          <button
            onClick={() => setType('class')}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${type === 'class' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            👥 Clase
          </button>
        </div>
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto pr-2">
        {leaderboardData.slice(0, 5).map((entry, idx) => (
          <div key={entry.studentId} className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${entry.isCurrentUser ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'}`}>
            <span className="font-black text-lg text-slate-400 w-6 text-center">#{idx + 1}</span>
            {idx < 3 ? (
              <span className="text-2xl drop-shadow-sm">{['🥇', '🥈', '🥉'][idx]}</span>
            ) : (
              <span className="w-6"></span>
            )}
            
            <div className="flex-1">
              <p className="font-bold text-slate-800 flex items-center gap-2">
                {entry.name}
                {entry.isCurrentUser && <span className="text-[10px] uppercase bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded font-black">Tú</span>}
              </p>
              <p className="text-xs text-slate-500 font-medium">{entry.skillsmastered} skills dominadas</p>
            </div>
            
            <div className="text-right">
              <p className="font-black text-indigo-600 text-lg leading-none">{entry.xp.toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-0.5">XP</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
