import {
  Building2,
  CalendarDays,
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Shield,
  Trophy,
} from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/app', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/app/tournaments', label: 'Mis torneos', icon: Trophy },
  { to: '/app/tenants', label: 'Organizaciones', icon: Building2 },
  { to: '/app/venues', label: 'Sedes', icon: MapPin },
  { to: '/app/matches', label: 'Partidos', icon: CalendarDays },
]

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          <item.icon className="size-4 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function TenantSwitcher() {
  const { user, tenant, switchTenant } = useAuth()
  const tenants = user?.tenants ?? []

  if (tenants.length === 0) {
    return <p className="px-2 text-xs text-muted-foreground">Sin inquilino</p>
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-auto w-full justify-between gap-2 px-2 py-1.5">
          <span className="min-w-0 truncate text-left">
            <span className="block text-[10px] font-normal text-muted-foreground">Inquilino</span>
            <span className="block truncate text-xs font-medium">{tenant?.name ?? 'Elegir'}</span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Tus organizaciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={() => {
              switchTenant(item)
              toast.message(`Contexto: ${item.name}`)
            }}
          >
            <span className="flex-1 truncate">{item.name}</span>
            {tenant?.id === item.id ? <BadgeDot /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BadgeDot() {
  return <span className="size-1.5 rounded-full bg-primary" />
}

export function AppShell() {
  const { user, tenant, logout, isSuperAdmin } = useAuth()

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r bg-sidebar lg:flex">
        {tenant?.loginImageUrl ? (
          <div className="relative h-24 shrink-0 overflow-hidden border-b">
            <img src={tenant.loginImageUrl} alt="" className="size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/20 to-transparent" />
          </div>
        ) : null}
        <div className="flex flex-1 flex-col px-3 py-3">
          <div className="px-2 py-1">
            <p className="text-sm font-semibold tracking-tight">Matchday</p>
            <p className="text-[11px] text-muted-foreground">Panel de organización</p>
          </div>
          {tenant ? (
            <div className="mt-2 flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5">
              {tenant.logoUrl ? (
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  className="size-8 shrink-0 rounded-md border object-cover"
                />
              ) : (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-xs font-semibold">
                  {tenant.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[10px] text-muted-foreground">Organización activa</p>
                <p className="truncate text-xs font-medium">{tenant.name}</p>
              </div>
            </div>
          ) : null}
          <div className="mt-3">
            <TenantSwitcher />
          </div>
          <Separator className="my-3" />
          {isSuperAdmin ? (
            <Button variant="outline" size="sm" className="mb-3 w-full justify-start gap-2" asChild>
              <Link to="/admin">
                <Shield className="size-3.5" />
                Volver a plataforma
              </Link>
            </Button>
          ) : null}
          <div className="flex-1">
            <NavItems />
          </div>
          <Separator className="my-3" />
          <div className="space-y-2 px-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => void logout()}
            >
              <LogOut className="size-3.5" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-3">
              <SheetHeader className="px-2 text-left">
                <SheetTitle>Matchday</SheetTitle>
              </SheetHeader>
              <div className="mt-3 space-y-3">
                <TenantSwitcher />
                <NavItems />
              </div>
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Matchday</p>
            <p className="truncate text-[11px] text-muted-foreground">{tenant?.name}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            Salir
          </Button>
        </header>

        <main className="flex-1 p-3 sm:p-4 lg:p-5">
          <Outlet key={tenant?.id ?? 'none'} />
        </main>
      </div>
    </div>
  )
}
