import type { RouteObject } from 'react-router-dom'
import { DiscountsListPage } from './pages/DiscountsListPage'
import { DiscountFormPage } from './pages/DiscountFormPage'

// Paths are relative to /app. Staff can read rules; only admins see edit actions (the API enforces it too).
export const discountRoutes: RouteObject[] = [
  { path: 'discounts', element: <DiscountsListPage /> },
  { path: 'discounts/new', element: <DiscountFormPage /> },
  { path: 'discounts/:id', element: <DiscountFormPage /> },
]
