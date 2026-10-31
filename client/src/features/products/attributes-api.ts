import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiItem, type ApiList } from '@/lib/api'

export type AttributeValue = { id: number; name: string; extraPrice: string; variantCount: number }
export type Attribute = { id: number; name: string; values: AttributeValue[] }

/** Rows without `id` are created; stored values missing from `values` are removed. */
export type AttributeInput = { name: string; values: { id?: number; name: string; extraPrice: string }[] }

/** Attributes with their values, for the variant editor. */
export type AttributeOption = { id: number; name: string; values: { id: number; name: string; extraPrice: string }[] }

export type AttributeListParams = { page: number; limit: number; q?: string }

const keys = {
  all: ['attributes'] as const,
  list: (p: AttributeListParams) => ['attributes', 'list', p] as const,
  options: ['attributes', 'options'] as const,
}

export function useAttributes(params: AttributeListParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => api.get<ApiList<Attribute>>('/attributes', params),
    placeholderData: (prev) => prev,
  })
}

export function useAttributeOptions() {
  return useQuery({
    queryKey: keys.options,
    queryFn: () => api.get<ApiItem<AttributeOption[]>>('/attributes/options').then((r) => r.data),
  })
}

export function useSaveAttribute(id: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AttributeInput) =>
      (id ? api.patch<ApiItem<Attribute>>(`/attributes/${id}`, input) : api.post<ApiItem<Attribute>>('/attributes', input)).then(
        (r) => r.data,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}

export function useDeleteAttribute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/attributes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}
