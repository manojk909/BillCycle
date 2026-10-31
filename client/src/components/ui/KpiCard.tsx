import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'default' | 'success' | 'warning' | 'danger'

const valueTone: Record<Tone, string> = {
  default: 'text-gray-900',
  success: 'text-success-700',
  warning: 'text-warning-700',
  danger: 'text-danger-700',
}

type KpiCardProps = {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: Tone
  onClick?: () => void
}

export function KpiCard({ label, value, hint, icon, tone = 'default', onClick }: KpiCardProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full flex-col gap-1 rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm',
        onClick && 'transition-colors hover:border-primary-200 hover:bg-primary-50/40',
      )}
    >
      <div className="flex items-center justify-between text-xs font-medium tracking-wide text-gray-500 uppercase">
        <span>{label}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className={cn('text-2xl font-semibold', valueTone[tone])}>{value}</div>
      {hint && <div className="text-xs text-gray-500">{hint}</div>}
    </Tag>
  )
}
