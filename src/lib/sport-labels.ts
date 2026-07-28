import type { Sport } from '@/types/domain'

export type ScoringKind = 'goals' | 'points' | 'sets'

export type SportLabels = {
  scoringKind: ScoringKind
  /** Singular unit: Gol, Punto, Set */
  unit: string
  /** Plural: Goles, Puntos, Sets */
  unitPlural: string
  /** Label for score input: "Goles VOL" */
  scoreField: (teamLabel: string) => string
  /** Standings column headers */
  forShort: string
  againstShort: string
  diffShort: string
  forLong: string
  againstLong: string
  diffLong: string
  /** Scorers board */
  scorersTitle: string
  scorersEmpty: string
  scorersColumn: string
  /** Planilla event */
  scoreEvent: string
  ownScoreEvent: string
}

const LABELS: Record<ScoringKind, Omit<SportLabels, 'scoringKind' | 'scoreField'>> = {
  goals: {
    unit: 'Gol',
    unitPlural: 'Goles',
    forShort: 'GF',
    againstShort: 'GC',
    diffShort: 'DG',
    forLong: 'Goles a favor',
    againstLong: 'Goles en contra',
    diffLong: 'Diferencia de goles',
    scorersTitle: 'Top goleadores',
    scorersEmpty: 'Todavía no hay goles cargados en planillas.',
    scorersColumn: 'Goles',
    scoreEvent: 'Gol',
    ownScoreEvent: 'Autogol',
  },
  points: {
    unit: 'Punto',
    unitPlural: 'Puntos',
    forShort: 'PF',
    againstShort: 'PC',
    diffShort: 'DP',
    forLong: 'Puntos a favor',
    againstLong: 'Puntos en contra',
    diffLong: 'Diferencia de puntos',
    scorersTitle: 'Máximos anotadores',
    scorersEmpty: 'Todavía no hay puntos cargados en planillas.',
    scorersColumn: 'Puntos',
    scoreEvent: 'Punto',
    ownScoreEvent: 'Punto en contra',
  },
  sets: {
    unit: 'Set',
    unitPlural: 'Sets',
    forShort: 'SF',
    againstShort: 'SC',
    diffShort: 'DS',
    forLong: 'Sets a favor',
    againstLong: 'Sets en contra',
    diffLong: 'Diferencia de sets',
    scorersTitle: 'Rendimiento',
    scorersEmpty: 'Todavía no hay anotaciones cargadas en planillas.',
    scorersColumn: 'Anotaciones',
    scoreEvent: 'Punto',
    ownScoreEvent: 'Punto en contra',
  },
}

export function resolveScoringKind(
  sport?: Pick<Sport, 'code' | 'scoringLabel'> | null,
): ScoringKind {
  const code = sport?.code?.toLowerCase()
  if (code === 'volleyball' || code === 'voley' || code === 'voleibol') {
    return 'sets'
  }

  const label = (sport?.scoringLabel ?? 'goals').toLowerCase()
  if (label === 'sets' || label === 'points' || label === 'goals') {
    return label
  }

  return 'goals'
}

export function sportLabels(
  sport?: Pick<Sport, 'code' | 'scoringLabel'> | null,
): SportLabels {
  const scoringKind = resolveScoringKind(sport)
  const base = LABELS[scoringKind]

  return {
    scoringKind,
    ...base,
    scoreField: (teamLabel: string) => `${base.unitPlural} ${teamLabel}`,
  }
}
