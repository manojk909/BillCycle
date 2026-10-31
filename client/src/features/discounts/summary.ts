import { formatDate, formatMoney } from '@/lib/format'
import type { BadgeTone } from '@/components/ui'
import type { DiscountScope, DiscountStatus, DiscountType } from './api'

export const STATUS_BADGE: Record<DiscountStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  expired: { label: 'Expired', tone: 'gray' },
  exhausted: { label: 'Used up', tone: 'warning' },
  inactive: { label: 'Inactive', tone: 'danger' },
}

export function formatDiscountValue(type: DiscountType, value: string) {
  return type === 'PERCENT' ? `${Number(value)}%` : formatMoney(value)
}

type SummaryInput = {
  type: DiscountType
  value: string
  scope: DiscountScope
  products: { name: string }[]
  customers: { name: string }[]
  minPurchaseAmount: string
  minQuantity: string
  startDate: string
  endDate: string
  usageLimit: string
}

/** "10% off subscriptions with at least 10 seats, valid 01 Nov 2026 – 30 Nov 2026, max 50 uses" */
export function discountSummary(d: SummaryInput) {
  if (!d.value || !Number.isFinite(Number(d.value))) return ''
  const target =
    d.scope === 'SUBSCRIPTION'
      ? 'subscriptions'
      : d.products.length
        ? d.products.map((p) => p.name).join(', ')
        : 'the selected products'
  const conditions = [
    d.minQuantity && `at least ${d.minQuantity} ${d.scope === 'SUBSCRIPTION' ? 'seats' : 'units'}`,
    d.minPurchaseAmount && `a purchase of at least ${formatMoney(d.minPurchaseAmount)}`,
  ].filter(Boolean)
  const parts = [`${formatDiscountValue(d.type, d.value)} off ${target}`]
  if (conditions.length) parts[0] += ` with ${conditions.join(' and ')}`
  if (d.customers.length) parts[0] += ` for ${d.customers.map((c) => c.name).join(', ')} only`
  if (d.startDate && d.endDate) parts.push(`valid ${formatDate(d.startDate)} – ${formatDate(d.endDate)}`)
  parts.push(d.usageLimit ? `max ${d.usageLimit} use${d.usageLimit === '1' ? '' : 's'}` : 'unlimited uses')
  return parts.join(', ')
}
