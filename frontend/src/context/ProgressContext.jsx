import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

const ProgressContext = createContext(null)

const INITIAL_PROGRESS_STATE = {
  completedLessons: [],
  xp: 0,
  currentStreak: 0,
}

const normalizeLessons = (value) => {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0)
    .filter((item, index, array) => array.indexOf(item) === index)
    .sort((a, b) => a - b)
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

export function ProgressProvider({ children }) {
  const { user } = useAuth()
  const [progressState, setProgressState] = useState(INITIAL_PROGRESS_STATE)
  const [loadingProgress, setLoadingProgress] = useState(true)

  const { completedLessons, xp, currentStreak } = progressState
  const level = Math.floor(xp / 100) + 1

  useEffect(() => {
    let isMounted = true

    const loadProgress = async () => {
      if (!user) {
        if (isMounted) {
          setProgressState(INITIAL_PROGRESS_STATE)
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
            setLoadingProgress(false)
          }
          return
        }

        if (isMounted) {
          setProgressState(parseProgressRow(inserted))
          setLoadingProgress(false)
        }
        return
      }

      if (isMounted) {
        setProgressState(parseProgressRow(data))
        setLoadingProgress(false)
      }
    }

    loadProgress()

    return () => {
      isMounted = false
    }
  }, [user])

  const completeLesson = async (id) => {
    const lessonId = Number(id)
    if (!Number.isInteger(lessonId) || lessonId <= 0 || !user) return
    if (completedLessons.includes(lessonId)) return

    const updatedLessons = [...completedLessons, lessonId].sort((a, b) => a - b)
    const newXp = xp + 20
    const newStreak = currentStreak + 1

    const { error } = await supabase
      .from('progress')
      .update({
        completed_lessons: updatedLessons,
        xp: newXp,
        current_streak: newStreak,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating progress:', error.message)
      return
    }

    setProgressState({
      completedLessons: updatedLessons,
      xp: newXp,
      currentStreak: newStreak,
    })
  }

  const value = useMemo(
    () => ({
      completedLessons,
      xp,
      level,
      currentStreak,
      loadingProgress,
      completeLesson,
    }),
    [completedLessons, xp, level, currentStreak, loadingProgress],
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
