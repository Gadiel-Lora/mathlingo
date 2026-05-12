import { motion } from 'framer-motion'
import { useDashboardStore } from '../../store/dashboardStore'

function ProgressRow({
  label,
  value,
  detail,
  tone,
  delay = 0,
}: {
  label: string
  value: number
  detail?: string
  tone: 'teal' | 'green'
  delay?: number
}) {
  const fillClass = tone === 'teal' ? 'from-teal-700 to-cyan-500' : 'from-emerald-600 to-lime-500'

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-base font-black text-slate-900">{label}</span>
        <span className="font-serif text-3xl font-black text-teal-700">{value}%</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-slate-100 shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay }}
          className={`absolute left-0 top-0 h-full rounded-full bg-gradient-to-r ${fillClass}`}
        />
      </div>
      {detail && <p className="mt-3 text-sm font-semibold text-slate-500">{detail}</p>}
    </div>
  )
}

export default function ProgressBars() {
  const { dailyProgress, dailyMinutes, weeklyProgress } = useDashboardStore()

  return (
    <section className="math-dashboard-card flex h-full flex-col justify-center space-y-6 p-8">
      <div>
        <p className="text-xs font-black text-teal-700">Dominio operativo</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">Progreso de practica</h2>
      </div>

      <ProgressRow
        label="Meta diaria"
        value={dailyProgress}
        detail={`Completaste ${dailyMinutes} de 60 minutos`}
        tone="teal"
      />

      <div className="h-px w-full bg-slate-200" />

      <ProgressRow label="Semana actual" value={weeklyProgress} tone="green" delay={0.25} />
    </section>
  )
}
