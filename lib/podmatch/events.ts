// PodMatch in-store Event mode — a stripped-down, mobile-first layer over the
// existing league tables. An "event" is a podmatch_leagues row tagged with
// settings.mode = 'event'. It skips deck import, scoring and approval: walk-in
// players join by code, the host pairs them Swiss-style, and results are
// reported with a single tap.
//
// Everything reuses the league schema (players, pods, games) and its RLS, so
// no new tables or migrations are required. Pod seats carry deck_id = null.

import { pairEventRound, playerPairKey, type EventPlayer } from './event-pairing'
import {
  getGames,
  getLeaguePlayers,
  isLeagueSchemaMissing,
  type League,
  type LeaguePlayer,
} from './leagues'

type SupabaseLike = any

export type EventSummary = League & { role: 'admin' | 'member' }

export function isEvent(league: { settings: Record<string, unknown> }): boolean {
  return (league.settings as any)?.mode === 'event'
}

export type EventStanding = {
  player: LeaguePlayer
  wins: number
  games_played: number
}

/** Create an in-store event. The caller becomes the host (admin). */
export async function createEvent(
  supabase: SupabaseLike,
  userId: string,
  input: { name: string; pod_size?: number }
): Promise<League> {
  const { data, error } = await supabase
    .from('podmatch_leagues')
    .insert({
      admin_user_id: userId,
      name: input.name,
      pod_size: input.pod_size ?? 4,
      settings: { mode: 'event' },
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as League
}

/** Update the caller's own display name within an event (RLS: owner of the row). */
export async function setMyDisplayName(
  supabase: SupabaseLike,
  playerId: string,
  displayName: string
): Promise<void> {
  const { error } = await supabase
    .from('podmatch_players')
    .update({ display_name: displayName })
    .eq('id', playerId)
  if (error) throw new Error(error.message)
}

/**
 * Win/loss record per player, from finalized games only. A "win" is placement
 * 1. Provisional (unconfirmed) games don't count toward pairing or standings.
 */
export async function getEventStandings(
  supabase: SupabaseLike,
  leagueId: string
): Promise<EventStanding[]> {
  const players = await getLeaguePlayers(supabase, leagueId)
  const wins = new Map<string, number>()
  const played = new Map<string, number>()

  const { data, error } = await supabase
    .from('podmatch_games')
    .select('status, podmatch_game_players(player_id, placement)')
    .eq('league_id', leagueId)
    .eq('status', 'final')
  if (error) throw new Error(error.message)

  for (const game of (data ?? []) as any[]) {
    for (const row of game.podmatch_game_players ?? []) {
      played.set(row.player_id, (played.get(row.player_id) ?? 0) + 1)
      if (row.placement === 1) wins.set(row.player_id, (wins.get(row.player_id) ?? 0) + 1)
    }
  }

  return players
    .map((player) => ({
      player,
      wins: wins.get(player.id) ?? 0,
      games_played: played.get(player.id) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        a.games_played - b.games_played ||
        a.player.display_name.localeCompare(b.player.display_name)
    )
}

/** Player pairs that already shared a table, for rematch avoidance. */
export async function getEventPlayerPairs(
  supabase: SupabaseLike,
  leagueId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from('podmatch_pods')
    .select('podmatch_pod_players(player_id)')
    .eq('league_id', leagueId)

  const pairs = new Set<string>()
  for (const pod of (data ?? []) as any[]) {
    const ids = (pod.podmatch_pod_players ?? [])
      .map((s: any) => s.player_id)
      .filter(Boolean) as string[]
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        pairs.add(playerPairKey(ids[i], ids[j]))
      }
    }
  }
  return pairs
}

/** Highest pod round generated so far (0 if none). */
export async function getEventLatestRound(
  supabase: SupabaseLike,
  leagueId: string
): Promise<number> {
  const { data } = await supabase
    .from('podmatch_pods')
    .select('round_number')
    .eq('league_id', leagueId)
    .order('round_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.round_number ?? 0
}

/**
 * Pair the next round and persist the pods. Host-only (RLS allows only the
 * league admin to insert pods). Returns the new round number and table count.
 */
export async function generateAndPersistEventRound(
  supabase: SupabaseLike,
  leagueId: string,
  roundNumber: number
): Promise<{ roundNumber: number; podCount: number; seated: number; byes: number }> {
  const [standings, recentPairs] = await Promise.all([
    getEventStandings(supabase, leagueId),
    getEventPlayerPairs(supabase, leagueId),
  ])

  const players: EventPlayer[] = standings.map((s) => ({
    id: s.player.id,
    display_name: s.player.display_name,
    wins: s.wins,
    games_played: s.games_played,
  }))

  const { pods, byes } = pairEventRound(players, { roundNumber, recentPairs })

  // Replace any existing pods for this round (idempotent re-pairing).
  await supabase
    .from('podmatch_pods')
    .delete()
    .eq('league_id', leagueId)
    .eq('round_number', roundNumber)

  let seated = 0
  for (const pod of pods) {
    const { data: podRow, error: podError } = await supabase
      .from('podmatch_pods')
      .insert({
        league_id: leagueId,
        round_number: roundNumber,
        table_number: pod.table_number,
        warnings: [],
      })
      .select('id')
      .single()
    if (podError) throw new Error(podError.message)

    const seats = pod.player_ids.map((playerId) => ({
      pod_id: podRow.id,
      player_id: playerId,
      deck_id: null,
    }))
    const { error: seatError } = await supabase.from('podmatch_pod_players').insert(seats)
    if (seatError) throw new Error(seatError.message)
    seated += seats.length
  }

  return { roundNumber, podCount: pods.length, seated, byes: byes.length }
}

export { isLeagueSchemaMissing, getGames }
