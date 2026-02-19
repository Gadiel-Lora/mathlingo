import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AUTH_STORAGE_KEY = 'mathlingo.user'

const AuthContext = createContext(null)

const parseStoredUser = (value) => {
  try {
    const parsed = JSON.parse(value ?? 'null')
    if (!parsed || typeof parsed !== 'object') return null

    const id = typeof parsed.id === 'string' ? parsed.id : null
    const email = typeof parsed.email === 'string' ? parsed.email : null
    if (!id || !email) return null

    return { id, email }
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    const storedUser = parseStoredUser(window.localStorage.getItem(AUTH_STORAGE_KEY))
    setUser(storedUser)
    setLoading(false)
  }, [])

  const login = (email) => {
    const normalizedEmail = String(email ?? '').trim().toLowerCase()
    if (!normalizedEmail) return null

    const nextUser = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
    }

    setUser(nextUser)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser))
    }
    return nextUser
  }

  const logout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
    }
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
