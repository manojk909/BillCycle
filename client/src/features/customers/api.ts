import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiItem, type ApiList } from '@/lib/api'

export type CustomerRow = {
  id: number
  name: string
  email: string
  phone: string | null
  companyName: string | null
  city: string | null
  hasPortalAccess: boolean
  subscriptionCount: number
}

export type Customer = {
  id: number
  name: string
  email: string
  phone: string | null
  companyName: string | null
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  taxId: string | null
  portalUser: { id: number; email: string; isActive: boolean } | null
  stats: { activeSubscriptions: number; openInvoices: number; outstandingAmount: string }
}

export type CustomerOption = { id: number; name: string; email: string; companyName: string | null }

export type CustomerInput = Omit<Customer, 'id' | 'portalUser' | 'stats'>

export type CustomerListParams = { page: number; limit: number; q?: string; sort?: string }

const keys = {
  all: ['customers'] as const,
  list: (p: CustomerListParams) => ['customers', 'list', p] as const,
  detail: (id: number) => ['customers', 'detail', id] as const,
  options: (q: string) => ['customers', 'options', q] as const,
}

export function useCustomers(params: CustomerListParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => api.get<ApiList<CustomerRow>>('/customers', params),
    placeholderData: (prev) => prev,
  })
}

export function useCustomer(id: number | null) {
  return useQuery({
    queryKey: keys.detail(id ?? 0),
    queryFn: () => api.get<ApiItem<Customer>>(`/customers/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

/** Search for pickers (max 20 results). Used by the subscription form. */
export function useCustomerOptions(q: string) {
  return useQuery({
    queryKey: keys.options(q),
    queryFn: () => api.get<ApiItem<CustomerOption[]>>('/customers/options', { q }).then((r) => r.data),
    placeholderData: (prev) => prev,
  })
}

export function useSaveCustomer(id: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CustomerInput) =>
      (id ? api.patch<ApiItem<Customer>>(`/customers/${id}`, input) : api.post<ApiItem<Customer>>('/customers', input)).then(
        (r) => r.data,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}
