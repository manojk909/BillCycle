import type { RouteObject } from 'react-router-dom'
import { ComingSoon } from '@/components/ComingSoon'
import { AttributesPage } from './pages/AttributesPage'

// Paths are relative to /app. Staff can view attributes; only admins see edit actions.
export const productRoutes: RouteObject[] = [
  { path: 'products', element: <ComingSoon title="Products" owner="Sandhya" task="S3" /> },
  { path: 'config/attributes', element: <AttributesPage /> },
]
