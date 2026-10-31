import type { RouteObject } from 'react-router-dom'
import { SubscriptionsListPage } from './pages/SubscriptionsListPage'
import { SubscriptionFormPage } from './pages/SubscriptionFormPage'

// Paths are relative to /app.
export const subscriptionRoutes: RouteObject[] = [
  { path: 'subscriptions', element: <SubscriptionsListPage /> },
  { path: 'subscriptions/new', element: <SubscriptionFormPage /> },
  { path: 'subscriptions/:id', element: <SubscriptionFormPage /> },
]
