/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'
import { academicApi } from '../services/academicApi'

const AuthContext = createContext(null)
const LOCAL_SESSION_KEY = 'mathlingo-local-session'
const LOCAL_PROFILE_PREFIX = 'mathlingo-local-profile'
const REMOTE_AUTH_TIMEOUT_MS = 6000

const buildGoogleRedirect = () => {
  if (typeof window === 'undefined') return undefined
  return `${window.location.origin}/auth/callback`
}

const canUseLocalStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage)

const readStorageJson = (key) => {
  if (!canUseLocalStorage()) return null
  try {
    const rawValue = window.localStorage.getItem(key)
    return rawValue ? JSON.parse(rawValue) : null
  } catch {
    return null
  }
}

const writeStorageJson = (key, value) => {
  if (!canUseLocalStorage()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // noop
  }
}

const removeStorageValue = (key) => {
  if (!canUseLocalStorage()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // noop
  }
}

const getLocalProfileKey = (userId) => `${LOCAL_PROFILE_PREFIX}:${String(userId || '').trim()}`

const isConnectionError = (error) => {
  const message = String(error?.message || error || '').toLowerCase()
  return (
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('no se puede conectar') ||
    message.includes('no es posible conectar') ||
    message.includes('load failed') ||
    message.includes('http 401') ||
    message.includes('http 404') ||
    message.includes('http 500')
  )
}

const buildLocalUser = (email, metadata = {}) => {
  const normalizedEmail = String(email || 'estudiante@local.mathlingo').trim().toLowerCase()
  const idSafeEmail = normalizedEmail.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'estudiante'
  return {
    id: `local-${idSafeEmail}`,
    email: normalizedEmail,
    app_metadata: { provider: 'local-dev' },
    user_metadata: metadata,
    isLocal: true,
  }
}

const withTimeout = (promise, timeoutMs, label) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs)
    }),
  ])
}

const readLocalSession = () => readStorageJson(LOCAL_SESSION_KEY)

const saveLocalSession = (user) => {
  writeStorageJson(LOCAL_SESSION_KEY, {
    user,
    createdAt: new Date().toISOString(),
  })
}

const buildStudentPermissions = () => ({
  role: 'STUDENT',
  isAdmin: false,
  isTeacher: false,
  isStudent: true,
  isStaff: false,
  canAccessAdminPanel: false,
  canManageUsers: false,
  canManageRoles: false,
  canManageCurriculum: false,
  canManageSubjects: false,
  canManageLearningPaths: false,
  canViewOwnAnalytics: true,
  canViewOwnRetention: true,
  canViewRoster: false,
  canViewStudentAnalytics: false,
  canViewCohortAnalytics: false,
  canViewAdministrativeAnalytics: false,
  canReviewRetention: false,
  canActOnOwnProgress: true,
})

const decorateGradeMap = (grade) => {
  if (!grade?.id) return null
  return {
    ...grade,
    areas: (grade.areas || []).map((area) => ({
      ...area,
      topics: (area.topics || []).map((topic) => ({
        ...topic,
        lessons: (topic.lessons || []).map((lesson, index) => ({
          ...lesson,
          mastery: Number(lesson.mastery || 0),
          status: index === 0 ? 'ACTIVE' : lesson.status || 'LOCKED',
        })),
      })),
    })),
  }
}

const buildFallbackConstellation = (grade) => {
  const nodes = []
  const links = []

  for (const area of grade?.areas || []) {
    nodes.push({
      id: area.id,
      name: area.name,
      mastery: 0,
      state: 'ACTIVE',
      difficulty: 1,
    })

    for (const topic of area.topics || []) {
      nodes.push({
        id: topic.id,
        name: topic.name,
        mastery: 0,
        state: 'LOCKED',
        difficulty: topic.difficultyRange?.[0] || 1,
      })
      links.push({ source: area.id, target: topic.id })
    }
  }

  return {
    nodes,
    links,
    recommendation: nodes[1] || nodes[0] || null,
    ancestorRecommendation: null,
    branchProgress: (grade?.areas || []).map((area) => ({
      id: area.id,
      mastery: 0,
    })),
  }
}

const buildLocalProfile = async ({ user, fullName, gradeId, selectedPathType }) => {
  let grade = null

  try {
    const payload = await academicApi.getCurriculum(gradeId)
    grade = payload?.grade || null
  } catch {
    try {
      const payload = await academicApi.getCurriculum()
      grade = (payload?.grades || payload?.levels || []).find((item) => String(item.id) === String(gradeId)) || null
    } catch {
      grade = null
    }
  }

  const profile = {
    id: user.id,
    email: user.email,
    fullName: String(fullName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Estudiante').trim(),
    role: 'STUDENT',
    grade,
    selectedPathType,
    authProvider: 'local-dev',
    totalXP: 0,
    currentLevel: 1,
    currentStreak: 0,
    problemsSolved: 0,
    accuracy: 0,
    skillsMastered: 0,
    completedLessons: [],
    skillProgress: [],
    achievements: [],
    permissions: buildStudentPermissions(),
    overview: {
      profile: { grade },
      gradeMap: decorateGradeMap(grade),
      constellation: buildFallbackConstellation(grade),
    },
  }

  writeStorageJson(getLocalProfileKey(user.id), profile)
  return profile
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      return null
    }

    if (user.isLocal) {
      const localProfile = readStorageJson(getLocalProfileKey(user.id))
      if (localProfile?.grade?.id) {
        const rebuiltProfile = await buildLocalProfile({
          user,
          fullName: localProfile.fullName,
          gradeId: localProfile.grade.id,
          selectedPathType: localProfile.selectedPathType || 'GRADE',
        })
        setProfile(rebuiltProfile)
        return rebuiltProfile
      }
      setProfile(localProfile)
      return localProfile
    }

    setProfileLoading(true)
    try {
      const nextProfile = await academicApi.getUserProfile()
      setProfile(nextProfile)
      return nextProfile
    } catch (error) {
      const localProfile = readStorageJson(getLocalProfileKey(user.id))
      if (localProfile && isConnectionError(error)) {
        setProfile(localProfile)
        return localProfile
      }

      if (String(error?.message || '').includes('404')) {
        setProfile(null)
        return null
      }
      throw error
    } finally {
      setProfileLoading(false)
    }
  }, [user])

  useEffect(() => {
    let mounted = true

    const boot = async () => {
      try {
        const { data: { session: nextSession } } = await withTimeout(
          supabase.auth.getSession(),
          REMOTE_AUTH_TIMEOUT_MS,
          'Supabase session',
        )
        if (!mounted) return
        if (nextSession?.user) {
          setSession(nextSession)
          setUser(nextSession.user)
        } else {
          const localSession = readLocalSession()
          setSession(localSession)
          setUser(localSession?.user ?? null)
        }
      } catch {
        if (!mounted) return
        const localSession = readLocalSession()
        setSession(localSession)
        setUser(localSession?.user ?? null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void boot()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      if (nextSession?.user) {
        setSession(nextSession)
        setUser(nextSession.user)
      } else {
        const localSession = readLocalSession()
        setSession(localSession)
        setUser(localSession?.user ?? null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }

    void refreshProfile().catch((error) => {
      console.info('[AuthContext] Perfil aun no sincronizado:', error?.message || error)
    })
  }, [user, refreshProfile])

  const login = async (email, password) => {
    if (!email || !password) throw new Error('Email y contrasena obligatorios.')
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        REMOTE_AUTH_TIMEOUT_MS,
        'Supabase login',
      )
      if (error) throw new Error(error.message)
      return data
    } catch (error) {
      if (!isConnectionError(error)) throw error
      const localUser = buildLocalUser(email)
      saveLocalSession(localUser)
      setSession(readLocalSession())
      setUser(localUser)
      return { user: localUser, session: readLocalSession() }
    }
  }

  const register = async (email, password) => {
    if (!email || !password) throw new Error('Email y contrasena obligatorios.')
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({ email, password }),
        REMOTE_AUTH_TIMEOUT_MS,
        'Supabase register',
      )
      if (error) throw new Error(error.message)
      return data
    } catch (error) {
      if (!isConnectionError(error)) throw error
      const localUser = buildLocalUser(email)
      saveLocalSession(localUser)
      setSession(readLocalSession())
      setUser(localUser)
      return { user: localUser, session: readLocalSession() }
    }
  }

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildGoogleRedirect(),
      },
    })
    if (error) throw new Error(error.message)
  }

  const resolveCurrentUser = async () => {
    if (user) return user

    const localUser = readLocalSession()?.user
    if (localUser) return localUser

    try {
      const { data: { session: activeSession } } = await withTimeout(
        supabase.auth.getSession(),
        REMOTE_AUTH_TIMEOUT_MS,
        'Supabase session',
      )
      if (activeSession?.user) return activeSession.user
    } catch {
      // fallback below
    }

    return buildLocalUser()
  }

  const syncProfile = async (payload) => {
    const targetUser = await resolveCurrentUser()

    if (targetUser?.isLocal) {
      saveLocalSession(targetUser)
      setSession(readLocalSession())
      setUser(targetUser)
      const localProfile = await buildLocalProfile({
        user: targetUser,
        fullName: payload?.fullName,
        gradeId: payload?.gradeId,
        selectedPathType: payload?.selectedPathType || 'GRADE',
      })
      setProfile(localProfile)
      return { message: 'Perfil local sincronizado', user: targetUser }
    }

    try {
      const result = await academicApi.syncUser(payload)
      await refreshProfile()
      return result
    } catch (error) {
      if (!isConnectionError(error)) throw error
      const localUser = { ...targetUser, isLocal: true }
      saveLocalSession(localUser)
      setSession(readLocalSession())
      setUser(localUser)
      const localProfile = await buildLocalProfile({
        user: localUser,
        fullName: payload?.fullName,
        gradeId: payload?.gradeId,
        selectedPathType: payload?.selectedPathType || 'GRADE',
      })
      setProfile(localProfile)
      return { message: 'Perfil local sincronizado', user: localUser }
    }
  }

  const updateSelectedPath = async (selectedPathType) => {
    try {
      await academicApi.updateLearningPath({ selectedPathType })
      return refreshProfile()
    } catch (error) {
      const currentProfile = profile || readStorageJson(getLocalProfileKey(user?.id))
      if (!currentProfile || !isConnectionError(error)) throw error
      const nextProfile = { ...currentProfile, selectedPathType }
      writeStorageJson(getLocalProfileKey(user.id), nextProfile)
      setProfile(nextProfile)
      return nextProfile
    }
  }

  const logout = async () => {
    if (user?.isLocal) {
      removeStorageValue(LOCAL_SESSION_KEY)
      setSession(null)
      setUser(null)
      setProfile(null)
      return
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
    removeStorageValue(LOCAL_SESSION_KEY)
    setProfile(null)
  }

  const value = {
    session,
    user,
    profile,
    loading,
    profileLoading,
    login,
    register,
    loginWithGoogle,
    syncProfile,
    updateSelectedPath,
    refreshProfile,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
