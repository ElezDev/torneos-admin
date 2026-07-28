import { useEffect, useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError, organizerApi } from '@/api'
import { useAuth } from '@/auth/AuthProvider'
import { DataTable } from '@/components/DataTable'
import { FormDialog } from '@/components/FormDialog'
import { SearchableSelect } from '@/components/SearchableSelect'
import { Field, PageHeader } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDateTime, getErrorMessage, statusLabels } from '@/lib/utils'
import type { GameMatch, Team, Tournament, Venue } from '@/types/domain'

export function MatchesPage() {
  const { tenant } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [tournamentId, setTournamentId] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [matches, setMatches] = useState<GameMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    homeTeamId: '',
    awayTeamId: '',
    venueId: 'none',
    matchday: '1',
    scheduledAt: '',
  })

  const tournamentOptions = useMemo(
    () => tournaments.map((tournament) => ({ value: String(tournament.id), label: tournament.name })),
    [tournaments],
  )

  useEffect(() => {
    if (!tenant?.id) return
    setLoading(true)
    void Promise.all([organizerApi.tournaments.list(), organizerApi.venues.list()])
      .then(([t, v]) => {
        setTournaments(t.data)
        setVenues(v.data)
        if (t.data[0]) setTournamentId(String(t.data[0].id))
      })
      .catch((err) => toast.error(getErrorMessage(err, 'Error al cargar partidos')))
      .finally(() => setLoading(false))
  }, [tenant?.id])

  useEffect(() => {
    if (!tournamentId) return
    setLoading(true)
    void Promise.all([
      organizerApi.teams.list(tournamentId),
      organizerApi.matches.list(tournamentId),
    ])
      .then(([teamList, matchList]) => {
        setTeams(teamList.data)
        setMatches(matchList.data)
        setForm((f) => ({
          ...f,
          homeTeamId: teamList.data[0] ? String(teamList.data[0].id) : '',
          awayTeamId: teamList.data[1] ? String(teamList.data[1].id) : '',
        }))
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [tournamentId])

  const canCreate = useMemo(
    () => teams.length >= 2 && Boolean(tournamentId),
    [teams.length, tournamentId],
  )

  async function onCreate() {
    if (!canCreate) return
    setBusy(true)
    try {
      await organizerApi.matches.create({
        tournamentId: Number(tournamentId),
        homeTeamId: Number(form.homeTeamId),
        awayTeamId: Number(form.awayTeamId),
        venueId: form.venueId !== 'none' ? Number(form.venueId) : null,
        matchday: form.matchday ? Number(form.matchday) : null,
        scheduledAt: form.scheduledAt || null,
      })
      toast.success('Partido programado')
      setOpen(false)
      const res = await organizerApi.matches.list(tournamentId)
      setMatches(res.data)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const columns = useMemo<ColumnDef<GameMatch>[]>(
    () => [
      {
        id: 'encuentro',
        header: 'Encuentro',
        accessorFn: (row) =>
          `${row.homeTeam?.name ?? 'Local'} vs ${row.awayTeam?.name ?? 'Visitante'}`,
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.homeTeam?.name ?? 'Local'} vs {row.original.awayTeam?.name ?? 'Visitante'}
          </span>
        ),
      },
      {
        id: 'fecha',
        header: 'Fecha',
        accessorFn: (row) => row.scheduledAt ?? '',
        cell: ({ row }) => formatDateTime(row.original.scheduledAt),
      },
      {
        id: 'sede',
        header: 'Sede',
        accessorFn: (row) => row.venue?.name ?? '',
        cell: ({ row }) => row.original.venue?.name ?? '—',
      },
      {
        accessorKey: 'matchday',
        header: 'Jornada',
        cell: ({ row }) => row.original.matchday ?? '—',
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => (
          <Badge variant={row.original.status === 'finished' ? 'default' : 'secondary'}>
            {statusLabels[row.original.status]}
          </Badge>
        ),
      },
    ],
    [],
  )

  return (
    <div>
      <PageHeader
        title="Partidos"
        description="Fixture del inquilino activo."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <SearchableSelect
              value={tournamentId || undefined}
              onValueChange={setTournamentId}
              options={tournamentOptions}
              placeholder="Seleccionar torneo"
              searchPlaceholder="Buscar torneo…"
              className="h-9 w-full min-w-[280px] sm:w-[340px]"
            />
            <Button
              size="sm"
              disabled={!canCreate}
              onClick={() => setOpen(true)}
              title={!canCreate ? 'Necesitas al menos 2 equipos' : undefined}
            >
              <Plus className="size-4" />
              Nuevo
            </Button>
          </div>
        }
      />

      <Card>
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <DataTable
            columns={columns}
            data={matches}
            searchPlaceholder="Buscar encuentro, sede o jornada…"
            searchKeys={['encuentro', 'sede', 'matchday', 'status']}
            emptyMessage={
              canCreate
                ? 'Sin partidos. Programa el primero con Nuevo.'
                : 'Agrega al menos 2 equipos al torneo para poder crear partidos.'
            }
            initialPageSize={10}
          />
        )}
      </Card>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Nuevo partido"
        submitting={busy}
        submitLabel="Programar"
        onSubmit={onCreate}
      >
        <Field label="Local">
          <Select
            value={form.homeTeamId}
            onValueChange={(value) => setForm((f) => ({ ...f, homeTeamId: value }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={String(team.id)}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Visitante">
          <Select
            value={form.awayTeamId}
            onValueChange={(value) => setForm((f) => ({ ...f, awayTeamId: value }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={String(team.id)}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Sede">
          <Select
            value={form.venueId}
            onValueChange={(value) => setForm((f) => ({ ...f, venueId: value }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin sede</SelectItem>
              {venues.map((venue) => (
                <SelectItem key={venue.id} value={String(venue.id)}>
                  {venue.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Fecha">
            <Input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
            />
          </Field>
          <Field label="Jornada">
            <Input
              type="number"
              min={1}
              value={form.matchday}
              onChange={(e) => setForm((f) => ({ ...f, matchday: e.target.value }))}
            />
          </Field>
        </div>
      </FormDialog>
    </div>
  )
}
