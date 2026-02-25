/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

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

const canUseLocalStorage = () => {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

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
  const storageKey = buildStorageKey(userId)
  if (!storageKey || storageKey.endsWith(':')) return

  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        completedLessons: normalizeLessons(progressState?.completedLessons),
        xp: normalizeNumber(progressState?.xp),
        currentStreak: normalizeNumber(progressState?.currentStreak),
      }),
    )
  } catch {
    // noop
  }
}

const buildCompletedLessonState = ({ previousState, lessonId, requestedXp, incrementStreak }) => {
  const normalizedLessonId = String(lessonId ?? '').trim()
  if (!normalizedLessonId) return previousState

  const previousLessons = normalizeLessons(previousState?.completedLessons)
  if (previousLessons.includes(normalizedLessonId)) return previousState

  const earnedXp = normalizeNumber(requestedXp)
  const previousXp = normalizeNumber(previousState?.xp)
  const previousStreak = normalizeNumber(previousState?.currentStreak)

  return {
    completedLessons: [...previousLessons, normalizedLessonId],
    xp: previousXp + earnedXp,
    currentStreak: incrementStreak ? previousStreak + 1 : previousStreak,
  }
}

export function ProgressProvider({ children }) {
  const { user } = useAuth()
  const [progressState, setProgressState] = useState(INITIAL_PROGRESS_STATE)
  const [loadingProgress, setLoadingProgress] = useState(true)
  const progressRef = useRef(INITIAL_PROGRESS_STATE)

  const { completedLessons, xp, currentStreak } = progressState
  const level = Math.floor(xp / 100) + 1

  useEffect(() => {
    progressRef.current = progressState
  }, [progressState])

  useEffect(() => {
    if (!user?.id) {
      setProgressState(INITIAL_PROGRESS_STATE)
      progressRef.current = INITIAL_PROGRESS_STATE
      setLoadingProgress(false)
      return
    }

    setLoadingProgress(true)
    const localProgress = readLocalProgress(user.id)
    setProgressState(localProgress)
    progressRef.current = localProgress
    setLoadingProgress(false)
  }, [user?.id])

  const completeLesson = useCallback(
    async (payload) => {
      const isObjectPayload = payload && typeof payload === 'object'
      const lessonId = String(isObjectPayload ? payload.lessonId : payload ?? '').trim()
      const requestedXp = isObjectPayload ? payload.xpEarned : 0
      const incrementStreak = isObjectPayload ? payload.incrementStreak !== false : true

      if (!lessonId || !user?.id) return

      const previousState = progressRef.current
      const nextState = buildCompletedLessonState({
        previousState,
        lessonId,
        requestedXp,
        incrementStreak,
      })

      if (nextState === previousState) return

      setProgressState(nextState)
      progressRef.current = nextState
      writeLocalProgress(user.id, nextState)
    },
    [user?.id],
  )

  const value = useMemo(
    () => ({
      completedLessons,
      xp,
      level,
      currentStreak,
      loadingProgress,
      completeLesson,
    }),
    [completedLessons, xp, level, currentStreak, loadingProgress, completeLesson],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const context = useContext(ProgressContext)
  if (!context) {
    throw new Error('useProgress must be used within ProgressProvider')
  }
  return context
}
