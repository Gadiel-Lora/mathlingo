import { useEffect, useRef } from 'react'

import { useAuth } from '../context/AuthContext'
import { useDashboardStore } from '../store/dashboardStore'

export function useUserProfile() {
  const { user, profile, refreshProfile } = useAuth()
  const setProfile = useDashboardStore((state) => state.setProfile)
  const resetProfile = useDashboardStore((state) => state.resetProfile)
  const profileLoaded = useDashboardStore((state) => state.profileLoaded)

  const lastUserIdRef = useRef(null)

  useEffect(() => {
    const currentId = user?.id ?? null

    if (currentId !== lastUserIdRef.current) {
      resetProfile()
      lastUserIdRef.current = currentId
    }
  }, [user?.id, resetProfile])

  useEffect(() => {
    if (!user?.id) return
    if (profileLoaded) return

    let cancelled = false

    const syncStore = async () => {
      try {
        const sourceProfile = profile || (await refreshProfile())
        if (!sourceProfile || cancelled) return

        setProfile({
          userName: sourceProfile.fullName || sourceProfile.email?.split('@')[0] || 'Nuevo Usuario',
          userLevel: sourceProfile.currentLevel ?? 1,
          totalXP: sourceProfile.totalXP ?? 0,
          streak: sourceProfile.currentStreak ?? 0,
          accuracy: sourceProfile.accuracy ?? 0,
          skills: (sourceProfile.skillProgress || []).map((item) => ({
            id: item.skillId,
            name: item.skillName,
            category: item.category,
            grade: sourceProfile.grade?.name || '',
            mastery: item.mastery,
            problemsSolved: item.problemsSolved,
            totalProblems: item.totalProblems,
            accuracy: item.accuracy,
          })),
        })
      } catch (error) {
        console.info('[useUserProfile] Perfil no disponible aún:', error?.message)
      }
    }

    void syncStore()
    return () => {
      cancelled = true
    }
  }, [user?.id, profile, profileLoaded, refreshProfile, setProfile])
}
