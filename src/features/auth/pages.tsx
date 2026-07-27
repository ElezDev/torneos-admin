import { type FormEvent, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiError } from '@/api'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/utils'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('org@torneos.test')
  const [password, setPassword] = useState('password123')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await login(email, password)
      toast.success('Sesión iniciada')
      navigate('/app/tournaments')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFrame title="Panel de organización" subtitle="Gestioná torneos, equipos y partidos.">
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Iniciar sesión</CardTitle>
          <CardDescription>Usá tu cuenta de organizador.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </Button>
            <p className="rounded-md bg-muted px-2.5 py-2 text-center text-[11px] leading-relaxed text-muted-foreground">
              Demo: <span className="font-medium text-foreground">org@torneos.test</span> /{' '}
              <span className="font-medium text-foreground">password123</span>
              <br />
              Abrí el panel en <span className="font-medium text-foreground">http://localhost:5173</span>
            </p>
            <p className="text-center text-xs text-muted-foreground">
              ¿No tenés cuenta?{' '}
              <Link className="font-medium text-primary hover:underline" to="/register">
                Crear organización
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </AuthFrame>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    tenantName: '',
  })
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await register(form)
      toast.success('Cuenta creada')
      navigate('/app')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFrame title="Creá tu organización" subtitle="Empezá a gestionar torneos en minutos.">
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Registro</CardTitle>
          <CardDescription>Tu cuenta + tu club/liga.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="grid gap-1.5">
              <Label>Tu nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Organización</Label>
              <Input
                value={form.tenantName}
                onChange={(e) => setForm((f) => ({ ...f, tenantName: e.target.value }))}
                required
                placeholder="Liga Barrial Norte"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Confirmar</Label>
                <Input
                  type="password"
                  value={form.passwordConfirmation}
                  onChange={(e) => setForm((f) => ({ ...f, passwordConfirmation: e.target.value }))}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creando…' : 'Crear cuenta'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              ¿Ya tenés cuenta?{' '}
              <Link className="font-medium text-primary hover:underline" to="/login">
                Iniciar sesión
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </AuthFrame>
  )
}

function AuthFrame({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_420px]">
      <section className="relative hidden overflow-hidden bg-foreground px-8 py-8 text-background lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-lg font-semibold">TorneosApp</p>
          <p className="mt-1 text-xs text-background/60">Ligas amateur</p>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-background/70">{subtitle}</p>
        </div>
        <p className="text-xs text-background/45">Fixture · Planillas · Tabla · Stats</p>
      </section>
      <section className="flex items-center justify-center bg-background p-4">{children}</section>
    </div>
  )
}
