import { motion } from 'framer-motion'
import { useDashboardStore } from '../../store/dashboardStore'

export default function SkillAlerts() {
  const { skills } = useDashboardStore()
  const alertSkills = skills.filter(s => s.mastery < 50 && s.mastery > 0)
  
  if (!alertSkills.length) return null

  return (
    <div className="space-y-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col mt-6">
      <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg mb-2">
        <span>⚠️</span> Alertas de Práctica
      </h3>
      <div className="space-y-3">
        {alertSkills.map((skill, idx) => (
          <motion.div
            key={skill.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-4 rounded-xl border-l-4 transition-colors cursor-pointer shadow-sm ${
              skill.mastery < 25 
                ? 'bg-rose-50 border-rose-500 hover:bg-rose-100/70' 
                : 'bg-amber-50 border-amber-500 hover:bg-amber-100/70'
            }`}
          >
            <p className={`font-bold ${skill.mastery < 25 ? 'text-rose-900' : 'text-amber-900'}`}>{skill.name}</p>
            <p className={`text-sm mt-1 mb-2 font-medium ${skill.mastery < 25 ? 'text-rose-700' : 'text-amber-800'}`}>
              Dominio actual: {skill.mastery}% {skill.drop ? <span className="text-rose-600 font-bold block mt-0.5">Bajó {skill.drop}% esta semana</span> : ''}
            </p>
            <button className={`text-sm font-bold flex items-center gap-1 hover:underline ${skill.mastery < 25 ? 'text-rose-600' : 'text-amber-600'}`}>
              <span>↗️</span> Practicar ahora
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
