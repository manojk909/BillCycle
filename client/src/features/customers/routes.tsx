import type { RouteObject } from 'react-router-dom'
import { ComingSoon } from '@/components/ComingSoon'

// Replace the placeholders with real pages. Paths are relative to /app.
export const customerRoutes: RouteObject[] = [
  { path: 'customers', element: <ComingSoon title="Customers" owner="Manoj" task="M9" /> },
]
