import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export function Brand({ to = '/', inverted, className }: { to?: string; inverted?: boolean; className?: string }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2 font-semibold', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">B</span>
      <span className={cn('text-lg tracking-tight', inverted ? 'text-white' : 'text-gray-900')}>
        Bill<span className={inverted ? 'text-primary-200' : 'text-primary-600'}>Cycle</span>
      </span>
    </Link>
  )
}
