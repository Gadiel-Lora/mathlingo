import { motion } from 'framer-motion'
import { Skill } from '../../store/dashboardStore'

export default function SkillCard({ skill }: { skill: Skill }) {
  const getMasteryColor = (mastery: number) => {
    if (mastery === 100) return 'from-emerald-600 to-emerald-400'
    if (mastery >= 75) return 'from-teal-600 to-emerald-400'
    if (mastery >= 50) return 'from-amber-500 to-yellow-400'
    if (mastery >= 25) return 'from-orange-500 to-amber-400'
    return 'from-rose-600 to-red-400'
  }

  return (
    <motion.article
      whileHover={{ scale: 1.02, y: -3 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="math-dashboard-card group flex h-full cursor-pointer flex-col overflow-hidden p-5 transition-all hover:shadow-lg"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black leading-tight text-slate-900 transition-colors group-hover:text-teal-700">{skill.name}</h3>
          <span className="mt-1.5 block text-xs font-bold text-slate-400">{skill.category}</span>
        </div>
        {skill.mastery === 100 && (
          <div className="math-formula-token" title="Dominado">
            100%
          </div>
        )}
      </div>

      <div className="mt-auto">
        <div className="mb-1.5 flex items-end justify-between">
          <span className="text-xs font-bold text-slate-500">Dominio</span>
          <span className="font-serif text-sm font-black text-slate-800">{skill.mastery}%</span>
        </div>
        <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100 shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${skill.mastery}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`absolute left-0 top-0 h-full rounded-full bg-gradient-to-r ${getMasteryColor(skill.mastery)}`}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="text-xs font-medium text-slate-500">
          <span className="font-black text-slate-800">{skill.problemsSolved}</span>/{skill.totalProblems} problemas
        </div>
        <div className="text-xs font-medium text-slate-500">
          Precision: <span className="font-black text-slate-800">{skill.accuracy}%</span>
        </div>
      </div>

      {skill.mastery < 50 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
          Requiere mas practica
        </div>
      )}
    </motion.article>
  )
}
