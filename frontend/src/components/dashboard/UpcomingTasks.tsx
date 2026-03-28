import { motion } from 'framer-motion'
import { useDashboardStore, Task } from '../../store/dashboardStore'

const DifficultyBadge = ({ diff }: { diff: Task['difficulty'] }) => {
  const colors = {
    Easy: 'bg-emerald-100 text-emerald-700',
    Medium: 'bg-amber-100 text-amber-700',
    Hard: 'bg-rose-100 text-rose-700'
  }
  return (
    <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-md ${colors[diff]}`}>
      {diff}
    </span>
  )
}

export default function UpcomingTasks() {
  const { tasks } = useDashboardStore()

  return (
    <div className="bg-white p-6 flex flex-col rounded-2xl shadow-sm border border-slate-100 h-full">
      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
        <span>📝</span> Próximas Tareas
      </h2>
      
      <div className="space-y-3 flex-1">
        {tasks.map((task, idx) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-indigo-50/50 hover:border-indigo-100 transition-all group"
          >
            <div className="flex-1">
              <p className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{task.name}</p>
              <p className="text-sm text-slate-500 mt-0.5">
                Vence: <strong className="text-slate-600 font-semibold">{task.deadline}</strong>
              </p>
              {task.yourPreviousAccuracy && (
                <p className="text-xs text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                  <span>📉</span> Tu precisión anterior: {task.yourPreviousAccuracy}%
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-3 sm:flex-col sm:items-end w-full sm:w-auto mt-3 sm:mt-0 justify-between">
              <DifficultyBadge diff={task.difficulty} />
              <button className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm mt-1 sm:mt-0">
                Empezar
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
