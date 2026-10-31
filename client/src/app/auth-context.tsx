import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, ApiError, type ApiItem } from '@/lib/api'

export type Role = 'ADMIN' | 'INTERNAL' | 'PORTAL'

export type User = {
  id: number
  name: string
  email: string
  role: Role
  customerId: number | null
}

export type SignupInput = {
  name: string
  email: string
  password: string
  companyName?: string
}

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  signup: (data: SignupInput) => Promise<User>
  logout: () => Promise<void>
  refresh: () => Promise<User | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const queryClient = useQueryClient()

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<ApiItem<User>>('/auth/me')
      setUser(res.data)
      return res.data
    } catch (err) {
      if (!(err instanceof ApiError) || err.status === 401) setUser(null)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<ApiItem<User>>('/auth/login', { email, password })
    setUser(res.data)
    return res.data
  }, [])

  const signup = useCallback(async (data: SignupInput) => {
    const res = await api.post<ApiItem<User>>('/auth/signup', data)
    setUser(res.data)
    return res.data
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
      queryClient.clear()
    }
  }, [queryClient])

  const value = useMemo(() => ({ user, isLoading, login, signup, logout, refresh }), [user, isLoading, login, signup, logout, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

// eslint-disable-next-line react-refresh/only-export-components
export function homePathFor(role: Role) {
  return role === 'PORTAL' ? '/my/subscriptions' : '/app/dashboard'
}
