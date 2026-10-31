import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiItem, type ApiList } from '@/lib/api'

export type Payment = {
  id: number
  amount: string
  date: string
  note: string | null
  createdAt: string
  method: { id: number; name: string }
  recordedBy: { id: number; name: string } | null
  invoice: { id: number; number: string | null; customer: { id: number; name: string } }
}

export type PaymentMethod = { id: number; name: string }

export type PaymentListParams = { page: number; limit: number; q?: string; from?: string; to?: string; methodId?: number }
export type PaymentList = ApiList<Payment> & { summary: { totalAmount: string } }

export type RegisterPaymentInput = { methodId: number; amount: string; date: string; note?: string }
export type RegisterPaymentResult = {
  payment: Payment
  invoice: { id: number; state: 'CONFIRMED' | 'PAID'; amountPaid: string; amountDue: string }
}

export function usePayments(params: PaymentListParams) {
  return useQuery({
    queryKey: ['payments', 'list', params],
    queryFn: () => api.get<PaymentList>('/payments', params),
    placeholderData: (prev) => prev,
  })
}

export function useInvoicePayments(invoiceId: number) {
  return useQuery({
    queryKey: ['payments', 'invoice', invoiceId],
    queryFn: () => api.get<ApiItem<Payment[]>>(`/invoices/${invoiceId}/payments`).then((r) => r.data),
  })
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payments', 'methods'],
    queryFn: () => api.get<ApiItem<PaymentMethod[]>>('/payments/methods').then((r) => r.data),
    staleTime: 5 * 60_000,
  })
}

/** Invalidates payments, invoices and reports so balances refresh everywhere. */
function useInvalidateMoney() {
  const qc = useQueryClient()
  return () =>
    Promise.all(['payments', 'invoices', 'reports', 'customers'].map((key) => qc.invalidateQueries({ queryKey: [key] })))
}

export function useRegisterPayment(invoiceId: number) {
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: (input: RegisterPaymentInput) =>
      api.post<ApiItem<RegisterPaymentResult>>(`/invoices/${invoiceId}/payments`, input).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useDeletePayment() {
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/payments/${id}`),
    onSuccess: invalidate,
  })
}
