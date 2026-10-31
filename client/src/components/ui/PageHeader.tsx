import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export type Breadcrumb = { label: string; to?: string }

type PageHeaderProps = {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  breadcrumbs?: Breadcrumb[]
}

export function PageHeader({ title, subtitle, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-1 text-xs text-gray-500">
            {breadcrumbs.map((b, i) => (
              <span key={`${b.label}-${i}`} className="inline-flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                {b.to ? (
                  <Link to={b.to} className="hover:text-primary-600">
                    {b.label}
                  </Link>
                ) : (
                  <span>{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="truncate text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
