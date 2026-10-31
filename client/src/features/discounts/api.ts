import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiItem, type ApiList } from '@/lib/api'

export type DiscountType = 'PERCENT' | 'FIXED'
export type DiscountScope = 'PRODUCTS' | 'SUBSCRIPTION'
export type DiscountStatus = 'active' | 'scheduled' | 'expired' | 'exhausted' | 'inactive'

export type Discount = {
  id: number
  name: string
  code: string | null
  type: DiscountType
  value: string
  scope: DiscountScope
  minPurchaseAmount: string | null
  minQuantity: number | null
  startDate: string
  endDate: string
  usageLimit: number | null
  timesUsed: number
  isActive: boolean
  status: DiscountStatus
  products: { id: number; name: string }[]
  productIds: number[]
  customers: { id: number; name: string }[]
  customerIds: number[]
}

export type DiscountUsage = {
  id: number
  amount: string
  createdAt: string
  invoice: { id: number; number: string | null; state: string }
  subscription: { id: number; number: string | null }
}

export type DiscountDetail = Discount & { usages: DiscountUsage[] }

export type DiscountInput = {
  name: string
  code: string
  type: DiscountType
  value: string
  scope: DiscountScope
  productIds: number[]
  customerIds: number[]
  minPurchaseAmount: string
  minQuantity: string
  startDate: string
  endDate: string
  usageLimit: string
  isActive: boolean
}

export type DiscountListParams = { page: number; limit: number; q?: string; status?: DiscountStatus; sort?: string }

const keys = {
  all: ['discounts'] as const,
  list: (p: DiscountListParams) => ['discounts', 'list', p] as const,
  detail: (id: number) => ['discounts', 'detail', id] as const,
}

export function useDiscounts(params: DiscountListParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => api.get<ApiList<Discount>>('/discounts', params),
    placeholderData: (prev) => prev,
  })
}

export function useDiscount(id: number | null) {
  return useQuery({
    queryKey: keys.detail(id ?? 0),
    queryFn: () => api.get<ApiItem<DiscountDetail>>(`/discounts/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useSaveDiscount(id: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: DiscountInput) =>
      (id ? api.patch<ApiItem<DiscountDetail>>(`/discounts/${id}`, input) : api.post<ApiItem<DiscountDetail>>('/discounts', input)).then(
        (r) => r.data,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}

export function useDeactivateDiscount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post<ApiItem<DiscountDetail>>(`/discounts/${id}/deactivate`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}
