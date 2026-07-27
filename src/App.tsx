import { Navigate, Route, Routes } from 'react-router-dom'
import { GuestRoute, ProtectedRoute } from '@/auth/RouteGuards'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage, RegisterPage } from '@/features/auth/pages'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { MatchesPage } from '@/features/matches/MatchesPage'
import { TenantsPage } from '@/features/tenants/TenantsPage'
import { TournamentDetailPage, TournamentListPage } from '@/features/tournaments/pages'
import { VenuesPage } from '@/features/venues/VenuesPage'

export default function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="tournaments" element={<TournamentListPage />} />
          <Route path="tournaments/:id" element={<TournamentDetailPage />} />
          <Route path="venues" element={<VenuesPage />} />
          <Route path="matches" element={<MatchesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/app/tournaments" replace />} />
    </Routes>
  )
}
