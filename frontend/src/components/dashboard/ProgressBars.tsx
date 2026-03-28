import { motion } from 'framer-motion'
import { useDashboardStore } from '../../store/dashboardStore'

export default function ProgressBars() {
  const { dailyProgress, dailyMinutes, weeklyProgress } = useDashboardStore()

  return (
    <div className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col justify-center">
      {/* Progreso Diario */}
      <div>
        <div className="flex justify-between mb-3 items-center">
          <span className="font-semibold text-gray-800 flex items-center gap-2 text-lg">
            <span>📊</span> Progreso Hoy
          </span>
          <span className="text-3xl font-bold text-blue-600">{dailyProgress}%</span>
        </div>
        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${dailyProgress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
          />
        </div>
        <p className="text-sm text-gray-500 mt-3 font-medium flex justify-between">
          <span>Meta: 60 min</span>
          <span className="text-blue-600 font-semibold">Completaste: {dailyMinutes} min</span>
        </p>
      </div>
      
      {/* Separator */}
      <div className="h-px w-full bg-gray-100 my-2"></div>

      {/* Progreso Semanal */}
      <div>
        <div className="flex justify-between mb-3 items-center">
          <span className="font-semibold text-gray-800 flex items-center gap-2 text-lg">
            <span>📈</span> Progreso Semana
          </span>
          <span className="text-3xl font-bold text-emerald-600">{weeklyProgress}%</span>
        </div>
        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${weeklyProgress}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
          />
        </div>
      </div>
    </div>
  )
}
