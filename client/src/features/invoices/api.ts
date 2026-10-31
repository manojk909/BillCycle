import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiItem, type ApiList } from '@/lib/api'
import type { InvoicePrintData } from './print/types'

export type InvoiceState = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED'
export type InvoicePaymentStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED' | 'OUTSTANDING' | 'OVERDUE' | 'PARTIAL'

export type InvoiceRow = {
  id: number
  number: string | null
  state: InvoiceState
  status: InvoicePaymentStatus
  invoiceDate: string
  dueDate: string
  amountTotal: string
  amountPaid: string
  amountDue: string
  customer: { id: number; name: string }
  subscription: { id: number; number: string | null }
}

export type InvoiceLine = {
  id: number
  description: string
  quantity: number
  unitPrice: string
  discountAmount: string
  amountUntaxed: string
  amountTax: string
  amountTotal: string
  isPlanLine: boolean
  taxes: { id: number; name: string }[]
}

export type Invoice = {
  id: number
  number: string | null
  state: InvoiceState
  status: InvoicePaymentStatus
  periodStart: string
  periodEnd: string
  invoiceDate: string
  dueDate: string
  billingName: string
  billingEmail: string
  billingAddress: string | null
  amountUntaxed: string
  amountDiscount: string
  amountTax: string
  amountTotal: string
  amountPaid: string
  amountDue: string
  customer: { id: number; name: string; email: string }
  subscription: { id: number; number: string | null }
  lines: InvoiceLine[]
  allowedActions: string[]
}

export type ListParams = {
  page: number
  limit: number
  q?: string
  status?: string
  customerId?: number
  subscriptionId?: number
  from?: string
  to?: string
}

const keys = {
  all: ['invoices'] as const,
  list: (p: ListParams) => ['invoices', 'list', p] as const,
  detail: (id: number) => ['invoices', 'detail', id] as const,
  print: (id: number) => ['invoices', 'print', id] as const,
}

export function useInvoices(params: ListParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => api.get<ApiList<InvoiceRow>>('/invoices', params),
    placeholderData: (prev) => prev,
  })
}

export function useInvoice(id: number | null) {
  return useQuery({
    queryKey: keys.detail(id ?? 0),
    queryFn: () => api.get<ApiItem<Invoice>>(`/invoices/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useInvoicePrintData(id: number | null) {
  return useQuery({
    queryKey: keys.print(id ?? 0),
    queryFn: () => api.get<ApiItem<InvoicePrintData>>(`/invoices/${id}/print-data`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useInvoiceAction(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (action: 'confirm' | 'cancel' | 'send') => api.post<ApiItem<unknown>>(`/invoices/${id}/${action}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.detail(id) })
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}

export function useBulkConfirm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) =>
      api.post<ApiItem<{ confirmed: number }>>('/invoices/bulk-confirm', { ids }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}
