import { useEffect, useMemo, useState } from 'react'
import { FileDown, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  ApiError,
  organizerApi,
  type MatchEventRow,
  type MatchSheet,
} from '@/api'
import { Field } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime, getErrorMessage } from '@/lib/utils'
import { sportLabels } from '@/lib/sport-labels'
import type { GameMatch, Player, Sport } from '@/types/domain'

function eventLabelsFor(sport?: Pick<Sport, 'code' | 'scoringLabel'> | null): Record<MatchEventRow['type'], string> {
  const labels = sportLabels(sport)
  return {
    goal: labels.scoreEvent,
    ownGoal: labels.ownScoreEvent,
    yellowCard: 'Amarilla',
    redCard: 'Roja',
    secondYellow: '2ª amarilla',
    substitution: 'Cambio',
  }
}

type Props = {
  match: GameMatch | null
  sport?: Pick<Sport, 'code' | 'scoringLabel'> | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void> | void
}

type LineupRow = { playerId: number; jerseyNumber: string; isStarter: boolean; selected: boolean }

export function PlanillaDialog({ match, sport, open, onOpenChange, onSaved }: Props) {
  const eventLabels = useMemo(() => eventLabelsFor(sport), [sport])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sheets, setSheets] = useState<MatchSheet[]>([])
  const [events, setEvents] = useState<MatchEventRow[]>([])
  const [roster, setRoster] = useState<Record<string, Player[]>>({})
  const [matchData, setMatchData] = useState<GameMatch | null>(null)
  const [meta, setMeta] = useState({
    refereeName: '',
    notes: '',
    homeDelegateName: '',
    awayDelegateName: '',
  })
  const [lineups, setLineups] = useState<Record<number, LineupRow[]>>({})
  const [eventForm, setEventForm] = useState({
    type: 'goal' as MatchEventRow['type'],
    teamId: '',
    playerId: '',
    relatedPlayerId: '',
    minute: '',
  })

  async function load() {
    if (!match) return
    setLoading(true)
    try {
      const res = await organizerApi.matches.planilla.get(match.id)
      const data = res.data
      setMatchData(data.match)
      setSheets(data.sheets)
      setEvents(data.events)
      setRoster(data.roster)
      const homeSheet = data.sheets.find((s) => s.teamId === data.match.homeTeamId)
      const awaySheet = data.sheets.find((s) => s.teamId === data.match.awayTeamId)
      setMeta({
        refereeName: data.match.refereeName ?? '',
        notes: data.match.notes ?? '',
        homeDelegateName: homeSheet?.delegateName ?? '',
        awayDelegateName: awaySheet?.delegateName ?? '',
      })

      const nextLineups: Record<number, LineupRow[]> = {}
      for (const teamId of [data.match.homeTeamId, data.match.awayTeamId]) {
        if (!teamId) continue
        const sheet = data.sheets.find((s) => s.teamId === teamId)
        const players = data.roster[String(teamId)] ?? []
        const selectedIds = new Set((sheet?.players ?? []).map((p) => p.playerId))
        const starterIds = new Set(
          (sheet?.players ?? []).filter((p) => p.isStarter).map((p) => p.playerId),
        )
        nextLineups[teamId] = players.map((player) => {
          const onSheet = sheet?.players?.find((p) => p.playerId === player.id)
          return {
            playerId: player.id,
            jerseyNumber: String(onSheet?.jerseyNumber ?? player.jerseyNumber ?? ''),
            isStarter: selectedIds.size ? starterIds.has(player.id) : true,
            selected: selectedIds.size ? selectedIds.has(player.id) : true,
          }
        })
      }
      setLineups(nextLineups)
      if (data.match.homeTeamId) {
        setEventForm((f) => ({ ...f, teamId: String(data.match.homeTeamId) }))
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo abrir la planilla'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && match) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, match?.id])

  const closed = sheets.some((s) => s.status === 'closed') || matchData?.status === 'finished'

  const teamPlayers = useMemo(() => {
    if (!eventForm.teamId) return []
    return roster[eventForm.teamId] ?? []
  }, [eventForm.teamId, roster])

  async function saveMeta() {
    if (!match) return
    setBusy(true)
    try {
      await organizerApi.matches.planilla.updateMeta(match.id, {
        refereeName: meta.refereeName || null,
        notes: meta.notes || null,
        homeDelegateName: meta.homeDelegateName || null,
        awayDelegateName: meta.awayDelegateName || null,
      })
      toast.success('Datos de planilla guardados')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function saveLineup(teamId: number) {
    if (!match) return
    const rows = (lineups[teamId] ?? []).filter((r) => r.selected)
    if (rows.length === 0) {
      toast.error('Seleccioná al menos un jugador')
      return
    }
    setBusy(true)
    try {
      await organizerApi.matches.planilla.syncLineup(
        match.id,
        teamId,
        rows.map((r) => ({
          playerId: r.playerId,
          jerseyNumber: r.jerseyNumber ? Number(r.jerseyNumber) : null,
          isStarter: r.isStarter,
        })),
      )
      toast.success('Nómina guardada')
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function addEvent() {
    if (!match || !eventForm.teamId || !eventForm.playerId) return
    if (eventForm.type === 'substitution' && !eventForm.relatedPlayerId) {
      toast.error('Indicá quién entra en el cambio')
      return
    }
    setBusy(true)
    try {
      await organizerApi.matches.planilla.addEvent(match.id, {
        type: eventForm.type,
        teamId: Number(eventForm.teamId),
        playerId: Number(eventForm.playerId),
        relatedPlayerId: eventForm.relatedPlayerId ? Number(eventForm.relatedPlayerId) : null,
        minute: eventForm.minute ? Number(eventForm.minute) : null,
      })
      toast.success('Incidencia agregada')
      setEventForm((f) => ({ ...f, playerId: '', relatedPlayerId: '', minute: '' }))
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function removeEvent(eventId: number) {
    if (!match) return
    try {
      await organizerApi.matches.planilla.removeEvent(match.id, eventId)
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  async function closePlanilla() {
    if (!match) return
    setBusy(true)
    try {
      await saveMeta()
      await organizerApi.matches.planilla.close(match.id, { notes: meta.notes || undefined })
      toast.success('Planilla cerrada · partido finalizado')
      await onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function downloadPdf() {
    if (!match) return
    try {
      await organizerApi.matches.planilla.downloadPdf(match.id)
      toast.success('PDF descargado')
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo generar el PDF'))
    }
  }

  function renderLineup(teamId: number, title: string) {
    const rows = lineups[teamId] ?? []
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{title}</p>
          <Button size="sm" disabled={busy || closed} onClick={() => void saveLineup(teamId)}>
            Guardar nómina
          </Button>
        </div>
        <div className="max-h-56 space-y-1 overflow-auto rounded-md border p-2">
          {rows.map((row) => {
            const player = (roster[String(teamId)] ?? []).find((p) => p.id === row.playerId)
            return (
              <label key={row.playerId} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/50">
                <Checkbox
                  checked={row.selected}
                  disabled={closed}
                  onCheckedChange={(checked) =>
                    setLineups((prev) => ({
                      ...prev,
                      [teamId]: prev[teamId].map((r) =>
                        r.playerId === row.playerId ? { ...r, selected: Boolean(checked) } : r,
                      ),
                    }))
                  }
                />
                <span className="min-w-0 flex-1 truncate">
                  {player ? `${player.firstName} ${player.lastName}` : row.playerId}
                  <span className="ml-1 text-xs text-muted-foreground">CC {player?.documentId}</span>
                </span>
                <Input
                  className="h-7 w-14"
                  value={row.jerseyNumber}
                  disabled={closed || !row.selected}
                  onChange={(e) =>
                    setLineups((prev) => ({
                      ...prev,
                      [teamId]: prev[teamId].map((r) =>
                        r.playerId === row.playerId ? { ...r, jerseyNumber: e.target.value } : r,
                      ),
                    }))
                  }
                  placeholder="Nº"
                />
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Checkbox
                    checked={row.isStarter}
                    disabled={closed || !row.selected}
                    onCheckedChange={(checked) =>
                      setLineups((prev) => ({
                        ...prev,
                        [teamId]: prev[teamId].map((r) =>
                          r.playerId === row.playerId ? { ...r, isStarter: Boolean(checked) } : r,
                        ),
                      }))
                    }
                  />
                  Titular
                </label>
              </label>
            )
          })}
        </div>
      </div>
    )
  }

  if (!match) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Planillar partido</DialogTitle>
          <DialogDescription>
            {match.homeTeam?.name ?? 'Local'} vs {match.awayTeam?.name ?? 'Visitante'}
            {match.scheduledAt ? ` · ${formatDateTime(match.scheduledAt)}` : ''}
            {closed ? ' · Cerrada' : ''}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Cargando planilla…</p>
        ) : (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-2 pr-1">
            <div className="grid gap-2 md:grid-cols-3">
              <Field label="Árbitro">
                <Input
                  value={meta.refereeName}
                  disabled={closed}
                  onChange={(e) => setMeta((m) => ({ ...m, refereeName: e.target.value }))}
                />
              </Field>
              <Field label={`Delegado ${match.homeTeam?.shortName ?? 'local'}`}>
                <Input
                  value={meta.homeDelegateName}
                  disabled={closed}
                  onChange={(e) => setMeta((m) => ({ ...m, homeDelegateName: e.target.value }))}
                />
              </Field>
              <Field label={`Delegado ${match.awayTeam?.shortName ?? 'visitante'}`}>
                <Input
                  value={meta.awayDelegateName}
                  disabled={closed}
                  onChange={(e) => setMeta((m) => ({ ...m, awayDelegateName: e.target.value }))}
                />
              </Field>
            </div>

            <Tabs defaultValue="lineup">
              <TabsList>
                <TabsTrigger value="lineup">Nóminas</TabsTrigger>
                <TabsTrigger value="events">Incidencias</TabsTrigger>
                <TabsTrigger value="notes">Observaciones</TabsTrigger>
              </TabsList>

              <TabsContent value="lineup" className="mt-3 grid gap-4 md:grid-cols-2">
                {match.homeTeamId ? renderLineup(match.homeTeamId, match.homeTeam?.name ?? 'Local') : null}
                {match.awayTeamId ? renderLineup(match.awayTeamId, match.awayTeam?.name ?? 'Visitante') : null}
              </TabsContent>

              <TabsContent value="events" className="mt-3 space-y-3">
                {!closed ? (
                  <div className="grid gap-2 rounded-md border p-3 md:grid-cols-6">
                    <Field label="Tipo">
                      <Select
                        value={eventForm.type}
                        onValueChange={(value) =>
                          setEventForm((f) => ({ ...f, type: value as MatchEventRow['type'] }))
                        }
                      >
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(eventLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Equipo">
                      <Select
                        value={eventForm.teamId}
                        onValueChange={(value) =>
                          setEventForm((f) => ({ ...f, teamId: value, playerId: '', relatedPlayerId: '' }))
                        }
                      >
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {match.homeTeamId ? (
                            <SelectItem value={String(match.homeTeamId)}>{match.homeTeam?.name}</SelectItem>
                          ) : null}
                          {match.awayTeamId ? (
                            <SelectItem value={String(match.awayTeamId)}>{match.awayTeam?.name}</SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label={eventForm.type === 'substitution' ? 'Sale' : 'Jugador'}>
                      <Select
                        value={eventForm.playerId}
                        onValueChange={(value) => setEventForm((f) => ({ ...f, playerId: value }))}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Jugador" /></SelectTrigger>
                        <SelectContent>
                          {teamPlayers.map((player) => (
                            <SelectItem key={player.id} value={String(player.id)}>
                              {player.jerseyNumber ? `#${player.jerseyNumber} ` : ''}
                              {player.firstName} {player.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    {eventForm.type === 'substitution' ? (
                      <Field label="Entra">
                        <Select
                          value={eventForm.relatedPlayerId}
                          onValueChange={(value) => setEventForm((f) => ({ ...f, relatedPlayerId: value }))}
                        >
                          <SelectTrigger className="w-full"><SelectValue placeholder="Entra" /></SelectTrigger>
                          <SelectContent>
                            {teamPlayers
                              .filter((p) => String(p.id) !== eventForm.playerId)
                              .map((player) => (
                                <SelectItem key={player.id} value={String(player.id)}>
                                  {player.firstName} {player.lastName}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    ) : (
                      <div />
                    )}
                    <Field label="Minuto">
                      <Input
                        type="number"
                        min={0}
                        value={eventForm.minute}
                        onChange={(e) => setEventForm((f) => ({ ...f, minute: e.target.value }))}
                      />
                    </Field>
                    <div className="flex items-end">
                      <Button className="w-full" size="sm" disabled={busy} onClick={() => void addEvent()}>
                        <Plus className="size-4" />
                        Agregar
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-1 rounded-md border">
                  {events.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">Sin incidencias todavía.</p>
                  ) : (
                    events.map((event) => (
                      <div key={event.id} className="flex items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0">
                        <Badge variant="secondary">{event.minute != null ? `${event.minute}'` : '—'}</Badge>
                        <span className="font-medium">{eventLabels[event.type]}</span>
                        <span className="min-w-0 flex-1 truncate text-muted-foreground">
                          {event.player
                            ? `${event.player.firstName} ${event.player.lastName}`
                            : `#${event.playerId}`}
                          {event.type === 'substitution' && event.relatedPlayer
                            ? ` → ${event.relatedPlayer.firstName} ${event.relatedPlayer.lastName}`
                            : ''}
                          {event.team ? ` · ${event.team.name}` : ''}
                        </span>
                        {!closed ? (
                          <Button size="sm" variant="ghost" onClick={() => void removeEvent(event.id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="notes" className="mt-3">
                <Field label="Observaciones generales">
                  <Textarea
                    rows={5}
                    disabled={closed}
                    value={meta.notes}
                    onChange={(e) => setMeta((m) => ({ ...m, notes: e.target.value }))}
                    placeholder="Clima, incidencias extra, reclamos…"
                  />
                </Field>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="gap-2 border-t pt-3 sm:gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void downloadPdf()}>
            <FileDown className="size-4" />
            PDF
          </Button>
          {!closed ? (
            <>
              <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void saveMeta()}>
                Guardar datos
              </Button>
              <Button type="button" size="sm" disabled={busy} onClick={() => void closePlanilla()}>
                Cerrar planilla y finalizar
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
