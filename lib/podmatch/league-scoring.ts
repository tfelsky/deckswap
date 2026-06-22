// PodMatch league scoring (spec Feature H).
//
// Deterministic, configurable, and fully auditable: points come only from the
// recorded game fields and the league's scoring config, so standings can
// always be recomputed from raw game records.

export type ScoringConfig = {
  placement: Record<string, number> // "1".."4" -> points
  elimination: number
  first_blood: number
  survived_final_two: number
  sportsmanship: number
  combo_win: number
  achievement: number
  no_show: number
}

export const CASUAL_BALANCED: ScoringConfig = {
  placement: { '1': 5, '2': 3, '3': 2, '4': 1 },
  elimination: 1,
  first_blood: 1,
  survived_final_two: 1,
  sportsmanship: 1,
  combo_win: 0,
  achievement: 1,
  no_show: -3,
}

export function resolveScoringConfig(settings: unknown): ScoringConfig {
  const provided =
    settings && typeof settings === 'object' && 'scoring' in (settings as Record<string, unknown>)
      ? ((settings as Record<string, unknown>).scoring as Partial<ScoringConfig>)
      : undefined
  if (!provided) return CASUAL_BALANCED
  return {
    placement: { ...CASUAL_BALANCED.placement, ...(provided.placement ?? {}) },
    elimination: provided.elimination ?? CASUAL_BALANCED.elimination,
    first_blood: provided.first_blood ?? CASUAL_BALANCED.first_blood,
    survived_final_two: provided.survived_final_two ?? CASUAL_BALANCED.survived_final_two,
    sportsmanship: provided.sportsmanship ?? CASUAL_BALANCED.sportsmanship,
    combo_win: provided.combo_win ?? CASUAL_BALANCED.combo_win,
    achievement: provided.achievement ?? CASUAL_BALANCED.achievement,
    no_show: provided.no_show ?? CASUAL_BALANCED.no_show,
  }
}

export type GamePlayerResult = {
  player_id: string
  placement: number | null
  eliminations: number
  combo_win: boolean
  no_show: boolean
  sportsmanship: boolean
  first_blood?: boolean
  achievement_count?: number
}

export type PointsBreakdown = { label: string; points: number }

/** Soft-handicap adjustment applied to one player's bonus points. */
export type HandicapApplication = { bonusMultiplier: number; catchUpBonus: number }

/** Compute the points for one player's game line, with an audit trail. */
export function scoreGamePlayer(
  result: GamePlayerResult,
  podSize: number,
  config: ScoringConfig,
  handicap?: HandicapApplication
): { total: number; breakdown: PointsBreakdown[] } {
  if (result.no_show) {
    return { total: config.no_show, breakdown: [{ label: 'No-show', points: config.no_show }] }
  }

  // Base (placement) points are never reduced by a handicap; only bonus points
  // are scaled, so a leader's win still counts in full.
  const base: PointsBreakdown[] = []
  const bonus: PointsBreakdown[] = []

  if (result.placement != null) {
    const placementPoints = config.placement[String(result.placement)] ?? 0
    if (placementPoints !== 0) {
      const labels: Record<number, string> = { 1: 'Win', 2: 'Second', 3: 'Third', 4: 'Fourth' }
      base.push({
        label: labels[result.placement] ?? `Placement ${result.placement}`,
        points: placementPoints,
      })
    }
    if (result.placement <= 2 && podSize >= 3 && config.survived_final_two) {
      bonus.push({ label: 'Survived to final two', points: config.survived_final_two })
    }
  }

  if (result.eliminations > 0 && config.elimination) {
    bonus.push({
      label: `Eliminations ×${result.eliminations}`,
      points: result.eliminations * config.elimination,
    })
  }
  if (result.first_blood && config.first_blood) {
    bonus.push({ label: 'First blood', points: config.first_blood })
  }
  if (result.combo_win && config.combo_win) {
    bonus.push({ label: 'Combo win', points: config.combo_win })
  }
  if (result.sportsmanship && config.sportsmanship) {
    bonus.push({ label: 'Sportsmanship vote', points: config.sportsmanship })
  }
  if (result.achievement_count && result.achievement_count > 0 && config.achievement) {
    bonus.push({
      label: `Achievement goals x${result.achievement_count}`,
      points: result.achievement_count * config.achievement,
    })
  }

  const multiplier = handicap?.bonusMultiplier ?? 1
  const scaledBonus =
    multiplier === 1
      ? bonus
      : bonus.map((row) => ({
          label: `${row.label} (×${multiplier})`,
          points: Math.round(row.points * multiplier * 10) / 10,
        }))

  const breakdown = [...base, ...scaledBonus]
  if (handicap && handicap.catchUpBonus > 0) {
    breakdown.push({ label: 'Catch-up bonus', points: handicap.catchUpBonus })
  }

  const total = Math.round(breakdown.reduce((sum, row) => sum + row.points, 0) * 10) / 10
  return { total, breakdown }
}

// ---- Standings -------------------------------------------------------------

export type StandingsGameLine = {
  player_id: string
  placement: number | null
  points_awarded: number
}

export type StandingsRow = {
  player_id: string
  display_name: string
  points: number
  wins: number
  games: number
  average_placement: number | null
  rank: number
}

/**
 * Aggregate finalized game lines into ranked standings. Ties break by wins,
 * then by average placement (lower is better), then name, for stable order.
 */
export function calculateStandings(
  lines: StandingsGameLine[],
  players: { id: string; display_name: string }[]
): StandingsRow[] {
  const byPlayer = new Map<
    string,
    { points: number; wins: number; games: number; placementSum: number; placementCount: number }
  >()

  for (const player of players) {
    byPlayer.set(player.id, {
      points: 0,
      wins: 0,
      games: 0,
      placementSum: 0,
      placementCount: 0,
    })
  }

  for (const line of lines) {
    const agg = byPlayer.get(line.player_id)
    if (!agg) continue
    agg.points += Number(line.points_awarded) || 0
    agg.games += 1
    if (line.placement === 1) agg.wins += 1
    if (line.placement != null) {
      agg.placementSum += line.placement
      agg.placementCount += 1
    }
  }

  const rows = players.map((player) => {
    const agg = byPlayer.get(player.id)!
    return {
      player_id: player.id,
      display_name: player.display_name,
      points: Math.round(agg.points * 10) / 10,
      wins: agg.wins,
      games: agg.games,
      average_placement:
        agg.placementCount > 0
          ? Math.round((agg.placementSum / agg.placementCount) * 100) / 100
          : null,
    }
  })

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.wins !== a.wins) return b.wins - a.wins
    const ap = a.average_placement ?? Number.POSITIVE_INFINITY
    const bp = b.average_placement ?? Number.POSITIVE_INFINITY
    if (ap !== bp) return ap - bp
    return a.display_name.localeCompare(b.display_name)
  })

  return rows.map((row, index) => ({ ...row, rank: index + 1 }))
}
