import type { RouteObject } from 'react-router-dom'
import { RequireRole } from '@/app/guards'
import { ComingSoon } from '@/components/ComingSoon'

// Replace the placeholders with real pages. Paths are relative to /app.
export const userRoutes: RouteObject[] = [
  { path: 'users', element: (
      <RequireRole roles={['ADMIN']}>
        <ComingSoon title="Users" owner="Manoj" task="M7" />
      </RequireRole>
    ) },
]
