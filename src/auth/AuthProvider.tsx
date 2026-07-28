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

export type Portal = 'organizer' | 'admin'

type AuthState = {
  user: User | null
  tenant: Tenant | null
  portal: Portal | null
  loading: boolean
  isSuperAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  loginAdmin: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  switchTenant: (tenant: Tenant) => void
  enterOrganizerPortal: (tenant: Tenant) => void
  refreshUser: () => Promise<User | null>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

function isSuperAdminUser(user: User | null): boolean {
  return Boolean(user?.roles?.includes('super-admin'))
}

function readPortal(): Portal | null {
  const value = localStorage.getItem('portal')
  return value === 'admin' || value === 'organizer' ? value : null
}

function writePortal(portal: Portal | null) {
  if (portal) localStorage.setItem('portal', portal)
  else localStorage.removeItem('portal')
}

function readStoredTenant(): Tenant | null {
  const raw = localStorage.getItem('activeTenant')
  if (!raw) return null
  try {
    return JSON.parse(raw) as Tenant
  } catch {
    return null
  }
}

function persistTenant(tenant: Tenant | null) {
  if (tenant) localStorage.setItem('activeTenant', JSON.stringify(tenant))
  else localStorage.removeItem('activeTenant')
}

function pickOrganizerTenant(user: User, preferred?: Tenant | null): Tenant | null {
  if (preferred) return preferred
  const stored = localStorage.getItem('tenantId')
  if (stored) {
    const found = user.tenants?.find((t) => String(t.id) === stored)
    if (found) return found
  }
  return user.tenants?.[0] ?? null
}

function resolveTenant(user: User, portal: Portal | null, preferred?: Tenant | null): Tenant | null {
  if (portal === 'admin') return null
  if (isSuperAdminUser(user)) {
    return preferred ?? readStoredTenant()
  }
  return pickOrganizerTenant(user, preferred)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [portal, setPortal] = useState<Portal | null>(readPortal())
  const [loading, setLoading] = useState(true)

  const applySession = useCallback(
    (nextUser: User, nextPortal: Portal | null, preferredTenant?: Tenant | null) => {
      const currentTenant = resolveTenant(nextUser, nextPortal, preferredTenant ?? null)
      setUser(nextUser)
      setPortal(nextPortal)
      setTenant(currentTenant)
      writePortal(nextPortal)
      if (currentTenant) {
        setTenantId(currentTenant.id)
        persistTenant(currentTenant)
        localStorage.setItem('lastOrgSlug', currentTenant.slug)
      } else {
        setTenantId(null)
        persistTenant(null)
      }
    },
    [],
  )

  const refreshUser = useCallback(async () => {
    const me = unwrapItem(await authApi.me())
    applySession(me, portal, tenant)
    return me
  }, [applySession, portal, tenant])

  const hydrate = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const me = unwrapItem(await authApi.me())
      applySession(me, readPortal())
    } catch {
      setToken(null)
      setTenantId(null)
      setUser(null)
      setTenant(null)
      setPortal(null)
      writePortal(null)
      persistTenant(null)
    } finally {
      setLoading(false)
    }
  }, [applySession])

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login({ email, password })
      if (isSuperAdminUser(res.user) && (res.user.tenants?.length ?? 0) === 0) {
        throw new Error('Esta cuenta es de plataforma. Usa /admin/login.')
      }
      setToken(res.token)
      applySession(res.user, 'organizer', res.user.tenants?.[0] ?? null)
    },
    [applySession],
  )

  const loginAdmin = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login({ email, password })
      if (!isSuperAdminUser(res.user)) {
        throw new Error('No tienes acceso al panel de plataforma.')
      }
      setToken(res.token)
      applySession(res.user, 'admin', null)
    },
    [applySession],
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
      setPortal(null)
      writePortal(null)
      persistTenant(null)
    }
  }, [])

  const switchTenant = useCallback((next: Tenant) => {
    setTenant(next)
    setTenantId(next.id)
    persistTenant(next)
    localStorage.setItem('lastOrgSlug', next.slug)
  }, [])

  const enterOrganizerPortal = useCallback((next: Tenant) => {
    setPortal('organizer')
    writePortal('organizer')
    switchTenant(next)
  }, [switchTenant])

  const hasPermission = useCallback(
    (permission: string) => Boolean(user?.permissions?.includes(permission)),
    [user],
  )

  const isSuperAdmin = isSuperAdminUser(user)

  const value = useMemo(
    () => ({
      user,
      tenant,
      portal,
      loading,
      isSuperAdmin,
      login,
      loginAdmin,
      logout,
      switchTenant,
      enterOrganizerPortal,
      refreshUser,
      hasPermission,
    }),
    [
      user,
      tenant,
      portal,
      loading,
      isSuperAdmin,
      login,
      loginAdmin,
      logout,
      switchTenant,
      enterOrganizerPortal,
      refreshUser,
      hasPermission,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
