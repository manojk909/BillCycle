import type { RouteObject } from 'react-router-dom'
import { ComingSoon } from '@/components/ComingSoon'

// Replace the placeholders with real pages. Paths are relative to /app.
export const discountRoutes: RouteObject[] = [
  { path: 'discounts', element: <ComingSoon title="Discount rules" owner="Sandhya" task="S7" /> },
]
