import { useQuery } from '@tanstack/react-query'
import { api, type ApiItem } from '@/lib/api'

export type ReportFilters = { from?: string; to?: string; planId?: number; customerId?: number }

export type Summary = {
  range: { from: string; to: string }
  activeSubscriptions: number
  pausedSubscriptions: number
  newSubscriptions: number
  closedSubscriptions: number
  mrr: string
  arr: string
  invoicedAmount: string
  collectedAmount: string
  paymentsCount: number
  outstandingAmount: string
  openInvoices: number
  overdueAmount: string
  overdueCount: number
}

export type TrendPoint = { month: string; invoiced: string; collected: string }

export type OverdueRow = {
  id: number
  number: string | null
  dueDate: string
  amountTotal: string
  amountDue: string
  daysOverdue: number
  customer: { id: number; name: string }
  subscription: { id: number; number: string | null }
}
export type Overdue = { rows: OverdueRow[]; buckets: { d1_30: string; d31_60: string; d61_90: string; d90_plus: string } }

export type PlanMrr = { planId: number; plan: string; billingPeriod: string; active: number; mrr: string }

// Dashboard numbers refresh every minute so the finance view stays live.
const live = { refetchInterval: 60_000, placeholderData: <T,>(prev: T | undefined) => prev }

export function useSummary(f: ReportFilters) {
  return useQuery({ queryKey: ['reports', 'summary', f], queryFn: () => api.get<ApiItem<Summary>>('/reports/summary', f).then((r) => r.data), ...live })
}

export function useRevenueTrend(f: ReportFilters, months = 6) {
  const params = { months, planId: f.planId, customerId: f.customerId }
  return useQuery({
    queryKey: ['reports', 'trend', params],
    queryFn: () => api.get<ApiItem<TrendPoint[]>>('/reports/revenue-trend', params).then((r) => r.data),
    ...live,
  })
}

export function useOverdue(f: ReportFilters, limit = 8) {
  const params = { limit, planId: f.planId, customerId: f.customerId }
  return useQuery({
    queryKey: ['reports', 'overdue', params],
    queryFn: () => api.get<ApiItem<Overdue>>('/reports/overdue', params).then((r) => r.data),
    ...live,
  })
}

export function usePlanMrr(customerId?: number) {
  return useQuery({
    queryKey: ['reports', 'by-plan', customerId],
    queryFn: () => api.get<ApiItem<PlanMrr[]>>('/reports/by-plan', { customerId }).then((r) => r.data),
    ...live,
  })
}
