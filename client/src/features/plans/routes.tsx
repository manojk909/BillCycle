import type { RouteObject } from 'react-router-dom'
import { ComingSoon } from '@/components/ComingSoon'

// Replace the placeholders with real pages. Paths are relative to /app.
export const planRoutes: RouteObject[] = [
  { path: 'plans', element: <ComingSoon title="Recurring plans" owner="Sandhya" task="S5" /> },
]
