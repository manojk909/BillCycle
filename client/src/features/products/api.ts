import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiItem, type ApiList } from '@/lib/api'
import type { TaxOption } from '@/features/taxes/api'

export type ProductType = 'SERVICE' | 'GOODS'

/** `costPrice` is only sent to admins. */
export type ProductRow = {
  id: number
  name: string
  type: ProductType
  salesPrice: string
  costPrice?: string
  notes: string | null
  isActive: boolean
  taxes: TaxOption[]
  taxIds: number[]
  variantCount: number
}

export type Variant = {
  id: number
  sku: string | null
  isDefault: boolean
  isActive: boolean
  label: string
  price: string
  values: { id: number; name: string; extraPrice: string; attributeId: number; attributeName: string }[]
  usageCount: number
}

export type Product = Omit<ProductRow, 'variantCount'> & { variants: Variant[]; warning?: string }

export type ProductInput = {
  name: string
  type: ProductType
  salesPrice: string
  costPrice?: string
  notes: string
  taxIds: number[]
}

export type VariantInput = { valueIds: number[]; sku: string }

/** What VariantPicker returns; SK3 / S6 copy price and taxIds onto their lines. */
export type VariantOption = { variantId: number; label: string; price: string; productId: number; taxIds: number[] }

export type ProductListParams = { page: number; limit: number; q?: string; type?: ProductType; isActive?: boolean }

const keys = {
  all: ['products'] as const,
  list: (p: ProductListParams) => ['products', 'list', p] as const,
  detail: (id: number) => ['products', 'detail', id] as const,
  variantOptions: (q: string) => ['products', 'variant-options', q] as const,
}

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => api.get<ApiList<ProductRow>>('/products', params),
    placeholderData: (prev) => prev,
  })
}

export function useProduct(id: number | null) {
  return useQuery({
    queryKey: keys.detail(id ?? 0),
    queryFn: () => api.get<ApiItem<Product>>(`/products/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

/** Active variants of active products, searchable. Used by VariantPicker (subscription and template lines). */
export function useVariantOptions(q: string) {
  return useQuery({
    queryKey: keys.variantOptions(q),
    queryFn: () => api.get<ApiItem<VariantOption[]>>('/products/variants/options', { q }).then((r) => r.data),
    placeholderData: (prev) => prev,
  })
}

function useInvalidateProducts() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: keys.all })
}

export function useSaveProduct(id: number | null) {
  const invalidate = useInvalidateProducts()
  return useMutation({
    mutationFn: (input: ProductInput) =>
      (id ? api.patch<ApiItem<Product>>(`/products/${id}`, input) : api.post<ApiItem<Product>>('/products', input)).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useSetProductActive() {
  const invalidate = useInvalidateProducts()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.post<ApiItem<Product>>(`/products/${id}/${isActive ? 'unarchive' : 'archive'}`).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useAddVariant(productId: number) {
  const invalidate = useInvalidateProducts()
  return useMutation({
    mutationFn: (input: VariantInput) => api.post<ApiItem<Product>>(`/products/${productId}/variants`, input).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useDeleteVariant(productId: number) {
  const invalidate = useInvalidateProducts()
  return useMutation({
    mutationFn: (variantId: number) => api.delete<void>(`/products/${productId}/variants/${variantId}`),
    onSuccess: invalidate,
  })
}
