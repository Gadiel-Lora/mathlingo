import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { useAuth } from '../../context/AuthContext'
import { getQuickHistory } from '../../lib/quickHistory'
import type { QuickAttempt } from '../../lib/quickHistory'
import AttemptCard from './AttemptCard'
import AttemptDetailModal from './AttemptDetailModal'
import HistoryTabs from './HistoryTabs'

type HistoryEntry = {
  id: number
  date: string
  name: string
  correct: boolean
  attempt: number
  xp: number
  time: string
  accuracy: number
}

const normalizeHistory = (value: unknown): HistoryEntry[] => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is HistoryEntry =>
    Boolean(item && typeof item === 'object' && 'id' in item),
  )
}

const normalizeQuickHistory = (attempts: QuickAttempt[]): HistoryEntry[] => {
  return attempts.map((attempt, index) => ({
    id: index,
    date: attempt.date,
    name: attempt.problem,
    correct: true,
    attempt: 1,
    xp: 0,
    time: '—',
    accuracy: 100,
  }))
}

export default function HistoryView() {
  const { profile, loading: authLoading, user } = useAuth()
  const [activeTab, setActiveTab] = useState('Semana')
  const [selectedAttempt, setSelectedAttempt] = useState<HistoryEntry | null>(null)

  // Combine remote history (profile.attemptHistory) with local quick practice history
  const history = useMemo(() => {
    const remoteHistory = normalizeHistory((profile as any)?.attemptHistory)
    const localHistory = user?.id ? normalizeQuickHistory(getQuickHistory(user.id)) : []
    // Merge and de-duplicate by id; remote entries take precedence
    const combined = [...remoteHistory]
    localHistory.forEach((entry, i) => {
      combined.push({ ...entry, id: -(i + 1) }) // negative ids for local entries
    })
    return combined
  }, [profile, user?.id])

  const groupedHistory = useMemo(() => {
    return history.reduce((acc: Record<string, HistoryEntry[]>, curr) => {
      if (!acc[curr.date]) acc[curr.date] = []
      acc[curr.date].push(curr)
      return acc
    }, {})
  }, [history])

  // Show loading skeleton while auth is resolving
  if (authLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl pb-16">
        <div className="flex min-h-[70vh] flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded-xl bg-slate-200" />
            <div className="h-5 w-64 rounded bg-slate-100" />
            <div className="space-y-3 pt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-xl bg-slate-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl pb-16">
      <div className="flex min-h-[70vh] flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <HistoryTabs active={activeTab} onSelect={setActiveTab} />
          <div className="flex w-full gap-3 md:w-auto">
            <div className="relative min-w-[180px] flex-1">
              <select className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm outline-none transition-colors hover:bg-slate-100">
                <option>Filtrar por skill</option>
              </select>
            </div>
            <input
              type="date"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm outline-none transition-colors hover:bg-slate-100"
            />
          </div>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <div className="mb-4 text-5xl">📭</div>
            <h2 className="text-2xl font-black text-slate-800">Sin historial todavía</h2>
            <p className="mt-3 max-w-md text-sm font-medium text-slate-500">
              Cuando resuelvas tus primeros problemas, tus intentos aparecerán aquí.
              También puedes usar la sección <strong>Práctica Rápida</strong> del dashboard.
            </p>
          </div>
        ) : (
          <div className="flex-1 space-y-12">
            {Object.keys(groupedHistory).map((date) => (
              <div key={date}>
                <h3 className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-black uppercase tracking-widest text-slate-400">
                  {date}
                </h3>
                <div className="space-y-4">
                  {groupedHistory[date].map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06 }}
                    >
                      <AttemptCard data={entry} onClick={() => setSelectedAttempt(entry)} />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AttemptDetailModal
        isOpen={!!selectedAttempt}
        attempt={selectedAttempt}
        onClose={() => setSelectedAttempt(null)}
      />
    </div>
  )
}
