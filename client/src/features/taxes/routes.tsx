import type { RouteObject } from 'react-router-dom'
import { RequireRole } from '@/app/guards'
import { ComingSoon } from '@/components/ComingSoon'

// Replace the placeholders with real pages. Paths are relative to /app.
export const taxRoutes: RouteObject[] = [
  { path: 'config/taxes', element: (
      <RequireRole roles={['ADMIN']}>
        <ComingSoon title="Taxes" owner="Sandhya" task="S4" />
      </RequireRole>
    ) },
  { path: 'config/payment-terms', element: (
      <RequireRole roles={['ADMIN']}>
        <ComingSoon title="Payment terms" owner="Sandhya" task="S4" />
      </RequireRole>
    ) },
  { path: 'config/payment-methods', element: (
      <RequireRole roles={['ADMIN']}>
        <ComingSoon title="Payment methods" owner="Sandhya" task="S4" />
      </RequireRole>
    ) },
]
