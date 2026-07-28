import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError, adminApi } from '@/api'
import { useAuth } from '@/auth/AuthProvider'
import { FormDialog } from '@/components/FormDialog'
import { Field, PageHeader } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getErrorMessage } from '@/lib/utils'
import type { Tenant } from '@/types/domain'

export function AdminTenantsPage() {
  const navigate = useNavigate()
  const { enterOrganizerPortal } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
  })

  async function load() {
    const res = await adminApi.tenants.list()
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

  async function createTenant() {
    setCreating(true)
    try {
      await adminApi.tenants.create({
        name: form.name,
        slug: form.slug || null,
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail,
        ownerPassword: form.ownerPassword,
      })
      toast.success('Organización creada con su usuario de acceso')
      setCreateOpen(false)
      setForm({
        name: '',
        slug: '',
        ownerName: '',
        ownerEmail: '',
        ownerPassword: '',
      })
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  async function toggleActive(tenant: Tenant, active: boolean) {
    setBusyId(tenant.id)
    try {
      await adminApi.tenants.update(tenant.id, { isActive: active })
      await load()
      toast.success(active ? 'Organización activada' : 'Organización desactivada')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  function openOrganizerPanel(tenant: Tenant) {
    if (!tenant.isActive) {
      toast.error('Activa la organización antes de gestionarla')
      return
    }
    enterOrganizerPortal(tenant)
    navigate('/app/tournaments')
  }

  return (
    <div>
      <PageHeader
        title="Organizaciones"
        description="Cada organización tiene su propio usuario para ingresar en /login."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nueva organización
          </Button>
        }
      />

      <Card>
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organización</TableHead>
                <TableHead>Usuario dueño</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Torneos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[180px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>
                    {tenant.owner ? (
                      <div>
                        <p className="text-sm">{tenant.owner.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.owner.email}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin dueño</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                  <TableCell>{tenant.tournamentsCount ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === tenant.id}
                        onClick={() => void toggleActive(tenant, !tenant.isActive)}
                      >
                        {tenant.isActive ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Badge variant={tenant.isActive ? 'secondary' : 'destructive'}>
                        {tenant.isActive ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => openOrganizerPanel(tenant)}>
                      Gestionar
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nueva organización"
        description="Se crea la liga/club y un usuario organizador para que ingrese en /login."
        submitting={creating}
        submitLabel="Crear organización"
        onSubmit={createTenant}
      >
        <Field label="Nombre de la organización">
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Liga Barrial Norte"
            required
          />
        </Field>
        <Field label="Slug (opcional)">
          <Input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="liga-barrial-norte"
          />
        </Field>
        <Field label="Nombre del responsable">
          <Input
            value={form.ownerName}
            onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
            placeholder="Juan Pérez"
            required
          />
        </Field>
        <Field label="Email de acceso">
          <Input
            type="email"
            value={form.ownerEmail}
            onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))}
            placeholder="juan@ligabarrial.com"
            required
          />
        </Field>
        <Field label="Contraseña inicial">
          <Input
            type="password"
            value={form.ownerPassword}
            onChange={(e) => setForm((f) => ({ ...f, ownerPassword: e.target.value }))}
            placeholder="Mínimo 8 caracteres"
            required
          />
        </Field>
      </FormDialog>
    </div>
  )
}
