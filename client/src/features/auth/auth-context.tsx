import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, refreshSession, setAccessToken } from '@/lib/api'
import type { AuthUser, SessionResponse } from './types'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  signup: (input: SignupInput) => Promise<AuthUser>
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  /** Adopts a session the Google callback already established. */
  adoptToken: (accessToken: string) => Promise<AuthUser>
  setUser: (user: AuthUser) => void
}

export interface SignupInput {
  name: string
  email: string
  password: string
  dateOfBirth: string
  isAdultConfirmed: true
  acceptedTerms: true
  role?: 'student' | 'mentor'
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On a cold load the access token is gone (it only ever lived in memory), so
  // try the refresh cookie before deciding the visitor is signed out.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (await refreshSession()) {
          const { user } = await api<{ user: AuthUser }>('/api/auth/me')
          if (!cancelled) setUser(user)
        }
      } catch {
        /* signed out */
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const adopt = useCallback((data: SessionResponse) => {
    setAccessToken(data.accessToken)
    setUser(data.user)
    return data.user
  }, [])

  const signup = useCallback(
    async (input: SignupInput) =>
      adopt(await api<SessionResponse>('/api/auth/signup', { method: 'POST', body: input })),
    [adopt]
  )

  const login = useCallback(
    async (email: string, password: string) =>
      adopt(
        await api<SessionResponse>('/api/auth/login', {
          method: 'POST',
          body: { email, password },
        })
      ),
    [adopt]
  )

  const adoptToken = useCallback(async (accessToken: string) => {
    setAccessToken(accessToken)
    const { user } = await api<{ user: AuthUser }>('/api/auth/me')
    setUser(user)
    return user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST', skipRefresh: true })
    } finally {
      setAccessToken(null)
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, signup, login, logout, adoptToken, setUser }),
    [user, isLoading, signup, login, logout, adoptToken]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
