import { motion } from 'framer-motion'
import { useDashboardStore } from '../../store/dashboardStore'

const StatBox = ({ label, value, formula }: { label: string, value: string | number, formula: string }) => (
  <div className="rounded-lg border border-white/20 bg-white/12 p-4 backdrop-blur-sm">
    <div className="font-serif text-sm font-black text-emerald-100">{formula}</div>
    <div className="mt-3 text-2xl font-black text-white">{value}</div>
    <div className="mt-1 text-xs font-bold text-emerald-100">{label}</div>
  </div>
)

export default function WelcomeSection() {
  const { userName, userLevel, streak, totalXP, accuracy } = useDashboardStore()

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-lg bg-teal-800 p-8 text-white shadow-lg"
    >
      <div
        className="absolute inset-0 opacity-20"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.24) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
        }}
      />
      <div className="absolute right-6 top-6 hidden font-serif text-7xl font-black text-white/10 md:block" aria-hidden="true">
        f(x)
      </div>

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold text-emerald-100">Sesion de practica</p>
          <h1 className="mt-2 text-4xl font-black leading-tight">Hola, {userName}</h1>
          <p className="mt-2 max-w-2xl text-base font-medium text-teal-50">
            Hoy seguimos construyendo dominio con ejercicios, evidencia y rutas claras.
          </p>
        </div>
        <div className="rounded-lg border border-white/25 bg-white/12 px-5 py-4 text-center backdrop-blur-md">
          <div className="text-4xl font-black">{userLevel}</div>
          <div className="text-xs font-bold text-emerald-100">Nivel actual</div>
        </div>
      </div>

      <div className="relative z-10 mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatBox label="Racha" value={`${streak} dias`} formula="d(n)" />
        <StatBox label="XP total" value={totalXP.toLocaleString()} formula="sum XP" />
        <StatBox label="Precision" value={`${accuracy}%`} formula="aciertos/n" />
      </div>
    </motion.section>
  )
}
