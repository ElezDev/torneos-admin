import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { ArrowLeft, ArrowRight, Loader2, Plus, Sparkles, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError, catalogApi, organizerApi, type TournamentOverview } from '@/api'
import { useAuth } from '@/auth/AuthProvider'
import { DataTable } from '@/components/DataTable'
import { FormDialog } from '@/components/FormDialog'
import { EmptyState, Field, PageHeader } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MatchManageDialog } from '@/features/tournaments/MatchManageDialog'
import { BracketView } from '@/features/tournaments/BracketView'
import { TournamentGalleryPanel } from '@/features/tournaments/TournamentGalleryPanel'
import { formatDate, formatDateTime, formatLabels, getErrorMessage, statusLabels } from '@/lib/utils'
import type { GameMatch, Player, Sport, Team, Tournament, TournamentGroup, Venue } from '@/types/domain'

export function TournamentListPage() {
  const navigate = useNavigate()
  const { tenant } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [sports, setSports] = useState<Sport[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    sportId: '',
    name: '',
    format: 'league',
    seasonLabel: '',
    startsOn: '',
    isPublic: true,
    groupNames: 'Grupo A\nGrupo B',
  })

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!tenant?.id) {
        setLoading(false)
        setLoadError('Elegí un inquilino arriba a la izquierda para ver tus torneos.')
        setTournaments([])
        return
      }

      setLoading(true)
      setLoadError(null)
      try {
        const t = await organizerApi.tournaments.list()
        if (!alive) return
        setTournaments(t.data ?? [])
      } catch (err) {
        if (!alive) return
        const message = getErrorMessage(err, 'No se pudieron cargar los torneos')
        setLoadError(message)
        setTournaments([])
        toast.error(message)
      }

      try {
        const s = await catalogApi.sports()
        if (!alive) return
        setSports(s.data ?? [])
        const futsal = s.data.find((sport) => sport.code === 'futsal')
        setForm((f) => ({
          ...f,
          sportId: String(futsal?.id ?? s.data[0]?.id ?? ''),
        }))
      } catch {
        // sports only needed for the create form
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [tenant?.id])

  async function onCreate() {
    setBusy(true)
    try {
      const groups =
        form.format === 'groups'
          ? form.groupNames
              .split('\n')
              .map((name) => name.trim())
              .filter(Boolean)
              .map((name, index) => ({ name, sortOrder: index }))
          : undefined

      const res = await organizerApi.tournaments.create({
        sportId: Number(form.sportId),
        name: form.name,
        format: form.format,
        seasonLabel: form.seasonLabel || null,
        startsOn: form.startsOn || null,
        isPublic: form.isPublic,
        ...(groups?.length ? { groups } : {}),
      })
      toast.success('Torneo creado')
      setOpen(false)
      navigate(`/app/tournaments/${res.data.id}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const columns = useMemo<ColumnDef<Tournament>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Torneo',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            {row.original.seasonLabel ? (
              <p className="text-xs text-muted-foreground">{row.original.seasonLabel}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: 'sport',
        accessorFn: (row) => row.sport?.name ?? '',
        header: 'Deporte',
        cell: ({ row }) => row.original.sport?.name ?? '—',
      },
      {
        accessorKey: 'format',
        header: 'Formato',
        cell: ({ row }) => formatLabels[row.original.format],
        filterFn: (row, _id, value) => row.original.format === value,
      },
      {
        accessorKey: 'startsOn',
        header: 'Inicio',
        cell: ({ row }) => formatDate(row.original.startsOn),
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => (
          <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'}>
            {statusLabels[row.original.status]}
          </Badge>
        ),
        filterFn: (row, _id, value) => row.original.status === value,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/app/tournaments/${row.original.id}`)
            }}
          >
            Abrir
            <ArrowRight className="size-3.5" />
          </Button>
        ),
      },
    ],
    [navigate],
  )

  return (
    <div>
      <PageHeader
        title="Mis torneos"
        description={`Todo lo de ${tenant?.name ?? 'tu organización'}: equipos, fixture, tabla y estadísticas.`}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Nuevo torneo
          </Button>
        }
      />

      <Card>
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Cargando…</p>
        ) : loadError ? (
          <div className="p-4">
            <EmptyState
              title="No se pudieron cargar los torneos"
              description={loadError}
              action={
                <Button size="sm" onClick={() => window.location.reload()}>
                  Reintentar
                </Button>
              }
            />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={tournaments}
            searchPlaceholder="Buscar torneo…"
            searchKeys={['name', 'seasonLabel']}
            emptyMessage="Sin torneos. Creá uno para empezar."
            onRowClick={(tournament) => navigate(`/app/tournaments/${tournament.id}`)}
            filters={[
              {
                id: 'status',
                label: 'estado',
                options: [
                  { value: 'draft', label: 'Borrador' },
                  { value: 'registration', label: 'Inscripción' },
                  { value: 'active', label: 'Activo' },
                  { value: 'finished', label: 'Finalizado' },
                ],
              },
              {
                id: 'format',
                label: 'formato',
                options: [
                  { value: 'league', label: 'Liga' },
                  { value: 'groups', label: 'Grupos' },
                  { value: 'knockout', label: 'Eliminación' },
                ],
              },
            ]}
            toolbar={
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="size-4" />
                Nuevo
              </Button>
            }
          />
        )}
      </Card>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Nuevo torneo"
        description="Podés elegir Futsal y después generar el fixture con un clic."
        submitting={busy}
        submitLabel="Crear y abrir"
        onSubmit={onCreate}
      >
        <Field label="Nombre">
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="Copa Futsal Apertura"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Deporte">
            <Select
              value={form.sportId}
              onValueChange={(value) => setForm((f) => ({ ...f, sportId: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Deporte" />
              </SelectTrigger>
              <SelectContent>
                {sports.map((sport) => (
                  <SelectItem key={sport.id} value={String(sport.id)}>
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Formato">
            <Select
              value={form.format}
              onValueChange={(value) => setForm((f) => ({ ...f, format: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="league">Liga</SelectItem>
                <SelectItem value="groups">Grupos</SelectItem>
                <SelectItem value="knockout">Eliminación</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Temporada">
            <Input
              value={form.seasonLabel}
              onChange={(e) => setForm((f) => ({ ...f, seasonLabel: e.target.value }))}
            />
          </Field>
          <Field label="Inicio">
            <Input
              type="date"
              value={form.startsOn}
              onChange={(e) => setForm((f) => ({ ...f, startsOn: e.target.value }))}
            />
          </Field>
        </div>
        {form.format === 'groups' ? (
          <Field label="Grupos (uno por línea)">
            <Textarea
              value={form.groupNames}
              onChange={(e) => setForm((f) => ({ ...f, groupNames: e.target.value }))}
              rows={4}
              placeholder={'Grupo A\nGrupo B\nGrupo C\nGrupo D'}
            />
          </Field>
        ) : null}
      </FormDialog>
    </div>
  )
}

export function TournamentDetailPage() {
  const { id } = useParams()
  const { tenant } = useAuth()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [overview, setOverview] = useState<TournamentOverview | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<GameMatch[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [groups, setGroups] = useState<TournamentGroup[]>([])
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)
  const [playerOpen, setPlayerOpen] = useState(false)
  const [matchOpen, setMatchOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [fixtureOpen, setFixtureOpen] = useState(false)
  const [managingMatch, setManagingMatch] = useState<GameMatch | null>(null)
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [teamName, setTeamName] = useState('')
  const [teamGroupId, setTeamGroupId] = useState('none')
  const [groupName, setGroupName] = useState('')
  const [playerForm, setPlayerForm] = useState({
    firstName: '',
    lastName: '',
    documentId: '',
    jerseyNumber: '',
  })
  const [matchForm, setMatchForm] = useState({
    homeTeamId: '',
    awayTeamId: '',
    venueId: 'none',
    groupId: 'none',
    matchday: '1',
    scheduledAt: '',
  })
  const [fixtureMode, setFixtureMode] = useState<'auto' | 'knockout'>('auto')
  const [fixtureForm, setFixtureForm] = useState({
    startDate: '',
    kickoffTime: '20:00',
    daysBetweenMatchdays: '7',
    legs: '1',
    matchIntervalMinutes: '75',
    clearExisting: true,
    venueIds: [] as number[],
    groupCount: '4',
    distributeTeams: true,
    shuffleTeams: true,
    includeThirdPlace: true,
  })

  async function reloadAll() {
    if (!id) return
    const [t, teamList, matchList, venueList, overviewRes, groupList] = await Promise.all([
      organizerApi.tournaments.get(id),
      organizerApi.teams.list(id),
      organizerApi.matches.list(id),
      organizerApi.venues.list(),
      organizerApi.tournaments.overview(id),
      organizerApi.tournaments.groups.list(id),
    ])
    setTournament(t.data)
    setTeams(teamList.data)
    setMatches(matchList.data)
    setVenues(venueList.data)
    setOverview(overviewRes.data)
    setGroups(groupList.data)
    setSelectedTeam((current) => {
      if (current && teamList.data.some((team) => team.id === current)) return current
      return teamList.data[0]?.id ?? null
    })
    setMatchForm((f) => ({
      ...f,
      homeTeamId: teamList.data[0] ? String(teamList.data[0].id) : '',
      awayTeamId: teamList.data[1] ? String(teamList.data[1].id) : '',
    }))
    setFixtureForm((f) => ({
      ...f,
      startDate: t.data.startsOn ?? new Date().toISOString().slice(0, 10),
      venueIds: venueList.data.map((v) => v.id),
    }))
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await reloadAll()
      } catch (err) {
        if (alive) toast.error(getErrorMessage(err))
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tenant?.id])

  useEffect(() => {
    if (!id) return
    void organizerApi.players
      .list({ tournamentId: id })
      .then((res) => setPlayers(res.data))
      .catch((err) => toast.error(getErrorMessage(err)))
  }, [id, teams.length, tenant?.id])

  const canCreateMatch = useMemo(() => teams.length >= 2, [teams.length])

  const teamColumns = useMemo<ColumnDef<Team>[]>(
    () => [
      { accessorKey: 'name', header: 'Equipo' },
      {
        accessorKey: 'shortName',
        header: 'Abrev.',
        cell: ({ row }) => row.original.shortName ?? '—',
      },
      {
        id: 'group',
        accessorFn: (row) => row.group?.name ?? '',
        header: 'Grupo',
        cell: ({ row }) => row.original.group?.name ?? 'Sin grupo',
        filterFn: (row, _id, value) => String(row.original.tournamentGroupId ?? 'none') === String(value),
      },
      {
        id: 'players',
        header: 'Jugadores',
        cell: ({ row }) => players.filter((p) => p.teamId === row.original.id).length,
      },
      {
        id: 'assign',
        header: 'Asignar',
        enableSorting: false,
        cell: ({ row }) => (
          <Select
            value={row.original.tournamentGroupId != null ? String(row.original.tournamentGroupId) : 'none'}
            onValueChange={(value) => {
              void (async () => {
                try {
                  await organizerApi.teams.update(row.original.id, {
                    tournamentGroupId: value === 'none' ? null : Number(value),
                  })
                  toast.success('Grupo actualizado')
                  await reloadAll()
                } catch (err) {
                  toast.error(getErrorMessage(err))
                }
              })()
            }}
          >
            <SelectTrigger className="h-7 w-[130px]" onClick={(e) => e.stopPropagation()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin grupo</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={String(group.id)}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
    ],
    [players, groups],
  )

  const playerColumns = useMemo<ColumnDef<Player>[]>(
    () => [
      {
        accessorKey: 'documentId',
        header: 'CC / Documento',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold tracking-wide">
            {row.original.documentId || '—'}
          </span>
        ),
      },
      {
        id: 'fullName',
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        header: 'Jugador',
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.firstName} {row.original.lastName}
          </span>
        ),
      },
      {
        id: 'teamName',
        accessorFn: (row) => row.team?.name ?? teams.find((t) => t.id === row.teamId)?.name ?? '',
        header: 'Equipo',
        cell: ({ row }) =>
          row.original.team?.name ?? teams.find((t) => t.id === row.original.teamId)?.name ?? '—',
        filterFn: (row, _id, value) => String(row.original.teamId) === String(value),
      },
      {
        accessorKey: 'jerseyNumber',
        header: 'Nº',
        cell: ({ row }) => row.original.jerseyNumber ?? '—',
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => (
          <Badge variant={row.original.status === 'suspended' ? 'destructive' : 'secondary'}>
            {statusLabels[row.original.status]}
          </Badge>
        ),
        filterFn: (row, _id, value) => row.original.status === value,
      },
      {
        accessorKey: 'yellowCardsCount',
        header: 'TA',
      },
      {
        accessorKey: 'redCardsCount',
        header: 'TR',
      },
    ],
    [teams],
  )

  const matchColumns = useMemo<ColumnDef<GameMatch>[]>(
    () => [
      {
        accessorKey: 'matchday',
        header: 'Fecha',
        cell: ({ row }) => row.original.matchday ?? '—',
        filterFn: (row, _id, value) => String(row.original.matchday ?? '') === String(value),
      },
      {
        id: 'group',
        accessorFn: (row) => row.group?.name ?? '',
        header: 'Grupo',
        cell: ({ row }) => row.original.group?.name ?? '—',
        filterFn: (row, _id, value) => String(row.original.tournamentGroupId ?? 'none') === String(value),
      },
      {
        id: 'fixture',
        accessorFn: (row) => `${row.homeTeam?.name ?? ''} ${row.awayTeam?.name ?? ''}`,
        header: 'Encuentro',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">
              {row.original.homeTeam?.name ?? row.original.homePlaceholder ?? 'Local'} vs{' '}
              {row.original.awayTeam?.name ?? row.original.awayPlaceholder ?? 'Visitante'}
            </p>
            {row.original.status === 'finished' ? (
              <p className="text-xs font-semibold text-primary">
                {row.original.homeScore ?? 0} - {row.original.awayScore ?? 0}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'scheduledAt',
        header: 'Cuándo',
        cell: ({ row }) => formatDateTime(row.original.scheduledAt),
      },
      {
        id: 'venue',
        accessorFn: (row) => row.venue?.name ?? '',
        header: 'Sede',
        cell: ({ row }) => row.original.venue?.name ?? '—',
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => <Badge variant="secondary">{statusLabels[row.original.status]}</Badge>,
        filterFn: (row, _id, value) => row.original.status === value,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              setManagingMatch(row.original)
            }}
          >
            Gestionar
          </Button>
        ),
      },
    ],
    [],
  )

  const groupColumns = useMemo<ColumnDef<TournamentGroup>[]>(
    () => [
      { accessorKey: 'name', header: 'Grupo' },
      {
        accessorKey: 'sortOrder',
        header: 'Orden',
      },
      {
        id: 'teamsCount',
        header: 'Equipos',
        cell: ({ row }) =>
          row.original.teamsCount ??
          teams.filter((team) => team.tournamentGroupId === row.original.id).length,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void (async () => {
                if (!id) return
                try {
                  await organizerApi.tournaments.groups.remove(id, row.original.id)
                  toast.success('Grupo eliminado')
                  await reloadAll()
                } catch (err) {
                  toast.error(getErrorMessage(err))
                }
              })()
            }}
          >
            Eliminar
          </Button>
        ),
      },
    ],
    [teams, id],
  )

  async function createTeam() {
    if (!id) return
    setBusy(true)
    try {
      await organizerApi.teams.create({
        tournamentId: Number(id),
        name: teamName.trim(),
        tournamentGroupId: teamGroupId === 'none' ? null : Number(teamGroupId),
      })
      toast.success('Equipo creado')
      setTeamOpen(false)
      setTeamName('')
      setTeamGroupId('none')
      await reloadAll()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function createGroup() {
    if (!id || !groupName.trim()) return
    setBusy(true)
    try {
      await organizerApi.tournaments.groups.create(id, { name: groupName.trim() })
      toast.success('Grupo creado')
      setGroupOpen(false)
      setGroupName('')
      await reloadAll()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function createPlayer() {
    if (!selectedTeam) return
    if (!playerForm.documentId.trim()) {
      toast.error('La cédula / documento (CC) es obligatoria')
      return
    }
    setBusy(true)
    try {
      await organizerApi.players.create({
        teamId: selectedTeam,
        firstName: playerForm.firstName.trim(),
        lastName: playerForm.lastName.trim(),
        documentId: playerForm.documentId.trim(),
        jerseyNumber: playerForm.jerseyNumber ? Number(playerForm.jerseyNumber) : null,
      })
      toast.success('Jugador creado')
      setPlayerOpen(false)
      setPlayerForm({ firstName: '', lastName: '', documentId: '', jerseyNumber: '' })
      const res = await organizerApi.players.list({ tournamentId: id })
      setPlayers(res.data)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function createMatch() {
    if (!id || !canCreateMatch) return
    setBusy(true)
    try {
      await organizerApi.matches.create({
        tournamentId: Number(id),
        homeTeamId: Number(matchForm.homeTeamId),
        awayTeamId: Number(matchForm.awayTeamId),
        venueId: matchForm.venueId !== 'none' ? Number(matchForm.venueId) : null,
        tournamentGroupId: matchForm.groupId !== 'none' ? Number(matchForm.groupId) : null,
        matchday: matchForm.matchday ? Number(matchForm.matchday) : null,
        scheduledAt: matchForm.scheduledAt || null,
      })
      toast.success('Partido programado')
      setMatchOpen(false)
      await reloadAll()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function generateFixture() {
    if (!id) return
    setGenerating(true)
    setGenProgress(8)
    const timer = window.setInterval(() => {
      setGenProgress((p) => Math.min(p + 11, 90))
    }, 180)

    try {
      const res = await organizerApi.tournaments.generateFixture(id, {
        startDate: fixtureForm.startDate,
        kickoffTime: fixtureForm.kickoffTime,
        daysBetweenMatchdays: Number(fixtureForm.daysBetweenMatchdays),
        legs: Number(fixtureForm.legs) as 1 | 2,
        venueIds: fixtureForm.venueIds,
        clearExisting: fixtureForm.clearExisting,
        matchIntervalMinutes: Number(fixtureForm.matchIntervalMinutes),
        groupCount: Number(fixtureForm.groupCount) || undefined,
        distributeTeams: fixtureForm.distributeTeams,
        shuffleTeams: fixtureForm.shuffleTeams,
        includeThirdPlace: fixtureForm.includeThirdPlace,
        mode:
          fixtureMode === 'knockout' || tournament?.format === 'knockout'
            ? 'knockout'
            : undefined,
      })
      setGenProgress(100)
      toast.success(
        `Fixture listo: ${res.data.matchesCreated} partidos · ${res.data.matchdays} fechas`
        + (res.data.groupsCreated ? ` · ${res.data.groupsCreated} grupos` : ''),
      )
      setTimeout(() => {
        setFixtureOpen(false)
        setGenerating(false)
        setGenProgress(0)
      }, 650)
      await reloadAll()
    } catch (err) {
      setGenerating(false)
      setGenProgress(0)
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      window.clearInterval(timer)
    }
  }

  function toggleVenue(venueId: number) {
    setFixtureForm((f) => ({
      ...f,
      venueIds: f.venueIds.includes(venueId)
        ? f.venueIds.filter((id) => id !== venueId)
        : [...f.venueIds, venueId],
    }))
  }

  if (!tournament) {
    return <p className="text-sm text-muted-foreground">Cargando torneo…</p>
  }

  const summary = overview?.summary

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1 text-muted-foreground" asChild>
          <Link to="/app/tournaments">
            <ArrowLeft className="size-3.5" />
            Mis torneos
          </Link>
        </Button>
        <Button
          size="sm"
          onClick={() => setFixtureOpen(true)}
          disabled={teams.length < 2}
          title={teams.length < 2 ? 'Necesitás al menos 2 equipos' : undefined}
        >
          <Sparkles className="size-4" />
          Generar fixture
        </Button>
      </div>

      <PageHeader
        title={tournament.name}
        description={`${tenant?.name ?? ''} · ${tournament.sport?.name ?? ''} · ${formatLabels[tournament.format]} · ${tournament.seasonLabel ?? ''}`}
        actions={
          <Badge variant={tournament.status === 'active' ? 'default' : 'secondary'}>
            {statusLabels[tournament.status]}
          </Badge>
        }
      />

      {tournament.bannerUrl ? (
        <div className="mb-4 overflow-hidden rounded-xl border">
          <img
            src={tournament.bannerUrl}
            alt={`Banner ${tournament.name}`}
            className="aspect-[21/9] w-full object-cover"
          />
        </div>
      ) : null}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="gallery">Galería</TabsTrigger>
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
          <TabsTrigger value="standings">Tabla</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          <TabsTrigger value="groups">Grupos</TabsTrigger>
          <TabsTrigger value="teams">Equipos</TabsTrigger>
          <TabsTrigger value="players">Jugadores</TabsTrigger>
          <TabsTrigger value="matches">Partidos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
            <MiniStat label="Equipos" value={String(summary?.teamsCount ?? teams.length)} />
            <MiniStat label="Jugadores" value={String(summary?.playersCount ?? '—')} />
            <MiniStat label="Partidos" value={String(summary?.matchesCount ?? matches.length)} />
            <MiniStat label="Programados" value={String(summary?.matchesScheduled ?? '—')} />
            <MiniStat label="Jugados" value={String(summary?.matchesFinished ?? '—')} />
            <MiniStat label="Sedes" value={String(summary?.venuesUsed ?? '—')} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-2 p-3">
                <p className="text-sm font-medium">Próximos partidos</p>
                {(overview?.upcomingMatches?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sin partidos. Generá el fixture automático.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {overview?.upcomingMatches.map((match) => (
                      <li key={match.id} className="py-2 text-sm">
                        <button
                          type="button"
                          className="w-full text-left hover:text-primary"
                          onClick={() => setManagingMatch(match)}
                        >
                          <p className="font-medium">
                            {match.homeTeam?.name} vs {match.awayTeam?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {match.group?.name ? `${match.group.name} · ` : ''}
                            {formatDateTime(match.scheduledAt)}
                            {match.venue?.name ? ` · ${match.venue.name}` : ''}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2 p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Trophy className="size-3.5 text-primary" />
                  Top goleadores
                </p>
                {(overview?.scorers?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Todavía no hay goles cargados en planillas.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {overview?.scorers.slice(0, 8).map((row) => (
                      <li key={row.playerId} className="flex items-center justify-between py-2 text-sm">
                        <span>
                          {row.player
                            ? `${row.player.firstName} ${row.player.lastName}`
                            : `Jugador #${row.playerId}`}
                        </span>
                        <Badge>{row.goals}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gallery" className="mt-3">
          <TournamentGalleryPanel
            tournament={tournament}
            matches={matches}
            onTournamentChange={setTournament}
          />
        </TabsContent>

        <TabsContent value="bracket" className="mt-3">
          <Card>
            <div className="flex items-center justify-between border-b px-3 py-2">
              <div>
                <p className="text-sm font-medium">Cuadro de eliminación</p>
                <p className="text-xs text-muted-foreground">
                  Primero partidos aleatorios; después ganador vs ganador hasta la final.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={teams.length < 4}
                onClick={() => {
                  setFixtureMode('knockout')
                  setFixtureOpen(true)
                }}
              >
                <Sparkles className="size-4" />
                Generar bracket
              </Button>
            </div>
            <BracketView
              rounds={overview?.bracketRounds ?? []}
              onManage={(match) => setManagingMatch(match)}
            />
          </Card>
        </TabsContent>

        <TabsContent value="standings" className="mt-3 space-y-3">
          {(overview?.standingsByGroup?.length ?? 0) > 0 ? (
            overview?.standingsByGroup.map((block) => (
              <Card key={block.group.id}>
                <CardContent className="p-0">
                  <div className="border-b px-3 py-2">
                    <p className="text-sm font-medium">{block.group.name}</p>
                  </div>
                  {block.standings.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">Sin equipos en este grupo.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Equipo</TableHead>
                          <TableHead>PJ</TableHead>
                          <TableHead>PG</TableHead>
                          <TableHead>PE</TableHead>
                          <TableHead>PP</TableHead>
                          <TableHead>GF</TableHead>
                          <TableHead>GC</TableHead>
                          <TableHead>DG</TableHead>
                          <TableHead>Pts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {block.standings.map((row, index) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.rankPosition ?? index + 1}</TableCell>
                            <TableCell className="font-medium">
                              {row.team?.name ?? `Equipo ${row.teamId}`}
                            </TableCell>
                            <TableCell>{row.played}</TableCell>
                            <TableCell>{row.won}</TableCell>
                            <TableCell>{row.drawn}</TableCell>
                            <TableCell>{row.lost}</TableCell>
                            <TableCell>{row.goalsFor}</TableCell>
                            <TableCell>{row.goalsAgainst}</TableCell>
                            <TableCell>{row.goalDifference}</TableCell>
                            <TableCell className="font-semibold">{row.points}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (overview?.standings?.length ?? 0) === 0 ? (
            <Card>
              <div className="p-4">
                <EmptyState
                  title="Sin tabla todavía"
                  description="Se crea al generar el fixture o al cerrar partidos."
                />
              </div>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead>PJ</TableHead>
                    <TableHead>PG</TableHead>
                    <TableHead>PE</TableHead>
                    <TableHead>PP</TableHead>
                    <TableHead>GF</TableHead>
                    <TableHead>GC</TableHead>
                    <TableHead>DG</TableHead>
                    <TableHead>Pts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview?.standings.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.rankPosition ?? index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {row.team?.name ?? `Equipo ${row.teamId}`}
                      </TableCell>
                      <TableCell>{row.played}</TableCell>
                      <TableCell>{row.won}</TableCell>
                      <TableCell>{row.drawn}</TableCell>
                      <TableCell>{row.lost}</TableCell>
                      <TableCell>{row.goalsFor}</TableCell>
                      <TableCell>{row.goalsAgainst}</TableCell>
                      <TableCell>{row.goalDifference}</TableCell>
                      <TableCell className="font-semibold">{row.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardContent className="p-3">
                <p className="mb-2 text-sm font-medium">Goleadores</p>
                {(overview?.scorers?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos aún.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jugador</TableHead>
                        <TableHead>Goles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overview?.scorers.map((row) => (
                        <TableRow key={row.playerId}>
                          <TableCell>
                            {row.player
                              ? `${row.player.firstName} ${row.player.lastName}`
                              : `#${row.playerId}`}
                          </TableCell>
                          <TableCell className="font-semibold">{row.goals}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="mb-2 text-sm font-medium">Tarjetas</p>
                {(overview?.cardLeaders?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin tarjetas acumuladas.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jugador</TableHead>
                        <TableHead>AMA</TableHead>
                        <TableHead>ROJ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overview?.cardLeaders.map((player) => (
                        <TableRow key={player.id}>
                          <TableCell>
                            {player.firstName} {player.lastName}
                          </TableCell>
                          <TableCell>{player.yellowCardsCount}</TableCell>
                          <TableCell>{player.redCardsCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="mt-3">
          <Card>
            <DataTable
              columns={groupColumns}
              data={groups}
              searchPlaceholder="Buscar grupo…"
              searchKeys={['name']}
              emptyMessage="Sin grupos. Creá Grupo A, B… y asigná equipos."
              toolbar={
                <Button size="sm" onClick={() => setGroupOpen(true)}>
                  <Plus className="size-4" />
                  Grupo
                </Button>
              }
            />
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="mt-3">
          <Card>
            <DataTable
              columns={teamColumns}
              data={teams}
              searchPlaceholder="Buscar equipo…"
              searchKeys={['name', 'shortName']}
              emptyMessage="Sin equipos. Agregá planteles para armar el fixture."
              onRowClick={(team) => setSelectedTeam(team.id)}
              filters={
                groups.length
                  ? [
                      {
                        id: 'group',
                        label: 'grupo',
                        options: [
                          { value: 'none', label: 'Sin grupo' },
                          ...groups.map((g) => ({ value: String(g.id), label: g.name })),
                        ],
                      },
                    ]
                  : []
              }
              toolbar={
                <Button size="sm" onClick={() => setTeamOpen(true)}>
                  <Plus className="size-4" />
                  Equipo
                </Button>
              }
            />
          </Card>
        </TabsContent>

        <TabsContent value="players" className="mt-3">
          <Card>
            <DataTable
              columns={playerColumns}
              data={players}
              searchPlaceholder="Buscar por CC, nombre o apellido…"
              searchKeys={['documentId', 'firstName', 'lastName']}
              emptyMessage="Sin jugadores en este torneo."
              initialPageSize={15}
              filters={[
                {
                  id: 'teamName',
                  label: 'equipo',
                  options: teams.map((team) => ({ value: String(team.id), label: team.name })),
                },
                {
                  id: 'status',
                  label: 'estado',
                  options: [
                    { value: 'enabled', label: 'Habilitado' },
                    { value: 'suspended', label: 'Suspendido' },
                  ],
                },
              ]}
              toolbar={
                <Button
                  size="sm"
                  disabled={teams.length === 0}
                  onClick={() => {
                    if (!selectedTeam && teams[0]) setSelectedTeam(teams[0].id)
                    setPlayerOpen(true)
                  }}
                >
                  <Plus className="size-4" />
                  Jugador
                </Button>
              }
            />
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="mt-3">
          <Card>
            <DataTable
              columns={matchColumns}
              data={matches}
              searchPlaceholder="Buscar partido o sede…"
              searchKeys={['roundName']}
              emptyMessage="Sin partidos. Generá el fixture automático."
              filters={[
                {
                  id: 'status',
                  label: 'estado',
                  options: [
                    { value: 'scheduled', label: 'Programado' },
                    { value: 'live', label: 'En vivo' },
                    { value: 'finished', label: 'Finalizado' },
                    { value: 'postponed', label: 'Aplazado' },
                  ],
                },
                {
                  id: 'matchday',
                  label: 'fecha',
                  options: Array.from(
                    new Set(matches.map((m) => m.matchday).filter((n): n is number => n != null)),
                  ).map((n) => ({ value: String(n), label: `Fecha ${n}` })),
                },
                ...(groups.length
                  ? [
                      {
                        id: 'group',
                        label: 'grupo',
                        options: groups.map((g) => ({ value: String(g.id), label: g.name })),
                      },
                    ]
                  : []),
              ]}
              toolbar={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={teams.length < 2} onClick={() => setFixtureOpen(true)}>
                    <Sparkles className="size-4" />
                    Auto
                  </Button>
                  <Button size="sm" disabled={!canCreateMatch} onClick={() => setMatchOpen(true)}>
                    <Plus className="size-4" />
                    Manual
                  </Button>
                </div>
              }
              onRowClick={(match) => setManagingMatch(match)}
            />
          </Card>
        </TabsContent>
      </Tabs>

      <FormDialog open={teamOpen} onOpenChange={setTeamOpen} title="Nuevo equipo" submitting={busy} submitLabel="Crear" onSubmit={createTeam}>
        <Field label="Nombre">
          <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
        </Field>
        {groups.length > 0 ? (
          <Field label="Grupo">
            <Select value={teamGroupId} onValueChange={setTeamGroupId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin grupo</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={String(group.id)}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
      </FormDialog>

      <FormDialog
        open={groupOpen}
        onOpenChange={setGroupOpen}
        title="Nuevo grupo"
        description="Ejemplo: Grupo A, Grupo B…"
        submitting={busy}
        submitLabel="Crear"
        onSubmit={createGroup}
      >
        <Field label="Nombre">
          <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} required placeholder="Grupo A" />
        </Field>
      </FormDialog>

      <FormDialog
        open={playerOpen}
        onOpenChange={setPlayerOpen}
        title="Nuevo jugador"
        description="La cédula (CC) es obligatoria y única en la organización."
        submitting={busy}
        submitLabel="Crear"
        onSubmit={createPlayer}
      >
        <Field label="Equipo">
          <Select
            value={selectedTeam ? String(selectedTeam) : undefined}
            onValueChange={(value) => setSelectedTeam(Number(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Elegí equipo" />
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
        <Field label="Documento / CC">
          <Input
            value={playerForm.documentId}
            onChange={(e) => setPlayerForm((f) => ({ ...f, documentId: e.target.value }))}
            required
            placeholder="Ej. 1234567890"
            autoComplete="off"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Nombre">
            <Input
              value={playerForm.firstName}
              onChange={(e) => setPlayerForm((f) => ({ ...f, firstName: e.target.value }))}
              required
            />
          </Field>
          <Field label="Apellido">
            <Input
              value={playerForm.lastName}
              onChange={(e) => setPlayerForm((f) => ({ ...f, lastName: e.target.value }))}
              required
            />
          </Field>
        </div>
        <Field label="Número de camiseta">
          <Input
            value={playerForm.jerseyNumber}
            onChange={(e) => setPlayerForm((f) => ({ ...f, jerseyNumber: e.target.value }))}
          />
        </Field>
      </FormDialog>

      <FormDialog open={matchOpen} onOpenChange={setMatchOpen} title="Partido manual" submitting={busy} submitLabel="Programar" onSubmit={createMatch}>
        <Field label="Local">
          <Select value={matchForm.homeTeamId} onValueChange={(value) => setMatchForm((f) => ({ ...f, homeTeamId: value }))}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {teams.map((team) => <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Visitante">
          <Select value={matchForm.awayTeamId} onValueChange={(value) => setMatchForm((f) => ({ ...f, awayTeamId: value }))}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {teams.map((team) => <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Sede">
          <Select value={matchForm.venueId} onValueChange={(value) => setMatchForm((f) => ({ ...f, venueId: value }))}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin sede</SelectItem>
              {venues.map((venue) => <SelectItem key={venue.id} value={String(venue.id)}>{venue.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        {groups.length > 0 ? (
          <Field label="Grupo">
            <Select value={matchForm.groupId} onValueChange={(value) => setMatchForm((f) => ({ ...f, groupId: value }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin grupo</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={String(group.id)}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Fecha/hora">
            <Input type="datetime-local" value={matchForm.scheduledAt} onChange={(e) => setMatchForm((f) => ({ ...f, scheduledAt: e.target.value }))} />
          </Field>
          <Field label="Jornada">
            <Input type="number" min={1} value={matchForm.matchday} onChange={(e) => setMatchForm((f) => ({ ...f, matchday: e.target.value }))} />
          </Field>
        </div>
      </FormDialog>

      <Dialog
        open={fixtureOpen}
        onOpenChange={(open) => {
          if (!generating) {
            setFixtureOpen(open)
            if (!open) setFixtureMode('auto')
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {fixtureMode === 'knockout' || tournament.format === 'knockout'
                ? 'Generar bracket de eliminación'
                : 'Generar fixture automático'}
            </DialogTitle>
            <DialogDescription>
              {fixtureMode === 'knockout' || tournament.format === 'knockout'
                ? 'Bracket de eliminación: 1ª ronda aleatoria y luego Ganador partido X vs Ganador partido Y.'
                : tournament.format === 'groups'
                  ? 'Primero creá los equipos. Al generar, se reparte en grupos y solo se emparejan equipos del mismo grupo.'
                  : 'Round-robin con fecha, hora, intervalo entre partidos del mismo día y rotación de sedes.'}
            </DialogDescription>
          </DialogHeader>

          {generating ? (
            <div className="space-y-4 py-6 text-center">
              <div className="fixture-orbit mx-auto flex size-20 items-center justify-center rounded-full border border-primary/30 bg-primary/5">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
              <div>
                <p className="font-medium">Armando el calendario…</p>
                <p className="text-sm text-muted-foreground">Emparejando equipos, fechas y sedes</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-200"
                  style={{ width: `${genProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Fecha de inicio">
                  <Input
                    type="date"
                    value={fixtureForm.startDate}
                    onChange={(e) => setFixtureForm((f) => ({ ...f, startDate: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="Hora de inicio">
                  <Input
                    type="time"
                    value={fixtureForm.kickoffTime}
                    onChange={(e) => setFixtureForm((f) => ({ ...f, kickoffTime: e.target.value }))}
                    required
                  />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Días entre fechas">
                  <Input
                    type="number"
                    min={1}
                    value={fixtureForm.daysBetweenMatchdays}
                    onChange={(e) => setFixtureForm((f) => ({ ...f, daysBetweenMatchdays: e.target.value }))}
                  />
                </Field>
                <Field label="Min. entre partidos">
                  <Input
                    type="number"
                    min={0}
                    value={fixtureForm.matchIntervalMinutes}
                    onChange={(e) => setFixtureForm((f) => ({ ...f, matchIntervalMinutes: e.target.value }))}
                  />
                </Field>
                <Field label="Vueltas">
                  <Select
                    value={fixtureForm.legs}
                    onValueChange={(value) => setFixtureForm((f) => ({ ...f, legs: value }))}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Ida</SelectItem>
                      <SelectItem value="2">Ida y vuelta</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              {fixtureMode === 'knockout' || tournament.format === 'knockout' ? (
                <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                  <p className="text-[11px] text-muted-foreground">
                    Necesitás 4, 8 o 16 equipos. La 1ª ronda se sortea; las siguientes quedan como
                    “Ganador partido 1 vs Ganador partido 2”, etc.
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={fixtureForm.shuffleTeams}
                      onCheckedChange={(checked) =>
                        setFixtureForm((f) => ({ ...f, shuffleTeams: Boolean(checked) }))
                      }
                    />
                    Sortear emparejamientos de la 1ª ronda
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={fixtureForm.includeThirdPlace}
                      onCheckedChange={(checked) =>
                        setFixtureForm((f) => ({ ...f, includeThirdPlace: Boolean(checked) }))
                      }
                    />
                    Incluir partido por el 3er lugar
                  </label>
                </div>
              ) : null}
              {tournament.format === 'groups' && fixtureMode !== 'knockout' ? (
                <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                  <Field label="Cantidad de grupos">
                    <Input
                      type="number"
                      min={2}
                      max={16}
                      value={fixtureForm.groupCount}
                      onChange={(e) => setFixtureForm((f) => ({ ...f, groupCount: e.target.value }))}
                    />
                  </Field>
                  <p className="text-[11px] text-muted-foreground">
                    Creá primero los equipos. Acá se reparten en grupos y solo se emparejan rivales del mismo grupo.
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={fixtureForm.distributeTeams}
                      onCheckedChange={(checked) =>
                        setFixtureForm((f) => ({ ...f, distributeTeams: Boolean(checked) }))
                      }
                    />
                    Distribuir equipos automáticamente en grupos
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={fixtureForm.shuffleTeams}
                      onCheckedChange={(checked) =>
                        setFixtureForm((f) => ({ ...f, shuffleTeams: Boolean(checked) }))
                      }
                      disabled={!fixtureForm.distributeTeams}
                    />
                    Mezclar equipos al repartir
                  </label>
                </div>
              ) : null}
              <Field label="Sedes (rotan en cada partido)">
                <div className="max-h-36 space-y-2 overflow-auto rounded-md border p-2">
                  {venues.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No hay sedes. Creá alguna en Sedes.</p>
                  ) : (
                    venues.map((venue) => (
                      <label key={venue.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={fixtureForm.venueIds.includes(venue.id)}
                          onCheckedChange={() => toggleVenue(venue.id)}
                        />
                        {venue.name}
                      </label>
                    ))
                  )}
                </div>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={fixtureForm.clearExisting}
                  onCheckedChange={(checked) =>
                    setFixtureForm((f) => ({ ...f, clearExisting: Boolean(checked) }))
                  }
                />
                Reemplazar partidos programados existentes
              </label>
            </div>
          )}

          {!generating ? (
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setFixtureOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={() => void generateFixture()} disabled={!fixtureForm.startDate}>
                <Sparkles className="size-4" />
                Generar ahora
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <MatchManageDialog
        match={managingMatch}
        venues={venues}
        open={managingMatch != null}
        onOpenChange={(open) => {
          if (!open) setManagingMatch(null)
        }}
        onSaved={reloadAll}
      />
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </Card>
  )
}
