/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const AUTH_STORAGE_KEY = 'mathlingo-auth-session'
const FORCE_LOCAL_ADMIN = String(import.meta.env.VITE_FORCE_LOCAL_ADMIN || 'true').toLowerCase() !== 'false'

const canUseLocalStorage = () => {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase()

const buildUserFromEmail = (email) => {
  const normalizedEmail = normalizeEmail(email)
  const localId = `local-${normalizedEmail.replace(/[^a-z0-9._-]+/g, '-')}`
  const emailName = normalizedEmail.split('@')[0] || 'usuario'

  return {
    id: localId,
    email: normalizedEmail,
    name: emailName,
    role: FORCE_LOCAL_ADMIN ? 'admin' : 'user',
    isAdmin: FORCE_LOCAL_ADMIN,
    authProvider: 'local',
  }
}

const readStoredUser = () => {
  if (!canUseLocalStorage()) return null
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const normalizedEmail = normalizeEmail(parsed?.email)
    if (!normalizedEmail) return null
    return buildUserFromEmail(normalizedEmail)
  } catch {
    return null
  }
}

const writeStoredUser = (user) => {
  if (!canUseLocalStorage()) return
  if (!user?.email) return

  try {
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        email: normalizeEmail(user.email),
      }),
    )
  } catch {
    // noop
  }
}

const clearStoredUser = () => {
  if (!canUseLocalStorage()) return
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // noop
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser())
  const loading = false

  const login = async (email, password) => {
    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) {
      throw new Error('Email obligatorio.')
    }
    if (String(password ?? '').length < 6) {
      throw new Error('La contrasena debe tener al menos 6 caracteres.')
    }

    const nextUser = buildUserFromEmail(normalizedEmail)
    setUser(nextUser)
    writeStoredUser(nextUser)
  }

  const register = async (email, password) => {
    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) {
      throw new Error('Email obligatorio.')
    }
    if (String(password ?? '').length < 6) {
      throw new Error('La contrasena debe tener al menos 6 caracteres.')
    }

    const nextUser = buildUserFromEmail(normalizedEmail)
    setUser(nextUser)
    writeStoredUser(nextUser)
  }

  const logout = async () => {
    setUser(null)
    clearStoredUser()
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
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
