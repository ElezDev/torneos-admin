import { useEffect, useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError, organizerApi } from '@/api'
import { useAuth } from '@/auth/AuthProvider'
import { DataTable } from '@/components/DataTable'
import { FormDialog } from '@/components/FormDialog'
import { Field, PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/utils'
import type { Venue } from '@/types/domain'

export function VenuesPage() {
  const { tenant } = useAuth()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', city: '', address: '' })

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

  async function onCreate() {
    setBusy(true)
    try {
      await organizerApi.venues.create({
        name: form.name,
        city: form.city || null,
        address: form.address || null,
      })
      toast.success('Sede creada')
      setOpen(false)
      setForm({ name: '', city: '', address: '' })
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const columns = useMemo<ColumnDef<Venue>[]>(
    () => [
      { accessorKey: 'name', header: 'Sede' },
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
    ],
    [],
  )

  return (
    <div>
      <PageHeader
        title="Sedes"
        description="Canchas y complejos del inquilino activo."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setForm({ name: '', city: '', address: '' })
              setOpen(true)
            }}
          >
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
            searchPlaceholder="Buscar sede o ciudad…"
            searchKeys={['name', 'city', 'address']}
            emptyMessage="Sin sedes todavía."
            toolbar={
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="size-4" />
                Nueva
              </Button>
            }
          />
        )}
      </Card>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Nueva sede"
        submitting={busy}
        submitLabel="Crear"
        onSubmit={onCreate}
      >
        <Field label="Nombre">
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </Field>
        <Field label="Ciudad">
          <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
        </Field>
        <Field label="Dirección">
          <Input
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
        </Field>
      </FormDialog>
    </div>
  )
}
