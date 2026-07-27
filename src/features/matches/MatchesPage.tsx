import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError, organizerApi } from '@/api'
import { useAuth } from '@/auth/AuthProvider'
import { FormDialog } from '@/components/FormDialog'
import { EmptyState, Field, PageHeader } from '@/components/shared'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime, getErrorMessage, statusLabels } from '@/lib/utils'
import type { GameMatch, Team, Tournament, Venue } from '@/types/domain'

export function MatchesPage() {
  const { tenant } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [tournamentId, setTournamentId] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [matches, setMatches] = useState<GameMatch[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    homeTeamId: '',
    awayTeamId: '',
    venueId: 'none',
    matchday: '1',
    scheduledAt: '',
  })

  useEffect(() => {
    if (!tenant?.id) return
    void Promise.all([organizerApi.tournaments.list(), organizerApi.venues.list()])
      .then(([t, v]) => {
        setTournaments(t.data)
        setVenues(v.data)
        if (t.data[0]) setTournamentId(String(t.data[0].id))
      })
      .catch((err) => toast.error(getErrorMessage(err, 'Error al cargar partidos')))
  }, [tenant?.id])

  useEffect(() => {
    if (!tournamentId) return
    void Promise.all([
      organizerApi.teams.list(tournamentId),
      organizerApi.matches.list(tournamentId),
    ]).then(([teamList, matchList]) => {
      setTeams(teamList.data)
      setMatches(matchList.data)
      setForm((f) => ({
        ...f,
        homeTeamId: teamList.data[0] ? String(teamList.data[0].id) : '',
        awayTeamId: teamList.data[1] ? String(teamList.data[1].id) : '',
      }))
    })
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

  return (
    <div>
      <PageHeader
        title="Partidos"
        description="Fixture del inquilino activo."
        actions={
          <div className="flex items-center gap-2">
            <Select value={tournamentId} onValueChange={setTournamentId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Torneo" />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map((tournament) => (
                  <SelectItem key={tournament.id} value={String(tournament.id)}>
                    {tournament.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!canCreate}
              onClick={() => setOpen(true)}
              title={!canCreate ? 'Necesitás al menos 2 equipos' : undefined}
            >
              <Plus className="size-4" />
              Nuevo
            </Button>
          </div>
        }
      />

      <Card>
        {matches.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Sin partidos"
              description={
                canCreate
                  ? 'Programá el primer encuentro con el botón Nuevo.'
                  : 'Agregá al menos 2 equipos al torneo para poder crear partidos.'
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Encuentro</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Jornada</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match) => (
                <TableRow key={match.id}>
                  <TableCell className="font-medium">
                    {match.homeTeam?.name ?? 'Local'} vs {match.awayTeam?.name ?? 'Visitante'}
                  </TableCell>
                  <TableCell>{formatDateTime(match.scheduledAt)}</TableCell>
                  <TableCell>{match.venue?.name ?? '—'}</TableCell>
                  <TableCell>{match.matchday ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={match.status === 'finished' ? 'default' : 'secondary'}>
                      {statusLabels[match.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
