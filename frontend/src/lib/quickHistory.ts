// Utility functions for quick practice history — separated to comply with Vite Fast Refresh
// (non-component exports must not live in the same file as a default React component export)

export type QuickAttempt = {
  id: string
  problem: string
  submittedAt: string
  date: string
}

const QUICK_HISTORY_PREFIX = 'mathlingo-quick-history'

export const getQuickHistoryKey = (userId: string) =>
  `${QUICK_HISTORY_PREFIX}:${String(userId || '').trim()}`

export function getQuickHistory(userId: string): QuickAttempt[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(getQuickHistoryKey(userId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveQuickAttempt(userId: string, attempt: QuickAttempt): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getQuickHistory(userId)
    const updated = [attempt, ...existing].slice(0, 50)
    window.localStorage.setItem(getQuickHistoryKey(userId), JSON.stringify(updated))
  } catch {
    // noop
  }
}
