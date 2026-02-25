
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from './AuthContext'
import { supabase } from '../supabase/client'

const ProgressContext = createContext(null)

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

const parseProgressRow = (row) => ({
  completedLessons: normalizeLessons(row?.completed_lessons),
  xp: normalizeNumber(row?.xp),
  currentStreak: normalizeNumber(row?.current_streak),
})

const buildCompletedLessonState = ({ previousState, lessonId, requestedXp, incrementStreak }) => {
  const normalizedLessonId = String(lessonId ?? '').trim()
  if (!normalizedLessonId) return previousState

  const previousLessons = normalizeLessons(previousState?.completedLessons)
  if (previousLessons.includes(normalizedLessonId)) {
    return previousState
  }

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
    let isMounted = true

    const loadProgress = async () => {
      if (!user) {
        if (isMounted) {
          setProgressState(INITIAL_PROGRESS_STATE)
          progressRef.current = INITIAL_PROGRESS_STATE
          setLoadingProgress(false)
        }
        return
      }

      setLoadingProgress(true)

      const { data, error } = await supabase.from('progress').select('*').eq('user_id', user.id).maybeSingle()

      if (error) {
        console.error('Error loading progress:', error.message)
        if (isMounted) {
          setProgressState(INITIAL_PROGRESS_STATE)
          progressRef.current = INITIAL_PROGRESS_STATE
          setLoadingProgress(false)
        }
        return
      }

      if (!data) {
        const initialPayload = {
          user_id: user.id,
          completed_lessons: [],
          xp: 0,
          current_streak: 0,
        }

        const { data: inserted, error: insertError } = await supabase
          .from('progress')
          .insert(initialPayload)
          .select('*')
          .single()

        if (insertError) {
          console.error('Error creating initial progress:', insertError.message)
          if (isMounted) {
            setProgressState(INITIAL_PROGRESS_STATE)
            progressRef.current = INITIAL_PROGRESS_STATE
            setLoadingProgress(false)
          }
          return
        }

        if (isMounted) {
          const parsedInserted = parseProgressRow(inserted)
          setProgressState(parsedInserted)
          progressRef.current = parsedInserted
          setLoadingProgress(false)
        }
        return
      }

      if (isMounted) {
        const parsedData = parseProgressRow(data)
        setProgressState(parsedData)
        progressRef.current = parsedData
        setLoadingProgress(false)
      }
    }

    loadProgress()

    return () => {
      isMounted = false
    }
  }, [user])

  const completeLesson = useCallback(
    async (payload) => {
      const isObjectPayload = payload && typeof payload === 'object'
      const lessonId = String(isObjectPayload ? payload.lessonId : payload ?? '').trim()
      const requestedXp = isObjectPayload ? payload.xpEarned : 0
      const incrementStreak = isObjectPayload ? payload.incrementStreak !== false : true

      if (!lessonId || !user) return

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

      const { error } = await supabase
        .from('progress')
        .update({
          completed_lessons: nextState.completedLessons,
          xp: nextState.xp,
          current_streak: nextState.currentStreak,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (error) {
        console.error('Error updating progress:', error.message)
        setProgressState(previousState)
        progressRef.current = previousState
        return
      }
    },
    [user],
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
