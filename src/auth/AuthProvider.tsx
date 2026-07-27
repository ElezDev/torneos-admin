import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiError, authApi, setTenantId, setToken, unwrapItem } from '@/api'
import type { Tenant, User } from '@/types/domain'

type AuthState = {
  user: User | null
  tenant: Tenant | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: {
    name: string
    email: string
    password: string
    passwordConfirmation: string
    tenantName: string
  }) => Promise<void>
  logout: () => Promise<void>
  switchTenant: (tenant: Tenant) => void
  refreshUser: () => Promise<User | null>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

function pickTenant(user: User, preferredId?: number | null, preferred?: Tenant | null): Tenant | null {
  if (preferred && user.tenants?.some((t) => t.id === preferred.id)) return preferred
  if (preferredId != null) {
    const found = user.tenants?.find((t) => t.id === preferredId)
    if (found) return found
  }
  const stored = localStorage.getItem('tenantId')
  if (stored) {
    const found = user.tenants?.find((t) => String(t.id) === stored)
    if (found) return found
  }
  return user.tenants?.[0] ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  const applyUser = useCallback((nextUser: User, preferred?: Tenant | null) => {
    const current = pickTenant(nextUser, preferred?.id ?? null, preferred)
    setUser(nextUser)
    setTenant(current)
    if (current) setTenantId(current.id)
    else setTenantId(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const me = unwrapItem(await authApi.me())
    applyUser(me, tenant)
    return me
  }, [applyUser, tenant])

  const hydrate = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const me = unwrapItem(await authApi.me())
      applyUser(me)
    } catch {
      setToken(null)
      setTenantId(null)
      setUser(null)
      setTenant(null)
    } finally {
      setLoading(false)
    }
  }, [applyUser])

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password })
    setToken(res.token)
    applyUser(res.user)
  }, [applyUser])

  const register = useCallback(
    async (payload: {
      name: string
      email: string
      password: string
      passwordConfirmation: string
      tenantName: string
    }) => {
      const res = await authApi.register(payload)
      setToken(res.token)
      applyUser(res.user, res.tenant ?? null)
    },
    [applyUser],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        // ignore
      }
    } finally {
      setToken(null)
      setTenantId(null)
      setUser(null)
      setTenant(null)
    }
  }, [])

  const switchTenant = useCallback((next: Tenant) => {
    setTenant(next)
    setTenantId(next.id)
  }, [])

  const hasPermission = useCallback(
    (permission: string) => Boolean(user?.permissions?.includes(permission)),
    [user],
  )

  const value = useMemo(
    () => ({
      user,
      tenant,
      loading,
      login,
      register,
      logout,
      switchTenant,
      refreshUser,
      hasPermission,
    }),
    [user, tenant, loading, login, register, logout, switchTenant, refreshUser, hasPermission],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
