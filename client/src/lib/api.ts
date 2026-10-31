const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export type ApiFieldErrors = Record<string, string>

export class ApiError extends Error {
  status: number
  code: string
  fields?: ApiFieldErrors

  constructor(status: number, code: string, message: string, fields?: ApiFieldErrors) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export type ApiItem<T> = { data: T }
export type PageMeta = { page: number; limit: number; total: number }
export type ApiList<T> = { data: T[]; meta: PageMeta }

type Params = Record<string, string | number | boolean | null | undefined>

function buildUrl(path: string, params?: Params) {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  if (!params) return url
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value))
  }
  const query = qs.toString()
  return query ? `${url}?${query}` : url
}

async function request<T>(method: string, path: string, body?: unknown, params?: Params): Promise<T> {
  let res: Response
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection.')
  }

  if (res.status === 204) return undefined as T

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const err = json?.error
    throw new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN_ERROR',
      err?.message ?? `Request failed (${res.status})`,
      err?.fields,
    )
  }
  return json as T
}

export const api = {
  get: <T>(path: string, params?: Params) => request<T>('GET', path, undefined, params),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  delete: <T>(path: string) => request<T>('DELETE', path),
}

export function errorMessage(error: unknown, fallback = 'Something went wrong') {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}
