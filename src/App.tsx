import { Navigate, Route, Routes } from 'react-router-dom'
import {
  AdminGuestRoute,
  AdminProtectedRoute,
  OrganizerGuestRoute,
  OrganizerProtectedRoute,
} from '@/auth/RouteGuards'
import { AdminShell } from '@/components/layout/AdminShell'
import { AppShell } from '@/components/layout/AppShell'
import { AdminDashboardPage } from '@/features/admin/DashboardPage'
import { AdminTenantsPage } from '@/features/admin/TenantsPage'
import { AdminLoginPage, LoginPage } from '@/features/auth/pages'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { MatchesPage } from '@/features/matches/MatchesPage'
import { TenantsPage } from '@/features/tenants/TenantsPage'
import { TournamentDetailPage, TournamentListPage } from '@/features/tournaments/pages'
import { VenuesPage } from '@/features/venues/VenuesPage'

export default function App() {
  return (
    <Routes>
      <Route element={<OrganizerGuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<AdminGuestRoute />}>
        <Route path="/admin/login" element={<AdminLoginPage />} />
      </Route>

      <Route element={<OrganizerProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="tournaments" element={<TournamentListPage />} />
          <Route path="tournaments/:id" element={<TournamentDetailPage />} />
          <Route path="venues" element={<VenuesPage />} />
          <Route path="matches" element={<MatchesPage />} />
        </Route>
      </Route>

      <Route element={<AdminProtectedRoute />}>
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="tenants" element={<AdminTenantsPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
