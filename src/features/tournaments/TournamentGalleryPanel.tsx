import { useEffect, useState } from 'react'
import { MessageSquarePlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError, organizerApi } from '@/api'
import { ImageUploadField } from '@/components/ImageUploadField'
import { Field } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime, getErrorMessage } from '@/lib/utils'
import type { GameMatch, Tournament, TournamentPost } from '@/types/domain'

type Props = {
  tournament: Tournament
  matches: GameMatch[]
  onTournamentChange: (tournament: Tournament) => void
}

export function TournamentGalleryPanel({ tournament, matches, onTournamentChange }: Props) {
  const [posts, setPosts] = useState<TournamentPost[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [bannerBusy, setBannerBusy] = useState(false)
  const [form, setForm] = useState({ caption: '', matchId: 'none', image: null as File | null })

  async function loadPosts() {
    const res = await organizerApi.tournaments.posts.list(tournament.id)
    setPosts(res.data)
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await loadPosts()
      } catch (err) {
        if (alive) toast.error(getErrorMessage(err))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [tournament.id])

  async function uploadBanner(file: File) {
    setBannerBusy(true)
    try {
      const res = await organizerApi.tournaments.uploadBanner(tournament.id, file)
      onTournamentChange(res.data)
      toast.success('Banner del torneo actualizado')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setBannerBusy(false)
    }
  }

  async function removeBanner() {
    setBannerBusy(true)
    try {
      const res = await organizerApi.tournaments.deleteBanner(tournament.id)
      onTournamentChange(res.data)
      toast.success('Banner eliminado')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBannerBusy(false)
    }
  }

  async function publishPost() {
    if (!form.caption.trim() && !form.image) {
      toast.error('Agrega una foto o un comentario')
      return
    }
    setBusy(true)
    try {
      await organizerApi.tournaments.posts.create(tournament.id, {
        caption: form.caption.trim() || undefined,
        matchId: form.matchId !== 'none' ? Number(form.matchId) : null,
        image: form.image,
      })
      setForm({ caption: '', matchId: 'none', image: null })
      await loadPosts()
      toast.success('Publicación agregada')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function deletePost(postId: number) {
    try {
      await organizerApi.tournaments.posts.remove(tournament.id, postId)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      toast.success('Publicación eliminada')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  function matchLabel(match: GameMatch) {
    const home = match.homeTeam?.name ?? match.homePlaceholder ?? 'Local'
    const away = match.awayTeam?.name ?? match.awayPlaceholder ?? 'Visitante'
    return `${home} vs ${away}`
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Banner del torneo</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploadField
            label="Imagen principal"
            hint="Opcional. Puedes usarlo en galería o en la vista pública; no se muestra a pantalla completa en el panel."
            currentUrl={tournament.bannerUrl}
            aspect="banner"
            busy={bannerBusy}
            onUpload={uploadBanner}
            onRemove={removeBanner}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquarePlus className="size-4" />
            Muro del torneo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Comentario">
            <Textarea
              value={form.caption}
              onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
              placeholder="Resumen de la fecha, foto grupal, premios…"
              rows={3}
            />
          </Field>

          <Field label="Vincular a partido (opcional)">
            <Select value={form.matchId} onValueChange={(v) => setForm((f) => ({ ...f, matchId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="General del torneo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">General del torneo</SelectItem>
                {matches.map((match) => (
                  <SelectItem key={match.id} value={String(match.id)}>
                    {matchLabel(match)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Imagen">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5"
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.files?.[0] ?? null }))}
            />
          </Field>

          <Button type="button" size="sm" disabled={busy} onClick={() => void publishPost()}>
            Publicar
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando publicaciones…</p>
      ) : posts.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no hay fotos ni notas. Subí la primera desde arriba.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden py-0">
              {post.imageUrl ? (
                <img src={post.imageUrl} alt="" className="aspect-video w-full object-cover" />
              ) : null}
              <CardContent className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium">{post.user?.name ?? 'Organizador'}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(post.createdAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => void deletePost(post.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                {post.caption ? <p className="text-sm leading-relaxed">{post.caption}</p> : null}
                {post.match ? (
                  <p className="text-xs text-muted-foreground">{matchLabel(post.match)}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
