import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'gray' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

const tones: Record<BadgeTone, string> = {
  gray: 'bg-gray-100 text-gray-700 ring-gray-200',
  primary: 'bg-primary-50 text-primary-700 ring-primary-200',
  success: 'bg-success-50 text-success-700 ring-success-600/20',
  warning: 'bg-warning-50 text-warning-700 ring-warning-600/20',
  danger: 'bg-danger-50 text-danger-700 ring-danger-600/20',
  info: 'bg-info-50 text-info-700 ring-info-600/20',
}

export function Badge({ tone = 'gray', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone], className)}>
      {children}
    </span>
  )
}

const STATE_TONES: Record<string, BadgeTone> = {
  DRAFT: 'gray',
  QUOTATION: 'info',
  CONFIRMED: 'primary',
  ACTIVE: 'success',
  PAUSED: 'warning',
  CLOSED: 'gray',
  PAID: 'success',
  CANCELLED: 'danger',
  OVERDUE: 'danger',
  PARTIAL: 'warning',
  OUTSTANDING: 'info',
}

// eslint-disable-next-line react-refresh/only-export-components
export function stateLabel(state: string) {
  return state.charAt(0) + state.slice(1).toLowerCase().replace(/_/g, ' ')
}

/** Coloured badge for any SubscriptionState / InvoiceState / payment status value. */
export function StateBadge({ state, className }: { state: string; className?: string }) {
  return (
    <Badge tone={STATE_TONES[state] ?? 'gray'} className={className}>
      {stateLabel(state)}
    </Badge>
  )
}
