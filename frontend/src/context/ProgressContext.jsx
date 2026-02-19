import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'mathlingo.completedLessons'

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

export function ProgressProvider({ children }) {
  const [completedLessons, setCompletedLessons] = useState(() => {
    if (typeof window === 'undefined') return []
    return parseStoredLessons(window.localStorage.getItem(STORAGE_KEY))
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(completedLessons))
  }, [completedLessons])

  const completeLesson = (id) => {
    const lessonId = Number(id)
    if (!Number.isInteger(lessonId) || lessonId <= 0) return

    setCompletedLessons((prev) => {
      if (prev.includes(lessonId)) return prev
      return [...prev, lessonId].sort((a, b) => a - b)
    })
  }

  const value = useMemo(
    () => ({
      completedLessons,
      completeLesson,
    }),
    [completedLessons],
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
