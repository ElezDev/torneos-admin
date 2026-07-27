import { useEffect, useState } from 'react'
import { Building2, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError, tenantsApi } from '@/api'
import { useAuth } from '@/auth/AuthProvider'
import { FormDialog } from '@/components/FormDialog'
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
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Tenant | null>(null)
  const [busy, setBusy] = useState(false)
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

  function openCreate() {
    setForm({ name: '', slug: '' })
    setCreateOpen(true)
  }

  function openEdit(item: Tenant) {
    setEditing(item)
    setForm({ name: item.name, slug: item.slug })
    setEditOpen(true)
  }

  async function createTenant() {
    setBusy(true)
    try {
      const res = await tenantsApi.create({
        name: form.name,
        slug: form.slug || null,
      })
      toast.success('Inquilino creado')
      setCreateOpen(false)
      await refreshUser()
      await load()
      switchTenant(res.data)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function updateTenant() {
    if (!editing) return
    setBusy(true)
    try {
      await tenantsApi.update(editing.id, {
        name: form.name,
        slug: form.slug || null,
      })
      toast.success('Inquilino actualizado')
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
        title="Inquilinos"
        description="Organizaciones dueñas de torneos, equipos y sedes. Cambiá el activo para operar en su contexto."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Nuevo inquilino
          </Button>
        }
      />

      <Card>
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Cargando…</p>
        ) : tenants.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Sin inquilinos"
              description="Creá una organización para empezar a gestionar torneos."
              action={
                <Button size="sm" onClick={openCreate}>
                  Crear inquilino
                </Button>
              }
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
                          <Button size="icon-sm" variant="ghost" onClick={() => openEdit(item)}>
                            <Pencil className="size-3.5" />
                          </Button>
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
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nuevo inquilino"
        description="Va a ser dueño de sus propios torneos y datos."
        submitting={busy}
        submitLabel="Crear"
        onSubmit={createTenant}
      >
        <Field label="Nombre de la organización">
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="Club Demo / Liga Norte"
          />
        </Field>
        <Field label="Slug (opcional)">
          <Input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="club-demo"
          />
        </Field>
      </FormDialog>

      <FormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Editar inquilino"
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
    </div>
  )
}
