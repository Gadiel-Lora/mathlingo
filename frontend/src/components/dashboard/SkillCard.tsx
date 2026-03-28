import { motion } from 'framer-motion'
import { Skill } from '../../store/dashboardStore'

export default function SkillCard({ skill }: { skill: Skill }) {
  const getMasteryColor = (mastery: number) => {
    if (mastery === 100) return 'from-emerald-500 to-emerald-400'
    if (mastery >= 75) return 'from-emerald-400 to-emerald-300'
    if (mastery >= 50) return 'from-amber-400 to-amber-300'
    if (mastery >= 25) return 'from-orange-400 to-orange-300'
    return 'from-rose-500 to-rose-400'
  }

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer transition-all hover:shadow-lg h-full flex flex-col group relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{skill.name}</h3>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-1.5 block">{skill.category}</span>
        </div>
        {skill.mastery === 100 && (
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100" title="Dominado">
            <span className="text-sm">🏆</span>
          </div>
        )}
      </div>

      <div className="mt-auto">
        <div className="flex justify-between mb-1.5 items-end">
          <span className="text-xs text-slate-500 font-medium">Dominio</span>
          <span className="text-sm font-black text-slate-700">{skill.mastery}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${skill.mastery}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`absolute top-0 left-0 h-full bg-gradient-to-r rounded-full ${getMasteryColor(skill.mastery)}`}
          />
        </div>
      </div>

      <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-50">
        <div className="text-xs text-slate-500">
          <span className="font-bold text-slate-700">{skill.problemsSolved}</span>/{skill.totalProblems} probs
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-1">
           Precisión: <span className="font-bold text-slate-700">{skill.accuracy}%</span>
        </div>
      </div>

      {skill.mastery < 50 && (
        <div className="mt-4 text-xs bg-amber-50 text-amber-700 font-medium px-3 py-2 rounded-lg border border-amber-100 flex items-center gap-2">
          <span>⚠️</span> Requiere más práctica
        </div>
      )}
    </motion.div>
  )
}
