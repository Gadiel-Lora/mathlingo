import { motion } from 'framer-motion'
import { useDashboardStore } from '../../store/dashboardStore'

export default function SkillAlerts() {
  const { skills } = useDashboardStore()
  const alertSkills = skills.filter(s => s.mastery < 50 && s.mastery > 0)

  if (!alertSkills.length) return null

  return (
    <section className="math-dashboard-card mt-6 flex flex-col space-y-3 p-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-amber-700">Atencion</p>
          <h3 className="text-lg font-black text-slate-950">Alertas de practica</h3>
        </div>
        <span className="math-formula-token">p&lt;50%</span>
      </div>
      <div className="space-y-3">
        {alertSkills.map((skill, idx) => (
          <motion.div
            key={skill.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`cursor-pointer rounded-lg border-l-4 p-4 shadow-sm transition-colors ${
              skill.mastery < 25
                ? 'border-rose-500 bg-rose-50 hover:bg-rose-100/70'
                : 'border-amber-500 bg-amber-50 hover:bg-amber-100/70'
            }`}
          >
            <p className={`font-black ${skill.mastery < 25 ? 'text-rose-900' : 'text-amber-900'}`}>{skill.name}</p>
            <p className={`mb-2 mt-1 text-sm font-bold ${skill.mastery < 25 ? 'text-rose-700' : 'text-amber-800'}`}>
              Dominio actual: {skill.mastery}% {skill.drop ? <span className="mt-0.5 block font-black text-rose-600">Bajo {skill.drop}% esta semana</span> : ''}
            </p>
            <button className={`text-sm font-black hover:underline ${skill.mastery < 25 ? 'text-rose-600' : 'text-amber-700'}`}>
              Practicar ahora
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
