import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ApiItem, type ApiList } from '@/lib/api'
import type { Role } from '@/app/auth-context'

export type UserRow = {
  id: number
  name: string
  email: string
  role: Role
  isActive: boolean
  customerId: number | null
  createdAt: string
  createdBy: { id: number; name: string } | null
}

export type UserListParams = { page: number; limit: number; q?: string; role?: Role }
export type CreateUserInput = { name: string; email: string; role: 'ADMIN' | 'INTERNAL'; password: string }
export type UpdateUserInput = Partial<{ name: string; role: 'ADMIN' | 'INTERNAL'; isActive: boolean }>

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => api.get<ApiList<UserRow>>('/users', params),
    placeholderData: (prev) => prev,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.post<ApiItem<UserRow>>('/users', input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateUserInput & { id: number }) =>
      api.patch<ApiItem<UserRow>>(`/users/${id}`, input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
