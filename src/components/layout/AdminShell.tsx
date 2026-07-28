import { Building2, LayoutDashboard, LogOut, Shield } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/admin', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/admin/tenants', label: 'Organizaciones', icon: Building2 },
]

export function AdminShell() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r bg-sidebar px-3 py-3 lg:flex">
        <div className="px-2 py-1">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <div>
              <p className="text-sm font-semibold tracking-tight">Matchday</p>
              <p className="text-[11px] text-muted-foreground">Panel de plataforma</p>
            </div>
          </div>
        </div>
        <Separator className="my-3" />
        <nav className="flex flex-1 flex-col gap-0.5">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
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
        <Separator className="my-3" />
        <div className="space-y-2 px-1">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">Super admin</p>
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
      </aside>

      <main className="flex-1 p-3 sm:p-4 lg:p-5">
        <Outlet />
      </main>
    </div>
  )
}
