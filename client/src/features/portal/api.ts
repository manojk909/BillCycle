import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiItem, type ApiList } from '@/lib/api'

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'OVERDUE' | 'OUTSTANDING' | 'DRAFT' | 'CANCELLED'
type Plan = { name: string; billingPeriod: string; billingInterval: number }

export type PortalSummary = {
  activeSubscriptions: number
  openInvoices: number
  amountDue: string
  overdueInvoices: number
  overdueAmount: string
  nextInvoiceDate: string | null
}

export type MySubscriptionRow = {
  id: number
  number: string | null
  state: string
  quantity: number
  startDate: string
  expiryDate: string | null
  nextInvoiceDate: string | null
  amountTotal: string
  plan: Plan
}

export type MySubscription = Omit<MySubscriptionRow, 'plan'> & {
  quotationValidUntil: string | null
  closedAt: string | null
  closeReason: string | null
  amountUntaxed: string
  amountTax: string
  paymentTerm: { name: string }
  plan: Plan & { pausable: boolean; closable: boolean; renewable: boolean }
  lines: {
    id: number
    description: string
    isPlanLine: boolean
    isActive: boolean
    quantity: number
    unitPrice: string
    amountUntaxed: string
    amountTax: string
    amountTotal: string
    taxes: { name: string }[]
  }[]
  invoices: { id: number; number: string | null; invoiceDate: string; dueDate: string; amountTotal: string; amountDue: string; status: PaymentStatus }[]
}

export type MyInvoiceRow = {
  id: number
  number: string | null
  invoiceDate: string
  dueDate: string
  periodStart: string
  periodEnd: string
  amountTotal: string
  amountPaid: string
  amountDue: string
  status: PaymentStatus
  subscription: { number: string | null; plan: { name: string } }
}

export type MyInvoice = MyInvoiceRow & {
  billingName: string
  billingEmail: string
  billingAddress: string | null
  amountUntaxed: string
  amountDiscount: string
  amountTax: string
  lines: {
    id: number
    description: string
    quantity: number
    unitPrice: string
    discountAmount: string
    amountUntaxed: string
    amountTax: string
    amountTotal: string
    taxes: { name: string }[]
  }[]
  payments: { id: number; amount: string; date: string; method: { name: string } }[]
  subscription: { number: string | null; paymentTerm: { name: string }; plan: { name: string } }
}

export type Profile = {
  name: string
  loginEmail: string
  email: string
  phone: string | null
  companyName: string | null
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
}
export type ProfileInput = Partial<Omit<Profile, 'loginEmail' | 'email'>>

type Page = { page: number; limit: number }

export const usePortalSummary = () =>
  useQuery({ queryKey: ['portal', 'summary'], queryFn: () => api.get<ApiItem<PortalSummary>>('/portal/summary').then((r) => r.data) })

export const useMySubscriptions = (p: Page) =>
  useQuery({
    queryKey: ['portal', 'subscriptions', p],
    queryFn: () => api.get<ApiList<MySubscriptionRow>>('/portal/subscriptions', p),
    placeholderData: (prev) => prev,
  })

export const useMySubscription = (id: number) =>
  useQuery({
    queryKey: ['portal', 'subscription', id],
    queryFn: () => api.get<ApiItem<MySubscription>>(`/portal/subscriptions/${id}`).then((r) => r.data),
  })

export const useMyInvoices = (p: Page) =>
  useQuery({
    queryKey: ['portal', 'invoices', p],
    queryFn: () => api.get<ApiList<MyInvoiceRow>>('/portal/invoices', p),
    placeholderData: (prev) => prev,
  })

export const useMyInvoice = (id: number) =>
  useQuery({ queryKey: ['portal', 'invoice', id], queryFn: () => api.get<ApiItem<MyInvoice>>(`/portal/invoices/${id}`).then((r) => r.data) })

export const useProfile = () =>
  useQuery({ queryKey: ['portal', 'profile'], queryFn: () => api.get<ApiItem<Profile>>('/portal/profile').then((r) => r.data) })

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProfileInput) => api.patch<ApiItem<Profile>>('/portal/profile', input).then((r) => r.data),
    onSuccess: (data) => qc.setQueryData(['portal', 'profile'], data),
  })
}
