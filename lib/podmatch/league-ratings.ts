// PodMatch ratings & handicap data access (Milestone 4).
//
// Applies Elo updates when a game is finalized (idempotently) and assembles
// the inputs the handicap engine needs. Ratings are optional: if the M4
// migration hasn't run, these helpers degrade to no-ops / empty data so the
// rest of league mode keeps working.

import { INITIAL_RATING, updateRatings, type EloEntry } from './ratings'
import { getStandings, getLeaguePlayers, getLeagueEntrants } from './leagues'
import type { HandicapInput } from './handicap'

type SupabaseLike = any
type RatingType = 'player' | 'deck' | 'commander'

export function isRatingsSchemaMissing(message?: string | null): boolean {
  if (!message) return false
  return message.includes('podmatch_ratings') || message.includes('podmatch_rating_history')
}

function normalizeCommander(name: string | null | undefined): string | null {
  const trimmed = (name ?? '').trim().toLowerCase()
  return trimmed ? trimmed : null
}

async function getRatingMap(
  supabase: SupabaseLike,
  leagueId: string,
  type: RatingType
): Promise<Map<string, { rating: number; games: number }>> {
  const { data, error } = await supabase
    .from('podmatch_ratings')
    .select('subject_id, rating, games')
    .eq('league_id', leagueId)
    .eq('rating_type', type)
  if (error) {
    if (isRatingsSchemaMissing(error.message)) return new Map()
    throw new Error(error.message)
  }
  return new Map(
    (data ?? []).map((row: any) => [row.subject_id, { rating: Number(row.rating), games: row.games }])
  )
}

type Subject = { subject_id: string; placement: number }

async function applyRatingType(
  supabase: SupabaseLike,
  leagueId: string,
  gameId: string,
  type: RatingType,
  subjects: Subject[]
): Promise<void> {
  // Drop subjects that appear more than once (e.g. a commander mirror) — a
  // pairwise update against yourself isn't meaningful.
  const counts = new Map<string, number>()
  for (const s of subjects) counts.set(s.subject_id, (counts.get(s.subject_id) ?? 0) + 1)
  const unique = subjects.filter((s) => counts.get(s.subject_id) === 1)
  if (unique.length < 2) return

  const ratingMap = await getRatingMap(supabase, leagueId, type)
  const entries: EloEntry[] = unique.map((s) => {
    const current = ratingMap.get(s.subject_id)
    return {
      id: s.subject_id,
      rating: current?.rating ?? INITIAL_RATING,
      games: current?.games ?? 0,
      placement: s.placement,
    }
  })

  const updates = updateRatings(entries)
  const now = new Date().toISOString()

  for (const update of updates) {
    const prevGames = ratingMap.get(update.id)?.games ?? 0
    const { error: upsertError } = await supabase.from('podmatch_ratings').upsert(
      {
        league_id: leagueId,
        rating_type: type,
        subject_id: update.id,
        rating: update.new_rating,
        games: prevGames + 1,
        updated_at: now,
      },
      { onConflict: 'league_id,rating_type,subject_id' }
    )
    if (upsertError) throw new Error(upsertError.message)
  }

  const historyRows = updates.map((u) => ({
    league_id: leagueId,
    game_id: gameId,
    rating_type: type,
    subject_id: u.id,
    old_rating: u.old_rating,
    new_rating: u.new_rating,
  }))
  const { error: historyError } = await supabase
    .from('podmatch_rating_history')
    .insert(historyRows)
  if (historyError) throw new Error(historyError.message)
}

/**
 * Update player, deck, and commander ratings for a finalized game. Idempotent:
 * if rating history already exists for the game, it's a no-op. Silently skips
 * when the ratings schema is absent so finalizing still succeeds.
 */
export async function applyRatingsForGame(supabase: SupabaseLike, gameId: string): Promise<void> {
  try {
    const { count } = await supabase
      .from('podmatch_rating_history')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', gameId)
    if ((count ?? 0) > 0) return

    const { data: game } = await supabase
      .from('podmatch_games')
      .select('id, league_id')
      .eq('id', gameId)
      .maybeSingle()
    if (!game) return
    const leagueId = game.league_id as string

    const { data: gps } = await supabase
      .from('podmatch_game_players')
      .select('player_id, deck_id, placement')
      .eq('game_id', gameId)
    const lines = (gps ?? []).filter((p: any) => p.placement != null)
    if (lines.length < 2) return

    const deckIds = lines.map((l: any) => l.deck_id).filter(Boolean)
    const commanderByDeck = new Map<number, string | null>()
    if (deckIds.length) {
      const { data: decks } = await supabase
        .from('decks')
        .select('id, commander')
        .in('id', deckIds)
      for (const d of (decks ?? []) as any[]) {
        commanderByDeck.set(d.id, normalizeCommander(d.commander))
      }
    }

    await applyRatingType(
      supabase,
      leagueId,
      gameId,
      'player',
      lines.map((l: any) => ({ subject_id: l.player_id, placement: l.placement }))
    )
    await applyRatingType(
      supabase,
      leagueId,
      gameId,
      'deck',
      lines
        .filter((l: any) => l.deck_id)
        .map((l: any) => ({ subject_id: String(l.deck_id), placement: l.placement }))
    )
    await applyRatingType(
      supabase,
      leagueId,
      gameId,
      'commander',
      lines
        .filter((l: any) => l.deck_id && commanderByDeck.get(l.deck_id))
        .map((l: any) => ({ subject_id: commanderByDeck.get(l.deck_id) as string, placement: l.placement }))
    )
  } catch (error) {
    if (isRatingsSchemaMissing(error instanceof Error ? error.message : '')) return
    throw error
  }
}

export type PlayerRatingView = {
  player_id: string
  display_name: string
  rating: number
  games: number
}

export async function getPlayerRatings(
  supabase: SupabaseLike,
  leagueId: string
): Promise<{ ratings: PlayerRatingView[]; schemaMissing: boolean }> {
  const players = await getLeaguePlayers(supabase, leagueId)
  let map: Map<string, { rating: number; games: number }>
  try {
    map = await getRatingMap(supabase, leagueId, 'player')
  } catch (error) {
    if (isRatingsSchemaMissing(error instanceof Error ? error.message : '')) {
      return { ratings: [], schemaMissing: true }
    }
    throw error
  }
  const ratings = players
    .map((p) => ({
      player_id: p.id,
      display_name: p.display_name,
      rating: map.get(p.id)?.rating ?? INITIAL_RATING,
      games: map.get(p.id)?.games ?? 0,
    }))
    .sort((a, b) => b.rating - a.rating)
  return { ratings, schemaMissing: false }
}

export type HandicapDatum = {
  player_id: string
  display_name: string
  input: HandicapInput
}

/** Assemble per-player handicap inputs from ratings, standings, and recent play. */
export async function getHandicapData(
  supabase: SupabaseLike,
  leagueId: string
): Promise<HandicapDatum[]> {
  const [players, standings, playerRatings, deckRatings, entrants] = await Promise.all([
    getLeaguePlayers(supabase, leagueId),
    getStandings(supabase, leagueId),
    getRatingMap(supabase, leagueId, 'player').catch(() => new Map()),
    getRatingMap(supabase, leagueId, 'deck').catch(() => new Map()),
    getLeagueEntrants(supabase, leagueId).catch(() => []),
  ])

  const rankByPlayer = new Map(standings.map((row) => [row.player_id, row.rank]))
  const entrantByPlayer = new Map(entrants.map((e) => [e.player_id, e]))

  // Recent results (last 5 finalized games) per player.
  const { data: finals } = await supabase
    .from('podmatch_games')
    .select('played_at, podmatch_game_players(player_id, placement)')
    .eq('league_id', leagueId)
    .eq('status', 'final')
    .order('played_at', { ascending: false })

  const recentByPlayer = new Map<string, number[]>()
  for (const game of (finals ?? []) as any[]) {
    for (const gp of game.podmatch_game_players ?? []) {
      if (gp.placement == null) continue
      const list = recentByPlayer.get(gp.player_id) ?? []
      if (list.length < 5) list.push(gp.placement)
      recentByPlayer.set(gp.player_id, list)
    }
  }

  return players.map((player) => {
    const recent = recentByPlayer.get(player.id) ?? []
    const wins = recent.filter((p) => p === 1).length
    const recentWinRate = recent.length ? wins / recent.length : 0
    const avgPlacement = recent.length
      ? Math.round((recent.reduce((s, p) => s + p, 0) / recent.length) * 100) / 100
      : null
    const entrant = entrantByPlayer.get(player.id)
    const deckRating = entrant ? deckRatings.get(String(entrant.id))?.rating ?? INITIAL_RATING : INITIAL_RATING

    const input: HandicapInput = {
      player_rating: playerRatings.get(player.id)?.rating ?? INITIAL_RATING,
      deck_rating: deckRating,
      recent_win_rate: recentWinRate,
      average_placement_last_5: avgPlacement,
      league_rank: rankByPlayer.get(player.id) ?? players.length,
      league_size: players.length,
      deck_power_score: entrant?.overall_power ?? 0,
    }
    return { player_id: player.id, display_name: player.display_name, input }
  })
}
