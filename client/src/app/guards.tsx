import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { PageSpinner } from '@/components/ui'
import { homePathFor, useAuth, type Role } from './auth-context'

/** Logged-out users go to /login (and come back afterwards). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <PageSpinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <>{children}</>
}

/** Users without one of `roles` are sent to their own home (portal or back office). */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <PageSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />
  return <>{children}</>
}

/** Auth pages: already logged-in users skip straight to their home. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <PageSpinner />
  if (user) return <Navigate to={homePathFor(user.role)} replace />
  return <>{children}</>
}

export function HomeRedirect() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <PageSpinner />
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />
}
