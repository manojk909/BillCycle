import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiItem, type ApiList } from '@/lib/api'
import type { BillingPeriod } from '@/features/plans/api'

export type TemplatePlan = {
  id: number
  name: string
  price: string
  billingPeriod: BillingPeriod
  billingInterval: number
  minQuantity: number
  isActive: boolean
}

export type TemplateRow = {
  id: number
  name: string
  validityDays: number
  notes: string | null
  plan: TemplatePlan
  lineCount: number
  subscriptionCount: number
}

/** Line fields mirror VariantOption (variantId, label, price, productId, taxIds) so VariantPicker can show them. */
export type TemplateLine = {
  id: number
  variantId: number
  label: string
  price: string
  productId: number
  taxIds: number[]
  quantity: number
  description: string | null
  available: boolean
}

export type Template = {
  id: number
  name: string
  validityDays: number
  notes: string | null
  planId: number
  plan: TemplatePlan
  lines: TemplateLine[]
}

export type TemplateInput = {
  name: string
  validityDays: number
  planId: number
  notes: string
  lines: { variantId: number; quantity: number; description: string }[]
}

export type TemplateOption = { id: number; name: string; validityDays: number; planId: number; plan: { name: string } }

export type TemplateListParams = { page: number; limit: number; q?: string }

const keys = {
  all: ['templates'] as const,
  list: (p: TemplateListParams) => ['templates', 'list', p] as const,
  detail: (id: number) => ['templates', 'detail', id] as const,
  options: ['templates', 'options'] as const,
}

export function useTemplates(params: TemplateListParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => api.get<ApiList<TemplateRow>>('/quotation-templates', params),
    placeholderData: (prev) => prev,
  })
}

export function useTemplate(id: number | null) {
  return useQuery({
    queryKey: keys.detail(id ?? 0),
    queryFn: () => api.get<ApiItem<Template>>(`/quotation-templates/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

/** For a "start from template" select on the subscription form. */
export function useTemplateOptions() {
  return useQuery({
    queryKey: keys.options,
    queryFn: () => api.get<ApiItem<TemplateOption[]>>('/quotation-templates/options').then((r) => r.data),
  })
}

export function useSaveTemplate(id: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TemplateInput) =>
      (id
        ? api.patch<ApiItem<Template>>(`/quotation-templates/${id}`, input)
        : api.post<ApiItem<Template>>('/quotation-templates', input)
      ).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/quotation-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}
