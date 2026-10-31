import type { RouteObject } from 'react-router-dom'
import { MySubscriptionsPage } from './pages/MySubscriptionsPage'
import { MySubscriptionPage } from './pages/MySubscriptionPage'
import { MyInvoicesPage } from './pages/MyInvoicesPage'
import { MyInvoicePage } from './pages/MyInvoicePage'
import { ProfilePage } from './pages/ProfilePage'

// Paths are relative to /my (customers only).
export const portalRoutes: RouteObject[] = [
  { path: 'subscriptions', element: <MySubscriptionsPage /> },
  { path: 'subscriptions/:id', element: <MySubscriptionPage /> },
  { path: 'invoices', element: <MyInvoicesPage /> },
  { path: 'invoices/:id', element: <MyInvoicePage /> },
  { path: 'profile', element: <ProfilePage /> },
]
