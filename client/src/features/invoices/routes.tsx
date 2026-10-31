import type { RouteObject } from 'react-router-dom'
import { ComingSoon } from '@/components/ComingSoon'

// Replace the placeholders with real pages. Paths are relative to /app.
export const invoiceRoutes: RouteObject[] = [
  { path: 'invoices', element: <ComingSoon title="Invoices" owner="Shubham" task="SK7" /> },
  { path: 'billing', element: <ComingSoon title="Run billing" owner="Shubham" task="SK5" /> },
]
