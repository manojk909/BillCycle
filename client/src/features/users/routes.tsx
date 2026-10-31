import type { RouteObject } from 'react-router-dom'
import { RequireRole } from '@/app/guards'
import { UsersPage } from './pages/UsersPage'

// Paths are relative to /app. Admin only (server enforces it too).
export const userRoutes: RouteObject[] = [
  {
    path: 'users',
    element: (
      <RequireRole roles={['ADMIN']}>
        <UsersPage />
      </RequireRole>
    ),
  },
]
