import { useEffect, useState } from 'react'
import { Building2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError, tenantsApi } from '@/api'
import { useAuth } from '@/auth/AuthProvider'
import { FormDialog } from '@/components/FormDialog'
import { ImageUploadField } from '@/components/ImageUploadField'
import { EmptyState, Field, PageHeader } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getErrorMessage } from '@/lib/utils'
import type { Tenant } from '@/types/domain'

export function TenantsPage() {
  const { tenant, switchTenant, refreshUser } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [brandingOpen, setBrandingOpen] = useState(false)
  const [editing, setEditing] = useState<Tenant | null>(null)
  const [branding, setBranding] = useState<Tenant | null>(null)
  const [busy, setBusy] = useState(false)
  const [brandingBusy, setBrandingBusy] = useState<'logo' | 'login' | null>(null)
  const [form, setForm] = useState({ name: '', slug: '' })

  async function load() {
    const res = await tenantsApi.list()
    setTenants(res.data)
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await load()
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

  function openEdit(item: Tenant) {
    setEditing(item)
    setForm({ name: item.name, slug: item.slug })
    setEditOpen(true)
  }

  function openBranding(item: Tenant) {
    setBranding(item)
    setBrandingOpen(true)
  }

  async function updateTenant() {
    if (!editing) return
    setBusy(true)
    try {
      await tenantsApi.update(editing.id, {
        name: form.name,
        slug: form.slug || null,
      })
      toast.success('Organización actualizada')
      setEditOpen(false)
      await refreshUser()
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Mi organización"
        description="Datos y marca de tu organización. Las altas nuevas las hace el administrador de la plataforma."
      />

      <Card>
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Cargando…</p>
        ) : tenants.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Sin organización asignada"
              description="Pedile al administrador de Matchday que cree tu organización y usuario."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[160px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((item) => {
                const isCurrent = tenant?.id === item.id
                return (
                  <TableRow key={item.id} data-state={isCurrent ? 'selected' : undefined}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-3.5 text-muted-foreground" />
                        {item.name}
                        {isCurrent ? <Badge variant="default">Activo</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.slug}</TableCell>
                    <TableCell>{item.isOwner ? 'Dueño' : 'Miembro'}</TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? 'secondary' : 'destructive'}>
                        {item.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {!isCurrent ? (
                          <Button size="sm" variant="outline" onClick={() => switchTenant(item)}>
                            Usar
                          </Button>
                        ) : null}
                        {item.isOwner ? (
                          <>
                            <Button size="icon-sm" variant="ghost" onClick={() => openBranding(item)}>
                              <Building2 className="size-3.5" />
                            </Button>
                            <Button size="icon-sm" variant="ghost" onClick={() => openEdit(item)}>
                              <Pencil className="size-3.5" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <FormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Editar organización"
        submitting={busy}
        submitLabel="Guardar"
        onSubmit={updateTenant}
      >
        <Field label="Nombre">
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </Field>
        <Field label="Slug">
          <Input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          />
        </Field>
      </FormDialog>

      <FormDialog
        open={brandingOpen}
        onOpenChange={setBrandingOpen}
        title="Marca de la organización"
        description="Logo e imagen de portada que se ven dentro del panel."
        submitting={brandingBusy != null}
        submitLabel="Cerrar"
        onSubmit={() => setBrandingOpen(false)}
      >
        {branding ? (
          <div className="space-y-4">
            <ImageUploadField
              label="Logo"
              hint="Se muestra en el panel cuando operás con esta organización."
              currentUrl={branding.logoUrl}
              aspect="square"
              busy={brandingBusy === 'logo'}
              onUpload={async (file) => {
                setBrandingBusy('logo')
                try {
                  const res = await tenantsApi.uploadLogo(branding.id, file)
                  setBranding(res.data)
                  await refreshUser()
                  await load()
                  toast.success('Logo actualizado')
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
                } finally {
                  setBrandingBusy(null)
                }
              }}
              onRemove={async () => {
                setBrandingBusy('logo')
                try {
                  const res = await tenantsApi.deleteLogo(branding.id)
                  setBranding(res.data)
                  await refreshUser()
                  await load()
                  toast.success('Logo eliminado')
                } catch (err) {
                  toast.error(getErrorMessage(err))
                } finally {
                  setBrandingBusy(null)
                }
              }}
            />
            <ImageUploadField
              label="Imagen de portada"
              hint="Banner decorativo en la barra lateral del panel."
              currentUrl={branding.loginImageUrl}
              aspect="portrait"
              busy={brandingBusy === 'login'}
              onUpload={async (file) => {
                setBrandingBusy('login')
                try {
                  const res = await tenantsApi.uploadLoginImage(branding.id, file)
                  setBranding(res.data)
                  await refreshUser()
                  toast.success('Imagen de portada actualizada')
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
                } finally {
                  setBrandingBusy(null)
                }
              }}
              onRemove={async () => {
                setBrandingBusy('login')
                try {
                  const res = await tenantsApi.deleteLoginImage(branding.id)
                  setBranding(res.data)
                  toast.success('Imagen de portada eliminada')
                } catch (err) {
                  toast.error(getErrorMessage(err))
                } finally {
                  setBrandingBusy(null)
                }
              }}
            />
          </div>
        ) : null}
      </FormDialog>
    </div>
  )
}
