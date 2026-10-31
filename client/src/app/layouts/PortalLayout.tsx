import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '../auth-context'
import { portalNav } from '../nav'
import { Brand } from './Brand'

export function PortalLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Brand to="/my/subscriptions" />
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-gray-600 sm:inline">{user?.name}</span>
            <button type="button" onClick={handleLogout} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-gray-600 hover:bg-gray-100">
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
          {portalNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  '-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap',
                  isActive ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-800',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
