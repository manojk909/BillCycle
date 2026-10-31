import { Outlet } from 'react-router-dom'
import { Brand } from './Brand'

export function AuthLayout() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-br from-primary-50 via-white to-gray-50 px-4 py-10">
      <div className="mb-6 text-center">
        <Brand to="/login" className="justify-center" />
        <p className="mt-2 text-sm text-gray-500">Plans, subscriptions and recurring billing in one place</p>
      </div>
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <Outlet />
      </div>
    </div>
  )
}
