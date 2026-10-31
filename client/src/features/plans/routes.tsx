import type { RouteObject } from 'react-router-dom'
import { PlansListPage } from './pages/PlansListPage'
import { PlanFormPage } from './pages/PlanFormPage'

// Paths are relative to /app. Staff can view plans; only admins see edit actions.
export const planRoutes: RouteObject[] = [
  { path: 'plans', element: <PlansListPage /> },
  { path: 'plans/new', element: <PlanFormPage /> },
  { path: 'plans/:id', element: <PlanFormPage /> },
]
