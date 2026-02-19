import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const COMPLETED_LESSONS_STORAGE_KEY = 'mathlingo.completedLessons'
const XP_STORAGE_KEY = 'mathlingo.xp'

const ProgressContext = createContext(null)

const parseStoredLessons = (value) => {
  try {
    const parsed = JSON.parse(value ?? '[]')
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0)
      .filter((item, index, array) => array.indexOf(item) === index)
      .sort((a, b) => a - b)
  } catch {
    return []
  }
}

const parseStoredXp = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.floor(parsed)
}

export function ProgressProvider({ children }) {
  const [progressState, setProgressState] = useState(() => {
    if (typeof window === 'undefined') {
      return { completedLessons: [], xp: 0 }
    }

    return {
      completedLessons: parseStoredLessons(window.localStorage.getItem(COMPLETED_LESSONS_STORAGE_KEY)),
      xp: parseStoredXp(window.localStorage.getItem(XP_STORAGE_KEY)),
    }
  })

  const { completedLessons, xp } = progressState
  const level = Math.floor(xp / 100) + 1

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(COMPLETED_LESSONS_STORAGE_KEY, JSON.stringify(completedLessons))
    window.localStorage.setItem(XP_STORAGE_KEY, String(xp))
  }, [completedLessons, xp])

  const completeLesson = (id) => {
    const lessonId = Number(id)
    if (!Number.isInteger(lessonId) || lessonId <= 0) return

    setProgressState((prev) => {
      if (prev.completedLessons.includes(lessonId)) return prev

      return {
        completedLessons: [...prev.completedLessons, lessonId].sort((a, b) => a - b),
        xp: prev.xp + 20,
      }
    })
  }

  const value = useMemo(
    () => ({
      completedLessons,
      xp,
      level,
      completeLesson,
    }),
    [completedLessons, xp, level],
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
