import type { RouteObject } from 'react-router-dom'
import { ComingSoon } from '@/components/ComingSoon'

// Replace the placeholders with real pages. Paths are relative to /app.
export const subscriptionRoutes: RouteObject[] = [
  { path: 'subscriptions', element: <ComingSoon title="Subscriptions" owner="Shubham" task="SK3" /> },
]
