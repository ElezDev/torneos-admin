import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'

export function OrganizerProtectedRoute() {
  const { user, tenant, portal, loading, isSuperAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando sesión…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (portal === 'admin' && isSuperAdmin && !tenant) {
    return <Navigate to="/admin" replace />
  }

  if (!isSuperAdmin && (user.tenants?.length ?? 0) === 0) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function AdminProtectedRoute() {
  const { user, loading, isSuperAdmin, portal } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando sesión…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  if (!isSuperAdmin || portal !== 'admin') {
    return <Navigate to="/app" replace />
  }

  return <Outlet />
}

export function OrganizerGuestRoute() {
  const { user, portal, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    )
  }

  if (user && portal !== 'admin') {
    return <Navigate to="/app" replace />
  }

  return <Outlet />
}

export function AdminGuestRoute() {
  const { user, portal, loading, isSuperAdmin } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    )
  }

  if (user && isSuperAdmin && portal === 'admin') {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}
