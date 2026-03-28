import { motion } from 'framer-motion'
import { useDashboardStore } from '../../store/dashboardStore'

const StatBox = ({ label, value, icon }: { label: string, value: string | number, icon: string }) => (
  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center border border-white/10 shadow-sm flex flex-col items-center justify-center">
    <div className="text-3xl mb-2">{icon}</div>
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-xs uppercase tracking-wider opacity-90 mt-1">{label}</div>
  </div>
)

export default function WelcomeSection() {
  const { userName, userLevel, streak, totalXP, accuracy } = useDashboardStore()

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-2xl shadow-lg relative overflow-hidden"
    >
      {/* Decorative background circle */}
      <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex justify-between items-start relative z-10">
        <div>
          <h1 className="text-4xl font-bold mb-2">¡Hola, {userName}! 👋</h1>
          <p className="text-lg text-blue-100">Vamos a seguir aprendiendo hoy</p>
        </div>
        <div className="text-right bg-white/10 p-4 rounded-xl border border-white/20 shadow-sm backdrop-blur-md">
          <div className="text-4xl font-black text-center">{userLevel}</div>
          <div className="text-xs uppercase tracking-widest text-blue-200 mt-1 font-semibold">Nivel</div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-6 mt-8 relative z-10">
        <StatBox label="Racha" value={`${streak} días`} icon="🔥" />
        <StatBox label="XP Total" value={totalXP.toLocaleString()} icon="⭐" />
        <StatBox label="Precisión" value={`${accuracy}%`} icon="🎯" />
      </div>
    </motion.div>
  )
}
