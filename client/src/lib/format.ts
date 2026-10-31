export function formatMoney(value: string | number | null | undefined, currency = 'INR') {
  const amount = typeof value === 'string' ? Number(value) : (value ?? 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function formatDate(iso: string | Date | null | undefined) {
  if (!iso) return '—'
  const date = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
}

/** yyyy-mm-dd for <input type="date"> */
export function toDateInput(iso: string | Date | null | undefined) {
  if (!iso) return ''
  const date = typeof iso === 'string' ? new Date(iso) : iso
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

const PERIOD_LABEL: Record<string, string> = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' }

export function formatPeriod(period: string, interval = 1) {
  const unit = PERIOD_LABEL[period] ?? period.toLowerCase()
  return interval > 1 ? `${interval} ${unit}s` : unit
}
