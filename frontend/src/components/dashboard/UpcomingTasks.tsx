import { motion } from 'framer-motion'
import { useDashboardStore, Task } from '../../store/dashboardStore'

const DifficultyBadge = ({ diff }: { diff: Task['difficulty'] }) => {
  const colors = {
    Easy: 'bg-emerald-100 text-emerald-700',
    Medium: 'bg-amber-100 text-amber-700',
    Hard: 'bg-rose-100 text-rose-700',
  }
  return <span className={`rounded-md px-2.5 py-1 text-[10px] font-black ${colors[diff]}`}>{diff}</span>
}

export default function UpcomingTasks() {
  const { tasks } = useDashboardStore()

  return (
    <section className="math-dashboard-card flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-teal-700">Agenda</p>
          <h2 className="text-xl font-black text-slate-950">Proximas tareas</h2>
        </div>
        <span className="math-formula-token">T(n)</span>
      </div>

      <div className="flex-1 space-y-3">
        {tasks.map((task, idx) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group flex cursor-pointer flex-col items-start gap-4 rounded-lg border border-slate-100 bg-white p-4 transition-all hover:border-teal-200 hover:bg-teal-50/40 sm:flex-row sm:items-center"
          >
            <div className="flex-1">
              <p className="font-black text-slate-900 transition-colors group-hover:text-teal-700">{task.name}</p>
              <p className="mt-0.5 text-sm font-medium text-slate-500">
                Vence: <strong className="font-bold text-slate-700">{task.deadline}</strong>
              </p>
              {task.yourPreviousAccuracy && (
                <p className="mt-1.5 text-xs font-bold text-rose-600">
                  Precision anterior: {task.yourPreviousAccuracy}%
                </p>
              )}
            </div>

            <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
              <DifficultyBadge diff={task.difficulty} />
              <button className="cm-btn-primary min-h-0 px-4 py-1.5 text-sm">
                Empezar
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
