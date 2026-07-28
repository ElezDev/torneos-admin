import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { adminApi } from '@/api'
import { PageHeader } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getErrorMessage } from '@/lib/utils'
import type { Tenant } from '@/types/domain'

type Overview = {
  summary: {
    tenantsCount: number
    activeTenants: number
    tournamentsCount: number
    usersCount: number
  }
  tenants: Tenant[]
}

export function AdminDashboardPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await adminApi.overview()
        if (alive) setData(res.data)
      } catch (err) {
        if (alive) toast.error(getErrorMessage(err))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const summary = data?.summary

  return (
    <div>
      <PageHeader
        title="Plataforma Matchday"
        description="Vista global de organizaciones, torneos y usuarios."
      />

      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat label="Organizaciones" value={loading ? '…' : String(summary?.tenantsCount ?? 0)} />
        <Stat label="Activas" value={loading ? '…' : String(summary?.activeTenants ?? 0)} />
        <Stat label="Torneos" value={loading ? '…' : String(summary?.tournamentsCount ?? 0)} />
        <Stat label="Usuarios" value={loading ? '…' : String(summary?.usersCount ?? 0)} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
          <CardTitle className="text-base">Organizaciones recientes</CardTitle>
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <Link to="/admin/tenants">Ver todas</Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <ul className="divide-y">
              {(data?.tenants ?? []).slice(0, 8).map((tenant) => (
                <li key={tenant.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tenant.tournamentsCount ?? 0} torneos · {tenant.usersCount ?? 0} usuarios
                      </p>
                    </div>
                  </div>
                  <Badge variant={tenant.isActive ? 'default' : 'destructive'}>
                    {tenant.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="py-0">
      <CardContent className="px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
