import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { PortalLayout } from './layouts/PortalLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { GuestOnly, HomeRedirect, RequireAuth, RequireRole } from './guards'
import { NotFoundPage } from './NotFoundPage'
import { UiKitPage } from './UiKitPage'
import { authRoutes } from '@/features/auth/routes'
import { dashboardRoutes } from '@/features/dashboard/routes'
import { subscriptionRoutes } from '@/features/subscriptions/routes'
import { invoiceRoutes } from '@/features/invoices/routes'
import { paymentRoutes } from '@/features/payments/routes'
import { customerRoutes } from '@/features/customers/routes'
import { productRoutes } from '@/features/products/routes'
import { planRoutes } from '@/features/plans/routes'
import { taxRoutes } from '@/features/taxes/routes'
import { discountRoutes } from '@/features/discounts/routes'
import { templateRoutes } from '@/features/templates/routes'
import { userRoutes } from '@/features/users/routes'
import { portalRoutes } from '@/features/portal/routes'

// Feature owners add pages in features/<f>/routes.tsx; this file shouldn't need edits.
export const router = createBrowserRouter([
  { path: '/', element: <HomeRedirect /> },
  {
    element: (
      <GuestOnly>
        <AuthLayout />
      </GuestOnly>
    ),
    children: authRoutes,
  },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <RequireRole roles={['ADMIN', 'INTERNAL']}>
          <AppLayout />
        </RequireRole>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      ...dashboardRoutes,
      ...subscriptionRoutes,
      ...invoiceRoutes,
      ...paymentRoutes,
      ...customerRoutes,
      ...productRoutes,
      ...planRoutes,
      ...taxRoutes,
      ...discountRoutes,
      ...templateRoutes,
      ...userRoutes,
      { path: 'ui-kit', element: <UiKitPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/my',
    element: (
      <RequireAuth>
        <RequireRole roles={['PORTAL']}>
          <PortalLayout />
        </RequireRole>
      </RequireAuth>
    ),
    children: [{ index: true, element: <Navigate to="subscriptions" replace /> }, ...portalRoutes, { path: '*', element: <NotFoundPage /> }],
  },
  { path: '*', element: <NotFoundPage /> },
])
