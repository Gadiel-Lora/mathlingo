/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { supabase } from '../lib/supabase'
import { academicApi } from '../services/academicApi'

const AuthContext = createContext(null)

const buildGoogleRedirect = () => {
  if (typeof window === 'undefined') return undefined
  return `${window.location.origin}/auth/callback`
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null)
      return null
    }

    setProfileLoading(true)
    try {
      const nextProfile = await academicApi.getUserProfile()
      setProfile(nextProfile)
      return nextProfile
    } catch (error) {
      if (String(error?.message || '').includes('404')) {
        setProfile(null)
        return null
      }
      throw error
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const boot = async () => {
      const { data: { session: nextSession } } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    }

    void boot()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
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
  }, [user])

  const login = async (email, password) => {
    if (!email || !password) throw new Error('Email y contrasena obligatorios.')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return data
  }

  const register = async (email, password) => {
    if (!email || !password) throw new Error('Email y contrasena obligatorios.')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw new Error(error.message)
    return data
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

  const syncProfile = async (payload) => {
    const result = await academicApi.syncUser(payload)
    await refreshProfile()
    return result
  }

  const updateSelectedPath = async (selectedPathType) => {
    await academicApi.updateLearningPath({ selectedPathType })
    return refreshProfile()
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
    setProfile(null)
  }

  const value = useMemo(() => ({
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
  }), [session, user, profile, loading, profileLoading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
