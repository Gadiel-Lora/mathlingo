import { motion } from 'framer-motion'

interface StatCardProps {
  label: string
  value: string | number
  icon: string
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="bg-white/10 p-4 rounded-lg flex flex-col items-center justify-center text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs uppercase tracking-wider opacity-80 mt-1">{label}</div>
    </div>
  )
}

interface LessonStats {
  totalProblems: number
  solvedCorrect: number
  solvedIncorrect: number
  skipped: number
  accuracy: number
  totalXp: number
  timeSpent: number // segundos
  skillProgress: number // %
  nextSkill: string
}

interface LessonCompletionViewProps {
  stats: LessonStats
  onNextLesson: () => void
}

export default function LessonCompletionView({ stats, onNextLesson }: LessonCompletionViewProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-gradient-to-b from-blue-500 to-blue-700 text-white p-8 rounded-2xl shadow-2xl max-w-lg w-full"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ delay: 0.3, type: "spring" }}
            className="text-6xl mb-4"
          >
            🏆
          </motion.div>
          <h2 className="text-3xl font-extrabold mb-2 text-shadow-sm">¡Lección Completada!</h2>
          <p className="text-lg opacity-90 font-medium">Excelente trabajo superando este reto</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Problemas"
            value={`${stats.solvedCorrect}/${stats.totalProblems}`}
            icon="✓"
          />
          <StatCard
            label="XP Ganados"
            value={stats.totalXp}
            icon="⭐"
          />
          <StatCard
            label="Precisión"
            value={`${stats.accuracy}%`}
            icon="🎯"
          />
        </div>

        <div className="mb-8 bg-black/10 p-4 rounded-xl">
          <div className="flex justify-between items-end mb-2">
            <p className="text-sm font-semibold">Progreso en: <span className="font-bold">{stats.nextSkill}</span></p>
            <p className="text-sm font-bold">{stats.skillProgress}%</p>
          </div>
          <div className="w-full bg-blue-900/40 h-3 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.skillProgress}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-green-400"
            />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNextLesson}
          className="w-full py-4 bg-white text-blue-600 font-extrabold text-lg rounded-xl shadow-lg hover:bg-gray-50 transition-colors"
        >
          Siguiente Lección →
        </motion.button>
      </motion.div>
    </div>
  )
}
