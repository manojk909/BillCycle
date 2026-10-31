import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui'
import { useAuth } from '../auth-context'
import { navForRole } from '../nav'
import { Brand } from './Brand'

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  if (!user) return null
  const sections = navForRole(user.role)

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-full">
      {open && <div className="fixed inset-0 z-30 bg-gray-900/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
          <Brand to="/app/dashboard" />
          <button type="button" className="rounded p-1 text-gray-500 hover:bg-gray-100 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section, i) => (
            <div key={section.title ?? i} className="mb-4">
              {section.title && <p className="mb-1 px-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">{section.title}</p>}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 lg:px-6">
          <button type="button" className="rounded p-1 text-gray-600 hover:bg-gray-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <Badge tone={user.role === 'ADMIN' ? 'primary' : 'info'}>{user.role === 'ADMIN' ? 'Admin' : 'Staff'}</Badge>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
