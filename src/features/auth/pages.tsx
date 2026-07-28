import { type FormEvent, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError } from '@/api'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/utils'

const HERO = '/auth/hero.svg'

export function AdminLoginPage() {
  const { loginAdmin } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await loginAdmin(email, password)
      toast.success('Sesión iniciada')
      navigate('/admin')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthScreen
      tone="admin"
      brand="Matchday"
      brandHint="Plataforma"
      headline="Panel de control"
      support="Administra organizaciones, accesos y el estado global del sistema."
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-[#10231b]">
            <Shield className="size-4 text-[#1f7a4d]" />
            Super admin
          </p>
          <p className="mt-1 text-sm text-[#5d7368]">Acceso exclusivo a la plataforma.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="admin-email" className="text-[#2d4339]">
            Email
          </Label>
          <Input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            className="h-11 border-[#d5e2db] bg-white/90"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="admin-password" className="text-[#2d4339]">
            Contraseña
          </Label>
          <Input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="h-11 border-[#d5e2db] bg-white/90"
          />
        </div>
        <Button
          type="submit"
          className="h-11 w-full bg-[#16382b] text-base text-white hover:bg-[#0f2a20]"
          disabled={submitting}
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthScreen>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    <AuthScreen
      tone="organizer"
      brand="Matchday"
      brandHint="Ligas y clubes"
      headline="Tu torneo, en orden"
      support="Entra para gestionar fixture, planillas, tabla y resultados de tu organización."
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div>
          <p className="auth-brand text-3xl leading-none text-[#10231b]">Iniciar sesión</p>
          <p className="mt-2 text-sm text-[#5d7368]">
            Usa el email y contraseña de tu organización.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email" className="text-[#2d4339]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-11 border-[#d5e2db] bg-white/90"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password" className="text-[#2d4339]">
            Contraseña
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="h-11 border-[#d5e2db] bg-white/90"
          />
        </div>
        <Button
          type="submit"
          className="h-11 w-full bg-[#1f7a4d] text-base text-white hover:bg-[#17663f]"
          disabled={submitting}
        >
          {submitting ? 'Entrando…' : 'Entrar al panel'}
        </Button>
      </form>
    </AuthScreen>
  )
}

function AuthScreen({
  brand,
  brandHint,
  headline,
  support,
  tone,
  children,
}: {
  brand: string
  brandHint: string
  headline: string
  support: string
  tone: 'organizer' | 'admin'
  children: ReactNode
}) {
  return (
    <div className="auth-screen relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <img src={HERO} alt="" className="auth-hero-media absolute inset-0 size-full object-cover" />
        <div
          className={`auth-wash absolute inset-0 ${
            tone === 'admin'
              ? 'bg-gradient-to-br from-[#071912]/80 via-[#0d2a1f]/55 to-[#16382b]/35'
              : 'bg-gradient-to-br from-[#071912]/70 via-[#0f3a28]/45 to-transparent'
          }`}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.16),transparent_42%)]" />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
        <section className="auth-copy flex flex-col justify-between px-8 py-10 text-white sm:px-12 lg:px-16 lg:py-14">
          <div>
            <p className="auth-brand text-5xl leading-none sm:text-6xl lg:text-7xl">{brand}</p>
            <p className="mt-2 text-sm font-medium tracking-wide text-white/75">{brandHint}</p>
          </div>

          <div className="mt-16 max-w-xl lg:mt-0">
            <h1 className="auth-brand text-4xl leading-[0.95] sm:text-5xl lg:text-6xl">{headline}</h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/80 sm:text-lg">
              {support}
            </p>
          </div>

          <p className="mt-16 text-xs tracking-[0.18em] uppercase text-white/55 lg:mt-0">
            Fixture · Planillas · Tabla · Galería
          </p>
        </section>

        <section className="flex items-end justify-center p-4 pb-8 sm:items-center sm:p-8 lg:justify-end lg:pr-16">
          <div className="auth-panel w-full max-w-[400px] rounded-2xl border border-white/50 bg-[#f4f7f3]/92 p-6 shadow-[0_24px_60px_-28px_rgba(7,25,18,0.55)] backdrop-blur-md sm:p-8">
            {children}
          </div>
        </section>
      </div>
    </div>
  )
}
