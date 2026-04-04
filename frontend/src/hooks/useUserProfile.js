import { useEffect } from 'react'

import { useAuth } from '../context/AuthContext'
import { useDashboardStore } from '../store/dashboardStore'

export function useUserProfile() {
  const { user, profile, refreshProfile } = useAuth()
  const setProfile = useDashboardStore((state) => state.setProfile)
  const profileLoaded = useDashboardStore((state) => state.profileLoaded)

  useEffect(() => {
    if (!user || profileLoaded) return

    let cancelled = false

    const syncStore = async () => {
      try {
        const sourceProfile = profile || (await refreshProfile())
        if (!sourceProfile || cancelled) return

        setProfile({
          userName: sourceProfile.fullName || sourceProfile.email?.split('@')[0] || 'Estudiante',
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
        console.info('[useUserProfile] Perfil no disponible aun:', error?.message)
      }
    }

    void syncStore()
    return () => {
      cancelled = true
    }
  }, [user, profile, profileLoaded, refreshProfile, setProfile])
}
