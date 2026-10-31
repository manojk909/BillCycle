import type { RouteObject } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'

// Public routes, rendered inside AuthLayout.
export const authRoutes: RouteObject[] = [
  { path: 'login', element: <LoginPage /> },
  { path: 'signup', element: <SignupPage /> },
  { path: 'forgot-password', element: <ForgotPasswordPage /> },
  { path: 'reset-password/:token', element: <ResetPasswordPage /> },
]
