// PodMatch ratings (spec Feature J).
//
// Multiplayer Elo approximation: a single multiplayer game is treated as the
// set of pairwise results it implies (winner beats everyone, 2nd beats 3rd &
// 4th, and so on). Each player's rating moves by their own K-factor against
// the pre-game ratings of the others. Pure and deterministic so ratings can
// always be recomputed from finalized game records.

export const INITIAL_RATING = 1500

/** Spec K-factor schedule: provisional, mature, then high-confidence. */
export function kFactor(gamesPlayed: number): number {
  if (gamesPlayed < 10) return 40
  if (gamesPlayed < 30) return 20
  return 12
}

export type EloEntry = {
  id: string
  rating: number
  games: number
  placement: number | null
}

export type RatingUpdate = {
  id: string
  old_rating: number
  new_rating: number
  delta: number
}

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

/**
 * Result of player A vs player B from their placements:
 * 1 = A finished ahead, 0 = behind, 0.5 = tie. Lower placement number is
 * better (1st beats 2nd).
 */
function pairwiseScore(placementA: number, placementB: number): number {
  if (placementA < placementB) return 1
  if (placementA > placementB) return 0
  return 0.5
}

/**
 * Update Elo ratings for one finalized game. Only entries with a placement
 * participate (no-shows / null placements are skipped). Expectations use the
 * pre-game ratings of every opponent, so updates apply simultaneously.
 */
export function updateRatings(entries: EloEntry[]): RatingUpdate[] {
  const players = entries.filter((e) => e.placement != null)
  if (players.length < 2) {
    return entries.map((e) => ({
      id: e.id,
      old_rating: e.rating,
      new_rating: e.rating,
      delta: 0,
    }))
  }

  const updates = new Map<string, RatingUpdate>()

  for (const player of players) {
    let expected = 0
    let actual = 0
    for (const opponent of players) {
      if (opponent.id === player.id) continue
      expected += expectedScore(player.rating, opponent.rating)
      actual += pairwiseScore(player.placement as number, opponent.placement as number)
    }
    const k = kFactor(player.games)
    const delta = k * (actual - expected)
    const newRating = Math.round(player.rating + delta)
    updates.set(player.id, {
      id: player.id,
      old_rating: player.rating,
      new_rating: newRating,
      delta: newRating - player.rating,
    })
  }

  // Pass through skipped entries unchanged so callers see every id.
  return entries.map(
    (e) =>
      updates.get(e.id) ?? {
        id: e.id,
        old_rating: e.rating,
        new_rating: e.rating,
        delta: 0,
      }
  )
}
