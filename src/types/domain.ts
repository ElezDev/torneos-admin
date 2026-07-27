export type Tenant = {
  id: number
  name: string
  slug: string
  isActive: boolean
  isOwner?: boolean
}

export type User = {
  id: number
  name: string
  email: string
  roles?: string[]
  permissions?: string[]
  tenants?: Tenant[]
}

export type Sport = {
  id: number
  code: string
  name: string
  scoringLabel: string
  isActive: boolean
}

export type TournamentGroup = {
  id: number
  tournamentId: number
  name: string
  sortOrder: number
  teamsCount?: number
}

export type Tournament = {
  id: number
  tenantId: number
  sportId: number
  name: string
  slug: string
  format: 'league' | 'knockout' | 'groups'
  status: 'draft' | 'registration' | 'active' | 'finished' | 'cancelled'
  seasonLabel: string | null
  startsOn: string | null
  endsOn: string | null
  isPublic: boolean
  pointsConfig: Record<string, number>
  sanctionRules: Record<string, unknown>
  tiebreakerRules: string[]
  formatConfig: Record<string, unknown> | null
  sport?: Sport
  groups?: TournamentGroup[]
}

export type Venue = {
  id: number
  tenantId: number
  name: string
  address: string | null
  city: string | null
}

export type Team = {
  id: number
  tenantId: number
  tournamentId: number
  tournamentGroupId: number | null
  name: string
  shortName: string | null
  logoPath: string | null
  group?: TournamentGroup | null
  players?: Player[]
}

export type Player = {
  id: number
  tenantId: number
  teamId: number
  firstName: string
  lastName: string
  jerseyNumber: number | null
  documentId: string
  birthDate: string | null
  status: 'enabled' | 'suspended'
  yellowCardsCount: number
  redCardsCount: number
  suspensionMatchesLeft: number
  team?: Pick<Team, 'id' | 'name' | 'shortName'> & { tournamentId?: number }
}

export type GameMatch = {
  id: number
  tenantId: number
  tournamentId: number
  tournamentGroupId: number | null
  venueId: number | null
  homeTeamId: number | null
  awayTeamId: number | null
  homeFromMatchId?: number | null
  awayFromMatchId?: number | null
  homeFromResult?: 'winner' | 'loser' | null
  awayFromResult?: 'winner' | 'loser' | null
  matchday: number | null
  roundName: string | null
  stage: string
  bracketSlot?: number | null
  bracketCode?: string | null
  scheduledAt: string | null
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled'
  homeScore: number | null
  awayScore: number | null
  winnerTeamId: number | null
  notes: string | null
  refereeName?: string | null
  homePlaceholder?: string | null
  awayPlaceholder?: string | null
  homeTeam?: Team | null
  awayTeam?: Team | null
  venue?: Venue | null
  group?: TournamentGroup | null
}

export type Standing = {
  id: number
  tournamentId: number
  tournamentGroupId: number | null
  teamId: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  rankPosition: number | null
  team?: Team
}

export type ApiList<T> = { data: T[] }
export type ApiItem<T> = { data: T }

export type AuthResponse = {
  token: string
  tokenType: string
  expiresIn: number
  user: User
  tenant?: Tenant
}
