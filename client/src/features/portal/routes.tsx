import type { RouteObject } from 'react-router-dom'
import { ComingSoon } from '@/components/ComingSoon'

// Replace the placeholders with real pages. Paths are relative to /my.
export const portalRoutes: RouteObject[] = [
  { path: 'subscriptions', element: <ComingSoon title="My subscriptions" owner="Manoj" task="M13" /> },
  { path: 'invoices', element: <ComingSoon title="My invoices" owner="Manoj" task="M13" /> },
  { path: 'profile', element: <ComingSoon title="My profile" owner="Manoj" task="M13" /> },
]
