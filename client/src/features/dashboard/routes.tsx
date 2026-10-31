import type { RouteObject } from 'react-router-dom'
import { ComingSoon } from '@/components/ComingSoon'

// Replace the placeholders with real pages. Paths are relative to /app.
export const dashboardRoutes: RouteObject[] = [
  { path: 'dashboard', element: <ComingSoon title="Dashboard" owner="Manoj" task="M12" /> },
]
