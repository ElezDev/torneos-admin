import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ApiError, organizerApi } from '@/api'
import { ImageUploadField } from '@/components/ImageUploadField'
import { Field } from '@/components/shared'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { PlanillaDialog } from '@/features/tournaments/PlanillaDialog'
import { formatDateTime, getErrorMessage, statusLabels } from '@/lib/utils'
import type { GameMatch, Sport, Venue } from '@/types/domain'
import { sportLabels } from '@/lib/sport-labels'

type Props = {
  match: GameMatch | null
  venues: Venue[]
  sport?: Pick<Sport, 'code' | 'scoringLabel' | 'name'> | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void> | void
}

export function MatchManageDialog({ match, venues, sport, open, onOpenChange, onSaved }: Props) {
  const labels = sportLabels(sport)
  const [busy, setBusy] = useState(false)
  const [bannerBusy, setBannerBusy] = useState(false)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [planillaOpen, setPlanillaOpen] = useState(false)
  const [form, setForm] = useState({
    homeScore: '',
    awayScore: '',
    status: 'scheduled',
    venueId: 'none',
    scheduledAt: '',
    notes: '',
  })

  useEffect(() => {
    if (!match) return
    setForm({
      homeScore: match.homeScore != null ? String(match.homeScore) : '',
      awayScore: match.awayScore != null ? String(match.awayScore) : '',
      status: match.status,
      venueId: match.venueId != null ? String(match.venueId) : 'none',
      scheduledAt: match.scheduledAt ? match.scheduledAt.slice(0, 16) : '',
      notes: match.notes ?? '',
    })
    setBannerUrl(match.bannerUrl ?? null)
  }, [match])

  async function save(finish = false) {
    if (!match) return
    if (finish && (form.homeScore === '' || form.awayScore === '')) {
      toast.error('Cargá el marcador para finalizar')
      return
    }

    setBusy(true)
    try {
      await organizerApi.matches.update(match.id, {
        homeScore: form.homeScore === '' ? null : Number(form.homeScore),
        awayScore: form.awayScore === '' ? null : Number(form.awayScore),
        status: finish ? 'finished' : form.status,
        venueId: form.venueId === 'none' ? null : Number(form.venueId),
        scheduledAt: form.scheduledAt || null,
        notes: form.notes.trim() || null,
      })
      toast.success(finish ? 'Partido finalizado' : 'Partido actualizado')
      onOpenChange(false)
      await onSaved()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (!match) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gestionar partido</DialogTitle>
          <DialogDescription>
            {match.homeTeam?.name ?? match.homePlaceholder ?? 'Local'} vs{' '}
            {match.awayTeam?.name ?? match.awayPlaceholder ?? 'Visitante'}
            {match.group?.name ? ` · ${match.group.name}` : ''}
            {match.bracketSlot ? ` · Partido #${match.bracketSlot}` : ''}
            {match.scheduledAt ? ` · ${formatDateTime(match.scheduledAt)}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          <ImageUploadField
            label="Foto del partido"
            hint="Opcional · se ve compacta en el panel."
            currentUrl={bannerUrl}
            aspect="square"
            busy={bannerBusy}
            onUpload={async (file) => {
              if (!match) return
              setBannerBusy(true)
              try {
                const res = await organizerApi.matches.uploadBanner(match.id, file)
                setBannerUrl(res.data.bannerUrl ?? null)
                toast.success('Foto del partido actualizada')
                await onSaved()
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
              } finally {
                setBannerBusy(false)
              }
            }}
            onRemove={async () => {
              if (!match) return
              setBannerBusy(true)
              try {
                await organizerApi.matches.deleteBanner(match.id)
                setBannerUrl(null)
                toast.success('Foto eliminada')
                await onSaved()
              } catch (err) {
                toast.error(getErrorMessage(err))
              } finally {
                setBannerBusy(false)
              }
            }}
          />

          <div className="grid grid-cols-2 gap-3">
                <Field label={labels.scoreField(match.homeTeam?.shortName ?? match.homeTeam?.name ?? match.homePlaceholder ?? 'Local')}>
                  <Input
                    type="number"
                    min={0}
                    value={form.homeScore}
                    onChange={(e) => setForm((f) => ({ ...f, homeScore: e.target.value }))}
                  />
                </Field>
                <Field label={labels.scoreField(match.awayTeam?.shortName ?? match.awayTeam?.name ?? match.awayPlaceholder ?? 'Visitante')}>
                  <Input
                    type="number"
                    min={0}
                    value={form.awayScore}
                    onChange={(e) => setForm((f) => ({ ...f, awayScore: e.target.value }))}
                  />
                </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Estado">
              <Select value={form.status} onValueChange={(value) => setForm((f) => ({ ...f, status: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels)
                    .filter(([key]) =>
                      ['scheduled', 'live', 'finished', 'postponed', 'cancelled'].includes(key),
                    )
                    .map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sede">
              <Select value={form.venueId} onValueChange={(value) => setForm((f) => ({ ...f, venueId: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sede" />
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
          </div>

          <Field label="Fecha y hora">
            <Input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
            />
          </Field>

          <Field label="Observaciones">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Incidencias, clima, arbitraje, sanciones…"
              rows={4}
            />
          </Field>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setPlanillaOpen(true)}
            disabled={!match.homeTeamId || !match.awayTeamId}
          >
            Planillar
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void save(false)}>
            Guardar
          </Button>
          <Button type="button" size="sm" disabled={busy} onClick={() => void save(true)}>
            Finalizar rápido
          </Button>
        </DialogFooter>
      </DialogContent>

      <PlanillaDialog
        match={match}
        sport={sport}
        open={planillaOpen}
        onOpenChange={setPlanillaOpen}
        onSaved={async () => {
          await onSaved()
          onOpenChange(false)
        }}
      />
    </Dialog>
  )
}
