import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { academicApi } from '../services/academicApi';
import { useDashboardStore } from '../store/dashboardStore';

/**
 * Hook que carga el perfil real del usuario autenticado desde la API
 * y popula el dashboardStore con datos reales (XP, nombre, nivel, skills, etc.)
 */
export function useUserProfile() {
  const { user } = useAuth();
  const setProfile = useDashboardStore((s) => s.setProfile);
  const profileLoaded = useDashboardStore((s) => s.profileLoaded);

  useEffect(() => {
    if (!user || profileLoaded) return;

    let cancelled = false;

    async function fetchProfile() {
      try {
        const profile = await academicApi.getUserProfile();
        if (cancelled) return;

        setProfile({
          userName: profile.fullName || profile.email?.split('@')[0] || 'Estudiante',
          userLevel: profile.currentLevel ?? 1,
          totalXP: profile.totalXP ?? 0,
          streak: profile.currentStreak ?? 0,
          accuracy: profile.accuracy ?? 0,
          skills: (profile.skillProgress || []).map((sp) => ({
            id: sp.skillId,
            name: sp.skillName,
            category: sp.category,
            grade: profile.grade?.name || '',
            mastery: sp.mastery,
            problemsSolved: sp.problemsSolved,
            totalProblems: sp.totalProblems,
            accuracy: sp.accuracy,
          })),
        });
      } catch (err) {
        // Si no existe perfil aún (nuevo usuario), no bloqueamos la app
        console.info('[useUserProfile] Perfil no disponible aún:', err?.message);
      }
    }

    fetchProfile();
    return () => { cancelled = true; };
  }, [user, profileLoaded, setProfile]);
}
