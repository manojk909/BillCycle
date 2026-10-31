import type { RouteObject } from 'react-router-dom'
import { ComingSoon } from '@/components/ComingSoon'

// Replace the placeholders with real pages. Paths are relative to /app.
export const paymentRoutes: RouteObject[] = [
  { path: 'payments', element: <ComingSoon title="Payments" owner="Manoj" task="M10" /> },
]
