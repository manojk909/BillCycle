import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiItem, type ApiList } from '@/lib/api'

export type TaxType = 'PERCENT' | 'FIXED'

export type Tax = { id: number; name: string; type: TaxType; rate: string; isActive: boolean; usageCount: number }
export type TaxInput = { name: string; type: TaxType; rate: string; isActive?: boolean }
export type TaxOption = { id: number; name: string; type: TaxType; rate: string }

export type PaymentTerm = { id: number; name: string; dueDays: number; usageCount: number }
export type PaymentTermInput = { name: string; dueDays: number }
export type PaymentTermOption = { id: number; name: string; dueDays: number }

export type PaymentMethod = { id: number; name: string; isActive: boolean; usageCount: number }
export type PaymentMethodInput = { name: string; isActive?: boolean }

export type ConfigListParams = { page: number; limit: number; q?: string; active?: boolean }

/** The three config resources share the same REST shape, so one factory builds their hooks. */
function configResource<Row, Input, Option>(path: string) {
  const key = [path] as const
  return {
    useList: (params: ConfigListParams) =>
      useQuery({
        queryKey: [path, 'list', params],
        queryFn: () => api.get<ApiList<Row>>(`/${path}`, params),
        placeholderData: (prev) => prev,
      }),
    useOptions: () =>
      useQuery({
        queryKey: [path, 'options'],
        queryFn: () => api.get<ApiItem<Option[]>>(`/${path}/options`).then((r) => r.data),
        staleTime: 5 * 60_000,
      }),
    useSave: (id: number | null) => {
      const qc = useQueryClient()
      return useMutation({
        mutationFn: (input: Partial<Input>) =>
          (id ? api.patch<ApiItem<Row>>(`/${path}/${id}`, input) : api.post<ApiItem<Row>>(`/${path}`, input)).then((r) => r.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: key }),
      })
    },
    useDelete: () => {
      const qc = useQueryClient()
      return useMutation({
        mutationFn: (id: number) => api.delete<void>(`/${path}/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: key }),
      })
    },
  }
}

export const taxes = configResource<Tax, TaxInput, TaxOption>('taxes')
export const paymentTerms = configResource<PaymentTerm, PaymentTermInput, PaymentTermOption>('payment-terms')
export const paymentMethods = configResource<PaymentMethod, PaymentMethodInput, { id: number; name: string }>('payment-methods')

/** Tax charged on `base` for one unit, for the form preview only (the server does the real math). */
export function previewTax(type: TaxType, rate: string, base = 1000) {
  const r = Number(rate)
  if (!Number.isFinite(r) || r < 0) return null
  return type === 'PERCENT' ? (base * r) / 100 : r
}
