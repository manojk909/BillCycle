import type { RouteObject } from 'react-router-dom'
import { ComingSoon } from '@/components/ComingSoon'

// Replace the placeholders with real pages. Paths are relative to /app.
export const templateRoutes: RouteObject[] = [
  { path: 'templates', element: <ComingSoon title="Quotation templates" owner="Sandhya" task="S6" /> },
]
