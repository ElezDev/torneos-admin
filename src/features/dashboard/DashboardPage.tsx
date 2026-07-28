import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { organizerApi } from '@/api'
import { useAuth } from '@/auth/AuthProvider'
import { EmptyState, PageHeader } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatLabels, getErrorMessage, statusLabels } from '@/lib/utils'
import type { Tournament } from '@/types/domain'

export function DashboardPage() {
  const { user, tenant } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!tenant?.id) {
        if (alive) {
          setTournaments([])
          setLoading(false)
        }
        return
      }
      try {
        const res = await organizerApi.tournaments.list()
        if (alive) setTournaments(res.data ?? [])
      } catch (err) {
        if (alive) {
          setTournaments([])
          toast.error(getErrorMessage(err, 'No se pudieron cargar los torneos'))
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [tenant?.id])

  const active = tournaments.filter((t) => t.status === 'active' || t.status === 'registration')

  return (
    <div>
      <PageHeader
        title={`Hola, ${user?.name?.split(' ')[0] ?? 'organizador'}`}
        description={`${tenant?.name ?? 'Sin inquilino'} · resumen del contexto activo.`}
        actions={
          <Button size="sm" asChild>
            <Link to="/app/tournaments">
              <Plus className="size-4" />
              Ver torneos
            </Link>
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat label="Torneos" value={loading ? '…' : String(tournaments.length)} />
        <Stat label="Activos" value={loading ? '…' : String(active.length)} />
        <Stat label="Rol" value={user?.roles?.[0] ?? '—'} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
          <CardTitle className="text-base">Últimos torneos</CardTitle>
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <Link to="/app/tournaments">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : tournaments.length === 0 ? (
            <EmptyState
              title="Sin torneos"
              description="Crea el primero desde Torneos."
              action={
                <Button size="sm" asChild>
                  <Link to="/app/tournaments">Ir a torneos</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y">
              {tournaments.slice(0, 6).map((tournament) => (
                <li key={tournament.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <Link
                      to={`/app/tournaments/${tournament.id}`}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {tournament.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatLabels[tournament.format]} · {tournament.sport?.name ?? 'Deporte'}
                    </p>
                  </div>
                  <Badge variant={tournament.status === 'active' ? 'default' : 'secondary'}>
                    {statusLabels[tournament.status]}
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
      <CardContent className="px-3 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
