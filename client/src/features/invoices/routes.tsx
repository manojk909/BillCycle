import type { RouteObject } from 'react-router-dom'
import { InvoicesListPage } from './pages/InvoicesListPage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import { InvoicePrintPage } from './pages/InvoicePrintPage'
import { BillingRunPage } from './pages/BillingRunPage'

// Paths are relative to /app.
export const invoiceRoutes: RouteObject[] = [
  { path: 'invoices', element: <InvoicesListPage /> },
  { path: 'invoices/:id', element: <InvoiceDetailPage /> },
  { path: 'invoices/:id/print', element: <InvoicePrintPage /> },
  { path: 'billing', element: <BillingRunPage /> },
]
