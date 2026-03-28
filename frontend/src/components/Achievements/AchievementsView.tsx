import { useState } from 'react'
import { motion } from 'framer-motion'
import AchievementDetailModal from './AchievementDetailModal'

const mockAchievements = [
  { id: 1, name: 'Primeros Pasos', icon: '🐣', unlocked: true, unlockedDate: '12/3/2026', hint: '', rarity: 'Común', desc: 'Completaste tu primera lección en la plataforma.' },
  { id: 2, name: 'Racha de Fuego', icon: '🔥', unlocked: true, unlockedDate: '14/3/2026', hint: '', rarity: 'Raro', desc: 'Mantén una racha ininterrumpida de estudio durante 7 días.' },
  { id: 3, name: 'Mente Veloz', icon: '⚡', unlocked: true, unlockedDate: '15/3/2026', hint: '', rarity: 'Épico', desc: 'Resolviste 10 problemas correctos en menos de 5 minutos.' },
  { id: 4, name: 'Maestro de Fracciones', icon: '🍕', unlocked: false, unlockedDate: '', hint: 'Domina los números que miden partes de un todo.', rarity: 'Épico', desc: 'Dominar la skill Fracciones al 100% de mastery.' },
  { id: 5, name: 'Cerebro Absoluto', icon: '🧠', unlocked: false, unlockedDate: '', hint: 'No cometas ningún error en todo tu historial de álgebra.', rarity: 'Mítico', desc: 'Obtiene 100% de precisión en todos los problemas de Álgebra Intro.' },
  { id: 6, name: '???', icon: '?', unlocked: false, unlockedDate: '', hint: 'Desbloquea 20 logros menores primero para revelar este secreto...', rarity: 'Legendario', desc: 'Participa y gana el Leaderboard global.' },
  { id: 7, name: '???', icon: '?', unlocked: false, unlockedDate: '', hint: 'Solo el AI Tutor puede darte esta medalla si le demuestras sabiduría...', rarity: 'Legendario', desc: 'Explica a la IA cómo resolver un problema sin usar pistas.' },
  { id: 8, name: 'Perseverancia', icon: '🧗', unlocked: false, unlockedDate: '', hint: "Falla y vuelve a intentarlo.", rarity: 'Raro', desc: 'Ten 5 respuestas incorrectas seguidas y luego logra la respuesta correcta.' },
]

export default function AchievementsView() {
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null)
  
  const unlockedCount = mockAchievements.filter(a => a.unlocked).length
  const progressRatio = Math.round((unlockedCount / mockAchievements.length) * 100)

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-8 min-h-[160px] overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400 opacity-5 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
        
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center text-5xl shadow-inner border-[6px] border-white relative z-10 shrink-0">
          🏆
        </div>
        <div className="flex-1 text-center md:text-left relative z-10">
          <h2 className="text-3xl font-black text-slate-800 mb-2">Sala de Trofeos</h2>
          <p className="text-slate-500 font-medium mb-5">Has desbloqueado {unlockedCount} de {mockAchievements.length} logros globales ocultos en EliteMath.</p>
          
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressRatio}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
              />
            </div>
            <span className="font-black text-slate-700">{progressRatio}%</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {mockAchievements.map((achievement, idx) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ scale: 1.05, y: -4 }}
            onClick={() => setSelectedAchievement(achievement)}
            className={`p-6 rounded-2xl cursor-pointer text-center flex flex-col items-center justify-center min-h-[180px] shadow-sm transition-all border ${
              achievement.unlocked
                ? 'bg-white border-amber-200 hover:border-amber-400 hover:shadow-amber-100'
                : 'bg-slate-50 opacity-70 border-slate-200 hover:opacity-100 hover:bg-slate-100'
            }`}
          >
            <div className={`text-6xl mb-4 drop-shadow-sm ${!achievement.unlocked && 'grayscale opacity-60 blur-[1px]'}`}>
              {achievement.unlocked || achievement.name !== '???' ? achievement.icon : '🔒'}
            </div>
            <p className={`font-black tracking-tight leading-tight ${achievement.unlocked ? 'text-slate-800' : 'text-slate-500'}`}>
              {achievement.unlocked ? achievement.name : achievement.name}
            </p>
            {achievement.unlocked && (
               <p className="text-[10px] bg-amber-50 text-amber-700 px-2.5 py-1 rounded border border-amber-100 font-bold mt-3 uppercase tracking-wider">
                 {achievement.rarity}
               </p>
            )}
          </motion.div>
        ))}
      </div>
      
      <AchievementDetailModal 
        isOpen={!!selectedAchievement} 
        achievement={selectedAchievement} 
        onClose={() => setSelectedAchievement(null)} 
      />
    </div>
  )
}
