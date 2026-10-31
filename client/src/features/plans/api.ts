import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiItem, type ApiList } from '@/lib/api'
import type { TaxOption } from '@/features/taxes/api'

export type BillingPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export type Plan = {
  id: number
  name: string
  price: string
  billingPeriod: BillingPeriod
  billingInterval: number
  minQuantity: number
  startDate: string | null
  endDate: string | null
  autoClose: boolean
  closable: boolean
  pausable: boolean
  renewable: boolean
  isActive: boolean
  taxes: TaxOption[]
  taxIds: number[]
  activeSubscriptions: number
}

export type PlanInput = Omit<Plan, 'id' | 'taxes' | 'activeSubscriptions'>

/** Used by the subscription and quotation template forms. */
export type PlanOption = Pick<Plan, 'id' | 'name' | 'price' | 'billingPeriod' | 'billingInterval' | 'minQuantity' | 'taxes' | 'taxIds'>

export type PlanListParams = {
  page: number
  limit: number
  q?: string
  billingPeriod?: BillingPeriod
  availableOn?: string
  active?: boolean
}

const keys = {
  all: ['plans'] as const,
  list: (p: PlanListParams) => ['plans', 'list', p] as const,
  detail: (id: number) => ['plans', 'detail', id] as const,
  options: (availableOn?: string) => ['plans', 'options', availableOn ?? ''] as const,
}

export function usePlans(params: PlanListParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => api.get<ApiList<Plan>>('/plans', params),
    placeholderData: (prev) => prev,
  })
}

export function usePlan(id: number | null) {
  return useQuery({
    queryKey: keys.detail(id ?? 0),
    queryFn: () => api.get<ApiItem<Plan>>(`/plans/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

/** Active plans for pickers; pass a yyyy-mm-dd date to hide plans not available on it. */
export function usePlanOptions(availableOn?: string) {
  return useQuery({
    queryKey: keys.options(availableOn),
    queryFn: () => api.get<ApiItem<PlanOption[]>>('/plans/options', { availableOn }).then((r) => r.data),
  })
}

export function useSavePlan(id: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<PlanInput>) =>
      (id ? api.patch<ApiItem<Plan>>(`/plans/${id}`, input) : api.post<ApiItem<Plan>>('/plans', input)).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}

export function useDeletePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/plans/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}
