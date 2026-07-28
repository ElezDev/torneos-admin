import type {
  ApiItem,
  ApiList,
  AuthResponse,
  GameMatch,
  Player,
  Sport,
  Standing,
  Team,
  Tenant,
  TenantBranding,
  Tournament,
  TournamentGroup,
  TournamentPost,
  User,
  Venue,
} from '@/types/domain'
import { ApiError, api, getTenantId, setTenantId, setToken, uploadMultipart } from '@/api/client'

export { ApiError, getTenantId, setTenantId, setToken }

export type TournamentOverview = {
  tournament: Tournament
  summary: {
    teamsCount: number
    playersCount: number
    matchesCount: number
    matchesScheduled: number
    matchesFinished: number
    venuesUsed: number
  }
  standings: Standing[]
  standingsByGroup: Array<{
    group: { id: number; name: string; sortOrder: number }
    standings: Standing[]
  }>
  scorers: Array<{ playerId: number; goals: number; player: Player | null }>
  cardLeaders: Player[]
  upcomingMatches: GameMatch[]
  bracketRounds: Array<{
    roundName: string
    matches: GameMatch[]
  }>
}

export type FixtureGeneratePayload = {
  startDate: string
  kickoffTime: string
  daysBetweenMatchdays: number
  legs: 1 | 2
  venueIds: number[]
  clearExisting: boolean
  matchIntervalMinutes: number
  groupCount?: number
  distributeTeams?: boolean
  shuffleTeams?: boolean
  includeThirdPlace?: boolean
  mode?: 'league' | 'groups' | 'knockout'
}

export type FixtureGenerateResult = {
  message: string
  data: {
    matchesCreated: number
    matchdays: number
    groupsCreated?: number
    bracketRounds?: Array<{
      roundName: string
      matches: GameMatch[]
    }>
    matches: GameMatch[]
  }
}

export const authApi = {
  login: (payload: { email: string; password: string }) =>
    api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    }),

  me: () => api<ApiItem<User> | User>('/auth/me'),
  logout: () => api('/auth/logout', { method: 'POST' }),
  refresh: () => api<AuthResponse>('/auth/refresh', { method: 'POST' }),
}

export const catalogApi = {
  sports: () => api<ApiList<Sport>>('/sports', { skipAuth: true }),
  tenantBranding: (slug: string) =>
    api<ApiItem<TenantBranding>>(`/public/tenants/${slug}/branding`, { skipAuth: true }),
}

export const tenantsApi = {
  list: () => api<ApiList<Tenant>>('/tenants'),
  update: (id: number | string, payload: Record<string, unknown>) =>
    api<ApiItem<Tenant>>(`/tenants/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  get: (id: number | string) => api<ApiItem<Tenant>>(`/tenants/${id}`),
  uploadLogo: (id: number | string, file: File) => {
    const form = new FormData()
    form.append('image', file)
    return uploadMultipart<ApiItem<Tenant>>(`/tenants/${id}/branding/logo`, form)
  },
  uploadLoginImage: (id: number | string, file: File) => {
    const form = new FormData()
    form.append('image', file)
    return uploadMultipart<ApiItem<Tenant>>(`/tenants/${id}/branding/login-image`, form)
  },
  deleteLogo: (id: number | string) =>
    api<ApiItem<Tenant>>(`/tenants/${id}/branding/logo`, { method: 'DELETE' }),
  deleteLoginImage: (id: number | string) =>
    api<ApiItem<Tenant>>(`/tenants/${id}/branding/login-image`, { method: 'DELETE' }),
}

export const adminApi = {
  overview: () =>
    api<{
      data: {
        summary: {
          tenantsCount: number
          activeTenants: number
          tournamentsCount: number
          usersCount: number
        }
        tenants: Tenant[]
      }
    }>('/admin/overview'),
  tenants: {
    list: () => api<ApiList<Tenant>>('/admin/tenants'),
    create: (payload: {
      name: string
      slug?: string | null
      ownerName: string
      ownerEmail: string
      ownerPassword: string
    }) =>
      api<ApiItem<Tenant>>('/admin/tenants', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: number | string, payload: Record<string, unknown>) =>
      api<ApiItem<Tenant>>(`/admin/tenants/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  },
}

export const organizerApi = {
  tournaments: {
    list: () => api<ApiList<Tournament>>('/tournaments'),
    create: (payload: Record<string, unknown>) =>
      api<ApiItem<Tournament>>('/tournaments', { method: 'POST', body: JSON.stringify(payload) }),
    get: (id: number | string) => api<ApiItem<Tournament>>(`/tournaments/${id}`),
    update: (id: number | string, payload: Record<string, unknown>) =>
      api<ApiItem<Tournament>>(`/tournaments/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    remove: (id: number | string) => api(`/tournaments/${id}`, { method: 'DELETE' }),
    overview: (id: number | string) =>
      api<ApiItem<TournamentOverview>>(`/tournaments/${id}/overview`),
    generateFixture: (id: number | string, payload: FixtureGeneratePayload) =>
      api<FixtureGenerateResult>(`/tournaments/${id}/generate-fixture`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    groups: {
      list: (tournamentId: number | string) =>
        api<ApiList<TournamentGroup>>(`/tournaments/${tournamentId}/groups`),
      create: (tournamentId: number | string, payload: { name: string; sortOrder?: number }) =>
        api<ApiItem<TournamentGroup>>(`/tournaments/${tournamentId}/groups`, {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      update: (
        tournamentId: number | string,
        groupId: number | string,
        payload: { name?: string; sortOrder?: number },
      ) =>
        api<ApiItem<TournamentGroup>>(`/tournaments/${tournamentId}/groups/${groupId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        }),
      remove: (tournamentId: number | string, groupId: number | string) =>
        api(`/tournaments/${tournamentId}/groups/${groupId}`, { method: 'DELETE' }),
    },
    uploadBanner: (id: number | string, file: File) => {
      const form = new FormData()
      form.append('image', file)
      return uploadMultipart<ApiItem<Tournament>>(`/tournaments/${id}/banner`, form)
    },
    deleteBanner: (id: number | string) =>
      api<ApiItem<Tournament>>(`/tournaments/${id}/banner`, { method: 'DELETE' }),
    posts: {
      list: (tournamentId: number | string) =>
        api<ApiList<TournamentPost>>(`/tournaments/${tournamentId}/posts`),
      create: (
        tournamentId: number | string,
        payload: { caption?: string; matchId?: number | null; image?: File | null },
      ) => {
        const form = new FormData()
        if (payload.caption) form.append('caption', payload.caption)
        if (payload.matchId) form.append('matchId', String(payload.matchId))
        if (payload.image) form.append('image', payload.image)
        return uploadMultipart<ApiItem<TournamentPost>>(`/tournaments/${tournamentId}/posts`, form)
      },
      remove: (tournamentId: number | string, postId: number | string) =>
        api(`/tournaments/${tournamentId}/posts/${postId}`, { method: 'DELETE' }),
    },
  },
  venues: {
    list: () => api<ApiList<Venue>>('/venues'),
    create: (payload: Record<string, unknown>) =>
      api<ApiItem<Venue>>('/venues', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: number | string, payload: Record<string, unknown>) =>
      api<ApiItem<Venue>>(`/venues/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    remove: (id: number | string) => api(`/venues/${id}`, { method: 'DELETE' }),
  },
  teams: {
    list: (tournamentId?: number | string) =>
      api<ApiList<Team>>(`/teams${tournamentId ? `?tournamentId=${tournamentId}` : ''}`),
    create: (payload: Record<string, unknown>) =>
      api<ApiItem<Team>>('/teams', { method: 'POST', body: JSON.stringify(payload) }),
    get: (id: number | string) => api<ApiItem<Team>>(`/teams/${id}`),
    update: (id: number | string, payload: Record<string, unknown>) =>
      api<ApiItem<Team>>(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    remove: (id: number | string) => api(`/teams/${id}`, { method: 'DELETE' }),
  },
  players: {
    list: (params?: { teamId?: number | string; tournamentId?: number | string; search?: string }) => {
      const query = new URLSearchParams()
      if (params?.teamId) query.set('teamId', String(params.teamId))
      if (params?.tournamentId) query.set('tournamentId', String(params.tournamentId))
      if (params?.search) query.set('search', params.search)
      const qs = query.toString()
      return api<ApiList<Player>>(`/players${qs ? `?${qs}` : ''}`)
    },
    create: (payload: Record<string, unknown>) =>
      api<ApiItem<Player>>('/players', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: number | string, payload: Record<string, unknown>) =>
      api<ApiItem<Player>>(`/players/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    remove: (id: number | string) => api(`/players/${id}`, { method: 'DELETE' }),
  },
  matches: {
    list: (tournamentId?: number | string) =>
      api<ApiList<GameMatch>>(`/matches${tournamentId ? `?tournamentId=${tournamentId}` : ''}`),
    create: (payload: Record<string, unknown>) =>
      api<ApiItem<GameMatch>>('/matches', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: number | string, payload: Record<string, unknown>) =>
      api<ApiItem<GameMatch>>(`/matches/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    remove: (id: number | string) => api(`/matches/${id}`, { method: 'DELETE' }),
    uploadBanner: (id: number | string, file: File) => {
      const form = new FormData()
      form.append('image', file)
      return uploadMultipart<ApiItem<GameMatch>>(`/matches/${id}/banner`, form)
    },
    deleteBanner: (id: number | string) =>
      api<ApiItem<GameMatch>>(`/matches/${id}/banner`, { method: 'DELETE' }),
    planilla: {
      get: (matchId: number | string) =>
        api<{
          data: {
            match: GameMatch
            sheets: MatchSheet[]
            events: MatchEventRow[]
            roster: Record<string, Player[]>
          }
        }>(`/matches/${matchId}/planilla`),
      updateMeta: (matchId: number | string, payload: Record<string, unknown>) =>
        api(`/matches/${matchId}/planilla`, { method: 'PUT', body: JSON.stringify(payload) }),
      syncLineup: (
        matchId: number | string,
        teamId: number | string,
        players: Array<{ playerId: number; jerseyNumber?: number | null; isStarter: boolean }>,
      ) =>
        api(`/matches/${matchId}/planilla/teams/${teamId}/lineup`, {
          method: 'PUT',
          body: JSON.stringify({ players }),
        }),
      addEvent: (matchId: number | string, payload: Record<string, unknown>) =>
        api<ApiItem<MatchEventRow>>(`/matches/${matchId}/planilla/events`, {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      removeEvent: (matchId: number | string, eventId: number | string) =>
        api(`/matches/${matchId}/planilla/events/${eventId}`, { method: 'DELETE' }),
      close: (matchId: number | string, payload?: { notes?: string }) =>
        api(`/matches/${matchId}/planilla/close`, {
          method: 'POST',
          body: JSON.stringify(payload ?? {}),
        }),
      downloadPdf: async (matchId: number | string) => {
        const { getToken, getTenantId } = await import('@/api/client')
        const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
        const headers = new Headers({ Accept: 'application/pdf' })
        const token = getToken()
        const tenantId = getTenantId()
        if (token) headers.set('Authorization', `Bearer ${token}`)
        if (tenantId) headers.set('X-Tenant-Id', tenantId)
        const res = await fetch(`${API_URL}/matches/${matchId}/planilla/pdf`, { headers })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new ApiError(res.status, body)
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `planilla-${matchId}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      },
    },
  },
}

export type MatchSheet = {
  id: number
  matchId: number
  teamId: number
  status: 'draft' | 'closed'
  delegateName?: string | null
  observations?: string | null
  team?: Team
  players?: Array<{
    id: number
    playerId: number
    jerseyNumber: number | null
    isStarter: boolean
    player: Player | null
  }>
}

export type MatchEventRow = {
  id: number
  matchId: number
  teamId: number
  playerId: number
  relatedPlayerId?: number | null
  type: 'goal' | 'ownGoal' | 'yellowCard' | 'redCard' | 'secondYellow' | 'substitution'
  minute: number | null
  notes: string | null
  player?: Player | null
  relatedPlayer?: Player | null
  team?: Team | null
}

export function unwrapItem<T>(payload: ApiItem<T> | T): T {
  return payload && typeof payload === 'object' && 'data' in payload
    ? (payload as ApiItem<T>).data
    : (payload as T)
}
