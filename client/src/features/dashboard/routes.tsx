import type { RouteObject } from 'react-router-dom'
import { DashboardPage } from './pages/DashboardPage'

// Paths are relative to /app.
export const dashboardRoutes: RouteObject[] = [{ path: 'dashboard', element: <DashboardPage /> }]
