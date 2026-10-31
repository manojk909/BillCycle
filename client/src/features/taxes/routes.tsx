import type { RouteObject } from 'react-router-dom'
import { TaxesPage } from './pages/TaxesPage'
import { PaymentTermsPage } from './pages/PaymentTermsPage'
import { PaymentMethodsPage } from './pages/PaymentMethodsPage'

// Paths are relative to /app. Staff can open these read-only; the pages hide edit actions for non-admins.
export const taxRoutes: RouteObject[] = [
  { path: 'config/taxes', element: <TaxesPage /> },
  { path: 'config/payment-terms', element: <PaymentTermsPage /> },
  { path: 'config/payment-methods', element: <PaymentMethodsPage /> },
]
