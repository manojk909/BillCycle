import type { RouteObject } from 'react-router-dom'
import { CustomersListPage } from './pages/CustomersListPage'
import { CustomerFormPage } from './pages/CustomerFormPage'

// Paths are relative to /app.
export const customerRoutes: RouteObject[] = [
  { path: 'customers', element: <CustomersListPage /> },
  { path: 'customers/new', element: <CustomerFormPage /> },
  { path: 'customers/:id', element: <CustomerFormPage /> },
]
