/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'

import { ADMIN_UNLOCK_SENTINEL } from '../lib/academicCurriculum'
import { academicApi } from '../services/academicApi'
import { useAuth } from './AuthContext'

const ProgressContext = createContext(null)
const PROGRESS_STORAGE_PREFIX = 'mathlingo-progress'

const INITIAL_PROGRESS_STATE = {
  completedLessons: [],
  xp: 0,
  currentStreak: 0,
}

const normalizeLessons = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
}

const normalizeNumber = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.floor(parsed)
}

const canUseLocalStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage)
const buildStorageKey = (userId) => `${PROGRESS_STORAGE_PREFIX}:${String(userId ?? '').trim()}`

const readLocalProgress = (userId) => {
  if (!canUseLocalStorage()) return INITIAL_PROGRESS_STATE
  const storageKey = buildStorageKey(userId)
  if (!storageKey || storageKey.endsWith(':')) return INITIAL_PROGRESS_STATE
  try {
    const rawValue = window.localStorage.getItem(storageKey)
    if (!rawValue) return INITIAL_PROGRESS_STATE
    const parsed = JSON.parse(rawValue)
    return {
      completedLessons: normalizeLessons(parsed?.completedLessons),
      xp: normalizeNumber(parsed?.xp),
      currentStreak: normalizeNumber(parsed?.currentStreak),
    }
  } catch {
    return INITIAL_PROGRESS_STATE
  }
}

const writeLocalProgress = (userId, progressState) => {
  if (!canUseLocalStorage()) return
  try {
    window.localStorage.setItem(buildStorageKey(userId), JSON.stringify(progressState))
  } catch {
    // noop
  }
}

const buildInitialProgressState = (user, profile) => {
  if (!user?.id) return INITIAL_PROGRESS_STATE
  const localProgress = readLocalProgress(user.id)
  const profileLessons = normalizeLessons(profile?.completedLessons)
  return {
    completedLessons: normalizeLessons([...localProgress.completedLessons, ...profileLessons]),
    xp: Math.max(localProgress.xp, normalizeNumber(profile?.totalXP)),
    currentStreak: Math.max(localProgress.currentStreak, normalizeNumber(profile?.currentStreak)),
  }
}

const progressReducer = (state, action) => {
  if (action.type === 'hydrate') return action.payload
  if (action.type === 'completeLesson') {
    const lessonId = String(action.payload?.lessonId ?? '').trim()
    if (!lessonId || state.completedLessons.includes(lessonId)) return state
    const xpEarned = normalizeNumber(action.payload?.xpEarned)
    return {
      completedLessons: [...state.completedLessons, lessonId],
      xp: state.xp + xpEarned,
      currentStreak: state.currentStreak + (action.payload?.incrementStreak === false ? 0 : 1),
    }
  }
  return state
}

export function ProgressProvider({ children }) {
  const { user, profile } = useAuth()
  const [progressState, dispatch] = useReducer(progressReducer, buildInitialProgressState(user, profile))

  const { completedLessons, xp, currentStreak } = progressState
  const level = Math.floor(xp / 100) + 1
  const loadingProgress = false

  useEffect(() => {
    dispatch({ type: 'hydrate', payload: buildInitialProgressState(user, profile) })
  }, [user, profile])

  useEffect(() => {
    if (user?.id) writeLocalProgress(user.id, progressState)
  }, [progressState, user])

  const completeLesson = useCallback(async (payload) => {
    const lessonId = String(payload?.lessonId ?? payload ?? '').trim()
    const xpEarned = typeof payload === 'object' ? payload.xpEarned : 0
    if (!lessonId || !user?.id) return

    dispatch({
      type: 'completeLesson',
      payload: { lessonId, xpEarned, incrementStreak: typeof payload === 'object' ? payload.incrementStreak : true },
    })

    try {
      await academicApi.markLessonCompleted({
        lessonId,
        masteryPercentage: 100,
        skillId: typeof payload === 'object' ? payload.skillId : undefined,
        context: { source: 'progress-context' },
      })
    } catch (error) {
      console.info('[ProgressContext] No se pudo sincronizar la leccion completada:', error?.message)
    }
  }, [user])

  const value = useMemo(() => ({
    completedLessons: completedLessons.includes(ADMIN_UNLOCK_SENTINEL) ? completedLessons : completedLessons,
    xp,
    level,
    currentStreak,
    loadingProgress,
    completeLesson,
  }), [completedLessons, xp, level, currentStreak, loadingProgress, completeLesson])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const context = useContext(ProgressContext)
  if (!context) throw new Error('useProgress must be used within ProgressProvider')
  return context
}
