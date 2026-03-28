import { motion, AnimatePresence } from 'framer-motion'

interface AchievementDetailProps {
  isOpen: boolean;
  achievement: any;
  onClose: () => void;
}

export default function AchievementDetailModal({ isOpen, achievement, onClose }: AchievementDetailProps) {
  if (!isOpen || !achievement) return null

  const getRarityColors = (rarity: string) => {
    switch (rarity) {
      case 'Común': return 'bg-slate-100 text-slate-700 border-slate-200'
      case 'Raro': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'Épico': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'Legendario': return 'bg-amber-100 text-amber-700 border-amber-200 shadow-sm shadow-amber-200/50'
      case 'Mítico': return 'bg-rose-100 text-rose-700 border-rose-200 shadow-sm shadow-rose-200/50'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 text-center relative"
        >
          {achievement.unlocked && (
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-amber-100 to-transparent opacity-50"></div>
          )}

          <div className="p-8 relative z-10">
            <div className={`w-28 h-28 mx-auto rounded-full flex items-center justify-center text-6xl shadow-md border-4 mb-6 ${achievement.unlocked ? 'bg-amber-50 border-amber-200 shadow-amber-200/50' : 'bg-slate-100 border-slate-200 grayscale opacity-80'}`}>
               <motion.div animate={achievement.unlocked ? { y: [0, -10, 0] } : {}} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                 {achievement.unlocked ? achievement.icon : '🔒'}
               </motion.div>
            </div>
            
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {achievement.unlocked ? achievement.name : 'Logro Bloqueado'}
            </h2>
            
            <span className={`inline-block mt-3 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest border ${getRarityColors(achievement.rarity)}`}>
              Rango: {achievement.rarity}
            </span>

            <p className="mt-5 text-sm font-medium text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed min-h-[80px] flex items-center justify-center">
              {achievement.unlocked ? achievement.desc : achievement.hint || 'Hay secretos que aún no estás listo para conocer...'}
            </p>

            {achievement.unlocked && (
              <p className="mt-5 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Desbloqueado el: <span className="text-slate-600">{achievement.unlockedDate}</span>
              </p>
            )}

            <button onClick={onClose} className="w-full mt-6 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-sm transition-all active:scale-95 text-sm uppercase tracking-wider">
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
