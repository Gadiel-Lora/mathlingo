import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { useAuth } from '../../context/AuthContext'
import AchievementDetailModal from './AchievementDetailModal'

const achievementCatalog = [
  { id: 'first-lesson', name: 'Primeros Pasos', icon: '01', rarity: 'Comun', hint: 'Completa tu primera leccion.', desc: 'Completaste tu primera leccion en la plataforma.' },
  { id: 'streak-7', name: 'Racha de Estudio', icon: '07', rarity: 'Raro', hint: 'Mantén una racha de estudio de 7 dias.', desc: 'Mantuviste una racha de estudio durante 7 dias.' },
  { id: 'fast-10', name: 'Mente Veloz', icon: '10', rarity: 'Epico', hint: 'Resuelve 10 problemas correctos con buen tiempo.', desc: 'Resolviste 10 problemas correctos en una sesion.' },
  { id: 'fractions-mastery', name: 'Maestro de Fracciones', icon: 'FR', rarity: 'Epico', hint: 'Domina la unidad de fracciones.', desc: 'Dominaste la skill de fracciones.' },
  { id: 'algebra-perfect', name: 'Algebra Precisa', icon: 'AL', rarity: 'Mitico', hint: 'Mantén precision alta en algebra.', desc: 'Lograste precision sobresaliente en algebra.' },
  { id: 'constellation', name: 'Constelacion Activa', icon: 'CN', rarity: 'Legendario', hint: 'Avanza por una ruta autonoma.', desc: 'Activaste una ruta de aprendizaje autonoma.' },
  { id: 'teacher-ai', name: 'Dialogo Matematico', icon: 'IA', rarity: 'Legendario', hint: 'Usa el Profe IA sin pedir la respuesta final.', desc: 'Usaste el Profe IA de forma guiada.' },
  { id: 'perseverance', name: 'Perseverancia', icon: 'PV', rarity: 'Raro', hint: 'Falla, corrige y completa un problema.', desc: 'Convertiste errores en aprendizaje.' },
]

export default function AchievementsView() {
  const { profile, loading: authLoading } = useAuth()
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null)

  const achievements = useMemo(() => {
    // Guard: only use achievements from the authenticated profile.
    // If profile is not yet loaded (null), treat as empty array — new user starts at zero.
    const unlocked = Array.isArray((profile as any)?.achievements)
      ? (profile as any).achievements
      : []

    return achievementCatalog.map((item) => {
      const match = unlocked.find((achievement: any) => {
        return (
          String(achievement?.id || achievement?.achievementId || '').toLowerCase() === item.id ||
          String(achievement?.name || '').toLowerCase() === item.name.toLowerCase()
        )
      })

      return {
        ...item,
        unlocked: Boolean(match),
        unlockedDate: match?.unlockedAt ? new Date(match.unlockedAt).toLocaleDateString() : '',
      }
    })
  }, [profile])

  const unlockedCount = achievements.filter((a) => a.unlocked).length
  const progressRatio = Math.round((unlockedCount / achievements.length) * 100)

  // Loading skeleton while auth resolves
  if (authLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 pb-20">
        <div className="animate-pulse rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-8">
            <div className="h-32 w-32 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-3">
              <div className="h-8 w-48 rounded bg-slate-200" />
              <div className="h-4 w-64 rounded bg-slate-100" />
              <div className="h-3 w-full rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse h-44 rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20">
      {/* Header card */}
      <div className="relative flex min-h-[160px] flex-col items-center gap-8 overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-sm md:flex-row">
        <div className="relative z-10 flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-[6px] border-white bg-gradient-to-br from-slate-200 to-slate-300 text-4xl font-black text-slate-700 shadow-inner">
          {unlockedCount}
        </div>
        <div className="relative z-10 flex-1 text-center md:text-left">
          <h2 className="mb-2 text-3xl font-black text-slate-800">Sala de Logros</h2>
          <p className="mb-5 font-medium text-slate-500">
            {unlockedCount === 0
              ? 'Aún no has desbloqueado ningún logro. ¡Empieza a practicar!'
              : `Has desbloqueado ${unlockedCount} de ${achievements.length} logros.`}
          </p>

          <div className="flex items-center gap-4">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressRatio}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500"
              />
            </div>
            <span className="font-black text-slate-700">{progressRatio}%</span>
          </div>
        </div>
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
        {achievements.map((achievement, index) => (
          <motion.button
            key={achievement.id}
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.04 }}
            onClick={() => setSelectedAchievement(achievement)}
            className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border p-6 text-center shadow-sm transition-all ${
              achievement.unlocked
                ? 'border-indigo-200 bg-white hover:border-indigo-400'
                : 'border-slate-200 bg-slate-50 opacity-80 hover:bg-slate-100'
            }`}
          >
            <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-black ${
              achievement.unlocked ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
            }`}>
              {achievement.unlocked ? achievement.icon : '🔒'}
            </div>
            <p className={`font-black leading-tight tracking-tight ${achievement.unlocked ? 'text-slate-800' : 'text-slate-500'}`}>
              {achievement.unlocked ? achievement.name : 'Logro bloqueado'}
            </p>
            {achievement.unlocked && (
              <p className="mt-3 rounded border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                {achievement.rarity}
              </p>
            )}
            {!achievement.unlocked && (
              <p className="mt-2 text-[11px] text-slate-400 italic">{achievement.hint}</p>
            )}
          </motion.button>
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
