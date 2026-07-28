import { formatDateTime, statusLabels } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { GameMatch } from '@/types/domain'

type BracketRound = {
  roundName: string
  matches: GameMatch[]
}

type Props = {
  rounds: BracketRound[]
  onManage?: (match: GameMatch) => void
}

function sideLabel(match: GameMatch, side: 'home' | 'away'): string {
  if (side === 'home') {
    return match.homeTeam?.name ?? match.homePlaceholder ?? 'Por definir'
  }
  return match.awayTeam?.name ?? match.awayPlaceholder ?? 'Por definir'
}

function MatchCard({
  match,
  onManage,
}: {
  match: GameMatch
  onManage?: (match: GameMatch) => void
}) {
  return (
    <Card className="w-[220px] gap-0 py-0 shadow-sm">
      <div className="flex items-center justify-between border-b px-2.5 py-1.5">
        <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          {match.bracketCode ?? `#${match.bracketSlot ?? match.id}`}
        </span>
        <Badge variant="secondary" className="h-5 text-[10px]">
          {statusLabels[match.status] ?? match.status}
        </Badge>
      </div>
      <div className="space-y-1 px-2.5 py-2">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate font-medium">{sideLabel(match, 'home')}</span>
          <span className="tabular-nums font-semibold">
            {match.homeScore != null ? match.homeScore : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate font-medium">{sideLabel(match, 'away')}</span>
          <span className="tabular-nums font-semibold">
            {match.awayScore != null ? match.awayScore : '—'}
          </span>
        </div>
        <p className="pt-1 text-[11px] text-muted-foreground">{formatDateTime(match.scheduledAt)}</p>
        {onManage ? (
          <Button size="sm" variant="outline" className="mt-1 h-7 w-full" onClick={() => onManage(match)}>
            Gestionar
          </Button>
        ) : null}
      </div>
    </Card>
  )
}

export function BracketView({ rounds, onManage }: Props) {
  if (!rounds.length) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Todavía no hay bracket. Genera el fixture de eliminación (4, 8 o 16 equipos).
      </p>
    )
  }

  return (
    <div className="overflow-x-auto p-3">
      <div className="flex min-w-max items-stretch gap-6">
        {rounds.map((round) => (
          <div key={round.roundName} className="flex flex-col">
            <p className="mb-3 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {round.roundName}
            </p>
            <div
              className="flex flex-1 flex-col justify-around gap-4"
              style={{ minHeight: Math.max(round.matches.length, 1) * 120 }}
            >
              {round.matches.map((match) => (
                <div key={match.id} className="relative flex items-center">
                  <MatchCard match={match} onManage={onManage} />
                  {round.roundName !== rounds[rounds.length - 1]?.roundName ? (
                    <div className="ml-2 h-px w-6 bg-border" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
