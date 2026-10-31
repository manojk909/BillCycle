import type { RouteObject } from 'react-router-dom'
import { RequireRole } from '@/app/guards'
import { ComingSoon } from '@/components/ComingSoon'

// Replace the placeholders with real pages. Paths are relative to /app.
export const productRoutes: RouteObject[] = [
  { path: 'products', element: <ComingSoon title="Products" owner="Sandhya" task="S3" /> },
  { path: 'config/attributes', element: (
      <RequireRole roles={['ADMIN']}>
        <ComingSoon title="Attributes" owner="Sandhya" task="S1" />
      </RequireRole>
    ) },
]
