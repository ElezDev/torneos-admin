// Low-level HTTP client. Prefer imports from `@/api`.

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

type ApiOptions = RequestInit & {
  tenantId?: number | string | null
  skipAuth?: boolean
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown) {
    super(
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message: string }).message)
        : `API error ${status}`,
    )
    this.status = status
    this.body = body
  }
}

export function getToken(): string | null {
  return localStorage.getItem('token')
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('token', token)
  else localStorage.removeItem('token')
}

export function setTenantId(tenantId: number | string | null) {
  if (tenantId != null) localStorage.setItem('tenantId', String(tenantId))
  else localStorage.removeItem('tenantId')
}

export function getTenantId(): string | null {
  return localStorage.getItem('tenantId')
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {})
  headers.set('Accept', 'application/json')

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (!options.skipAuth) {
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const tenantId = options.tenantId ?? getTenantId()
  if (tenantId != null) headers.set('X-Tenant-Id', String(tenantId))

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(response.status, body)
  }

  return body as T
}
