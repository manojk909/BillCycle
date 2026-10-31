import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiItem, type ApiList } from '@/lib/api'

export type SubscriptionState = 'DRAFT' | 'QUOTATION' | 'CONFIRMED' | 'ACTIVE' | 'PAUSED' | 'CLOSED'

export type SubscriptionRow = {
  id: number
  number: string | null
  state: SubscriptionState
  startDate: string
  expiryDate: string | null
  nextInvoiceDate: string | null
  amountTotal: string
  customer: { id: number; name: string }
  plan: { id: number; name: string }
}

export type SubscriptionLine = {
  id: number
  variantId: number | null
  isPlanLine: boolean
  isActive: boolean
  description: string
  quantity: number
  unitPrice: string
  amountUntaxed: string
  amountTax: string
  amountTotal: string
  taxes: { id: number; name: string }[]
}

export type Subscription = {
  id: number
  number: string | null
  state: SubscriptionState
  quantity: number
  startDate: string
  expiryDate: string | null
  quotationValidUntil: string | null
  nextInvoiceDate: string | null
  closeReason: string | null
  amountUntaxed: string
  amountTax: string
  amountTotal: string
  customer: { id: number; name: string; email: string }
  plan: { id: number; name: string; price: string; billingPeriod: string; billingInterval: number; minQuantity: number }
  paymentTerm: { id: number; name: string }
  lines: SubscriptionLine[]
  invoiceCount: number
  allowedActions: string[]
}

export type ActivityEntry = {
  id: number
  action: string
  message: string
  createdAt: string
  user: { id: number; name: string } | null
}

export type ListParams = {
  page: number
  limit: number
  q?: string
  state?: SubscriptionState
  planId?: number
  customerId?: number
  sort?: string
}

const keys = {
  all: ['subscriptions'] as const,
  list: (p: ListParams) => ['subscriptions', 'list', p] as const,
  detail: (id: number) => ['subscriptions', 'detail', id] as const,
  activity: (id: number) => ['subscriptions', 'activity', id] as const,
}

export function useSubscriptions(params: ListParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => api.get<ApiList<SubscriptionRow>>('/subscriptions', params),
    placeholderData: (prev) => prev,
  })
}

export function useSubscription(id: number | null) {
  return useQuery({
    queryKey: keys.detail(id ?? 0),
    queryFn: () => api.get<ApiItem<Subscription>>(`/subscriptions/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useSubscriptionActivity(id: number | null) {
  return useQuery({
    queryKey: keys.activity(id ?? 0),
    queryFn: () => api.get<ApiItem<ActivityEntry[]>>(`/subscriptions/${id}/activity`).then((r) => r.data),
    enabled: !!id,
  })
}

export type CreateSubscriptionInput = {
  customerId: number
  planId: number
  quantity: number
  startDate: string
  expiryDate?: string
  paymentTermId: number
  lines: { variantId: number; quantity: number; unitPrice?: string; taxIds?: number[]; description?: string }[]
}

export function useCreateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSubscriptionInput) =>
      api.post<ApiItem<Subscription>>('/subscriptions', input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}

export type UpdateSubscriptionInput = {
  quantity?: number
  startDate?: string
  expiryDate?: string | null
  paymentTermId?: number
  lines?: {
    id?: number
    variantId?: number
    quantity?: number
    unitPrice?: string
    taxIds?: number[]
    description?: string
    isActive?: boolean
  }[]
}

export function useUpdateSubscription(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateSubscriptionInput) =>
      api.patch<ApiItem<Subscription>>(`/subscriptions/${id}`, input).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.detail(id) })
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}

export function useSubscriptionAction(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ action, reason }: { action: string; reason?: string }) =>
      api.post<ApiItem<unknown>>(`/subscriptions/${id}/${action}`, reason ? { reason } : {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.detail(id) })
      qc.invalidateQueries({ queryKey: keys.activity(id) })
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}

export function useGenerateInvoice(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<ApiItem<{ status: string; invoiceId?: number }>>(`/subscriptions/${id}/invoices`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.detail(id) }),
  })
}

// Plan + payment-term options. These endpoints are owned by S5/S4; if they are not
// merged yet the pickers degrade gracefully to an empty list.
export type PlanOption = {
  id: number
  name: string
  price: string
  billingPeriod: string
  billingInterval: number
  minQuantity: number
}

export function usePlanOptions() {
  return useQuery({
    queryKey: ['plans', 'options'],
    queryFn: async () => {
      try {
        const r = await api.get<ApiList<PlanOption> | ApiItem<PlanOption[]>>('/plans', { limit: 100 })
        return Array.isArray((r as ApiItem<PlanOption[]>).data)
          ? (r as ApiItem<PlanOption[]>).data
          : (r as ApiList<PlanOption>).data
      } catch {
        return [] as PlanOption[]
      }
    },
  })
}

export type PaymentTermOption = { id: number; name: string; dueDays: number }

export function usePaymentTermOptions() {
  return useQuery({
    queryKey: ['payment-terms', 'options'],
    queryFn: async () => {
      try {
        const r = await api.get<ApiList<PaymentTermOption> | ApiItem<PaymentTermOption[]>>('/payment-terms', { limit: 100 })
        return Array.isArray((r as ApiItem<PaymentTermOption[]>).data)
          ? (r as ApiItem<PaymentTermOption[]>).data
          : (r as ApiList<PaymentTermOption>).data
      } catch {
        return [] as PaymentTermOption[]
      }
    },
  })
}
