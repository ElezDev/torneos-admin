import { useEffect, useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError, organizerApi } from '@/api'
import { useAuth } from '@/auth/AuthProvider'
import { DataTable } from '@/components/DataTable'
import { FormDialog } from '@/components/FormDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Field, PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/SearchableSelect'
import { COLOMBIA_DEPARTMENTS, citiesForDepartment } from '@/data/colombia-locations'
import { getErrorMessage } from '@/lib/utils'
import type { Venue } from '@/types/domain'

type VenueForm = {
  name: string
  department: string
  city: string
  address: string
}

const emptyForm = (): VenueForm => ({
  name: '',
  department: '',
  city: '',
  address: '',
})

export function VenuesPage() {
  const { tenant } = useAuth()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<Venue | null>(null)
  const [deleting, setDeleting] = useState<Venue | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [form, setForm] = useState<VenueForm>(emptyForm)

  const cities = useMemo(() => citiesForDepartment(form.department), [form.department])

  const departmentOptions = useMemo(
    () => COLOMBIA_DEPARTMENTS.map((dept) => ({ value: dept.name, label: dept.name })),
    [],
  )

  const cityOptions = useMemo(
    () => cities.map((city) => ({ value: city, label: city })),
    [cities],
  )

  async function load() {
    const res = await organizerApi.venues.list()
    setVenues(res.data)
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!tenant?.id) {
        setLoading(false)
        return
      }
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
  }, [tenant?.id])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setOpen(true)
  }

  function openEdit(venue: Venue) {
    setEditing(venue)
    setForm({
      name: venue.name,
      department: venue.department ?? '',
      city: venue.city ?? '',
      address: venue.address ?? '',
    })
    setOpen(true)
  }

  async function onSubmit() {
    if (!form.name.trim()) {
      toast.error('El nombre de la sede es obligatorio.')
      return
    }

    setBusy(true)
    try {
      const payload = {
        name: form.name.trim(),
        department: form.department || null,
        city: form.city || null,
        address: form.address.trim() || null,
      }

      if (editing) {
        await organizerApi.venues.update(editing.id, payload)
        toast.success('Sede actualizada')
      } else {
        await organizerApi.venues.create(payload)
        toast.success('Sede creada')
      }

      setOpen(false)
      setEditing(null)
      setForm(emptyForm())
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await organizerApi.venues.remove(deleting.id)
      toast.success('Sede eliminada')
      setDeleting(null)
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setDeletingBusy(false)
    }
  }

  const columns = useMemo<ColumnDef<Venue>[]>(
    () => [
      { accessorKey: 'name', header: 'Sede' },
      {
        accessorKey: 'department',
        header: 'Departamento',
        cell: ({ row }) => row.original.department ?? '—',
      },
      {
        accessorKey: 'city',
        header: 'Ciudad',
        cell: ({ row }) => row.original.city ?? '—',
      },
      {
        accessorKey: 'address',
        header: 'Dirección',
        cell: ({ row }) => row.original.address ?? '—',
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => openEdit(row.original)}
              title="Editar"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setDeleting(row.original)}
              title="Eliminar"
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div>
      <PageHeader
        title="Sedes"
        description="Canchas y complejos en cualquier departamento de Colombia."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Nueva sede
          </Button>
        }
      />

      <Card>
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <DataTable
            columns={columns}
            data={venues}
            searchPlaceholder="Buscar sede, ciudad o departamento…"
            searchKeys={['name', 'city', 'department', 'address']}
            emptyMessage="Sin sedes todavía."
            toolbar={
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" />
                Nueva
              </Button>
            }
          />
        )}
      </Card>

      <FormDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setEditing(null)
            setForm(emptyForm())
          }
        }}
        title={editing ? 'Editar sede' : 'Nueva sede'}
        description="Elegí departamento y ciudad para ubicar la sede a nivel nacional."
        submitting={busy}
        submitLabel={editing ? 'Guardar' : 'Crear'}
        onSubmit={onSubmit}
      >
        <Field label="Nombre">
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Estadio, coliseo, cancha…"
            required
          />
        </Field>

        <Field label="Departamento">
          <SearchableSelect
            value={form.department || undefined}
            onValueChange={(value) =>
              setForm((f) => ({
                ...f,
                department: value,
                city: '',
              }))
            }
            options={departmentOptions}
            placeholder="Seleccionar departamento"
            searchPlaceholder="Buscar departamento…"
          />
        </Field>

        <Field label="Ciudad / municipio">
          <SearchableSelect
            value={form.city || undefined}
            onValueChange={(value) => setForm((f) => ({ ...f, city: value }))}
            options={cityOptions}
            placeholder={form.department ? 'Seleccionar ciudad' : 'Primero elegí departamento'}
            searchPlaceholder="Buscar ciudad…"
            disabled={!form.department}
          />
        </Field>

        <Field label="Dirección">
          <Input
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Calle, barrio, referencia…"
          />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(next) => {
          if (!next && !deletingBusy) setDeleting(null)
        }}
        title="Eliminar sede"
        description={
          deleting
            ? `¿Seguro que querés eliminar “${deleting.name}”? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        confirming={deletingBusy}
        onConfirm={onDelete}
      />
    </div>
  )
}
