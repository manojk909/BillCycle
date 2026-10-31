import type { RouteObject } from 'react-router-dom'
import { PaymentsPage } from './pages/PaymentsPage'

// Paths are relative to /app.
export const paymentRoutes: RouteObject[] = [{ path: 'payments', element: <PaymentsPage /> }]
