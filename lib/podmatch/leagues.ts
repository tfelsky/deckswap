// PodMatch league mode data access (Milestone 3).
//
// All reads/writes go through the caller's authed Supabase client, so RLS
// (anchored to the league admin) is enforced automatically. The host/admin
// owns the league, its roster players, registered decks, pods, and games.

import { generatePods, pairKey, type PodDeck, type PodOptions } from './pods'
import {
  calculateStandings,
  resolveScoringConfig,
  scoreGamePlayer,
  type GamePlayerResult,
  type HandicapApplication,
  type StandingsRow,
} from './league-scoring'

type SupabaseLike = any

export type League = {
  id: string
  admin_user_id: string
  name: string
  format: string
  pod_size: number
  season_start: string | null
  season_end: string | null
  scoring_model: string
  settings: Record<string, unknown>
  status: string
  invite_code: string | null
  created_at: string
}

export type LeagueWithRole = League & { role: 'admin' | 'member' }

export type LeaguePlayer = {
  id: string
  display_name: string
  user_id: string | null
}

export type RegisteredDeck = {
  deck_id: number
  player_id: string | null
  approved: boolean
  deck_name: string
  commander: string | null
  power: number | null
}

export type PodEntrant = PodDeck & { player_id: string; player_name: string }

export const LEAGUE_SETUP_MESSAGE =
  'PodMatch league mode needs its tables. Run the latest Supabase migration ' +
  '(supabase/migrations/..._create_podmatch_league_mode.sql), then try again.'

export function isLeagueSchemaMissing(message?: string | null): boolean {
  if (!message) return false
  return (
    message.includes('podmatch_leagues') ||
    message.includes('podmatch_players') ||
    message.includes('podmatch_league') ||
    message.includes('podmatch_pods') ||
    message.includes('podmatch_games') ||
    message.includes('podmatch_pod_players') ||
    message.includes('podmatch_game')
  )
}

// ---- Leagues ---------------------------------------------------------------

export async function createLeague(
  supabase: SupabaseLike,
  userId: string,
  input: {
    name: string
    pod_size?: number
    season_start?: string | null
    season_end?: string | null
    proxies_allowed?: boolean
  }
): Promise<League> {
  const { data, error } = await supabase
    .from('podmatch_leagues')
    .insert({
      admin_user_id: userId,
      name: input.name,
      pod_size: input.pod_size ?? 4,
      season_start: input.season_start ?? null,
      season_end: input.season_end ?? null,
      settings: { proxies_allowed: input.proxies_allowed ?? true },
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as League
}

export async function listLeagues(
  supabase: SupabaseLike,
  userId: string
): Promise<League[]> {
  const { data, error } = await supabase
    .from('podmatch_leagues')
    .select('*')
    .eq('admin_user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as League[]
}

export async function getLeague(
  supabase: SupabaseLike,
  leagueId: string,
  userId: string
): Promise<League | null> {
  const { data, error } = await supabase
    .from('podmatch_leagues')
    .select('*')
    .eq('id', leagueId)
    .eq('admin_user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as League) ?? null
}

/**
 * Load a league for any viewer (admin or member). Relies on RLS: members can
 * read leagues they belong to, non-members get null. Returns the viewer's role.
 */
export async function getLeagueForViewer(
  supabase: SupabaseLike,
  leagueId: string,
  userId: string
): Promise<{ league: League; role: 'admin' | 'member' } | null> {
  const { data, error } = await supabase
    .from('podmatch_leagues')
    .select('*')
    .eq('id', leagueId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  const league = data as League
  return { league, role: league.admin_user_id === userId ? 'admin' : 'member' }
}

/** Leagues the user administers or has joined as a member, role-tagged. */
export async function getMyLeagues(
  supabase: SupabaseLike,
  userId: string
): Promise<LeagueWithRole[]> {
  const { data: adminData, error: adminError } = await supabase
    .from('podmatch_leagues')
    .select('*')
    .eq('admin_user_id', userId)
    .order('created_at', { ascending: false })
  if (adminError) throw new Error(adminError.message)
  const adminLeagues = (adminData ?? []) as League[]
  const adminIds = new Set(adminLeagues.map((l) => l.id))

  // Member leagues: my player rows -> league links -> leagues.
  const { data: myPlayers } = await supabase
    .from('podmatch_players')
    .select('id')
    .eq('user_id', userId)
  const playerIds = (myPlayers ?? []).map((p: any) => p.id)

  let memberLeagues: League[] = []
  if (playerIds.length) {
    const { data: links } = await supabase
      .from('podmatch_league_players')
      .select('league_id')
      .in('player_id', playerIds)
    const linkRows = (links ?? []) as { league_id: string }[]
    const leagueIds = Array.from(new Set(linkRows.map((l) => l.league_id))).filter(
      (id) => !adminIds.has(id)
    )
    if (leagueIds.length) {
      const { data: ls } = await supabase.from('podmatch_leagues').select('*').in('id', leagueIds)
      memberLeagues = (ls ?? []) as League[]
    }
  }

  return [
    ...adminLeagues.map((l) => ({ ...l, role: 'admin' as const })),
    ...memberLeagues.map((l) => ({ ...l, role: 'member' as const })),
  ]
}

/** The caller's player row in a league (null if they haven't joined). */
export async function getMyPlayer(
  supabase: SupabaseLike,
  leagueId: string,
  userId: string
): Promise<LeaguePlayer | null> {
  const { data: myPlayers } = await supabase
    .from('podmatch_players')
    .select('id, display_name, user_id')
    .eq('user_id', userId)
  const players = (myPlayers ?? []) as LeaguePlayer[]
  if (!players.length) return null

  const { data: link } = await supabase
    .from('podmatch_league_players')
    .select('player_id')
    .eq('league_id', leagueId)
    .in(
      'player_id',
      players.map((p) => p.id)
    )
    .maybeSingle()
  if (!link) return null
  return players.find((p) => p.id === link.player_id) ?? null
}

/** Join a league by invite code (SECURITY DEFINER RPC). Returns the league id. */
export async function joinLeague(supabase: SupabaseLike, code: string): Promise<string> {
  const { data, error } = await supabase.rpc('podmatch_join_league', {
    p_code: code.trim().toLowerCase(),
  })
  if (error) throw new Error(error.message)
  return data as string
}

/** Confirm a result as a member (SECURITY DEFINER RPC). Returns true if finalized. */
export async function confirmGameViaRpc(
  supabase: SupabaseLike,
  gameId: string,
  playerId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('podmatch_confirm_game', {
    p_game: gameId,
    p_player: playerId,
  })
  if (error) throw new Error(error.message)
  return Boolean(data)
}

// ---- Players & decks -------------------------------------------------------

export async function getLeaguePlayers(
  supabase: SupabaseLike,
  leagueId: string
): Promise<LeaguePlayer[]> {
  const { data, error } = await supabase
    .from('podmatch_league_players')
    .select('player_id, podmatch_players(id, display_name, user_id)')
    .eq('league_id', leagueId)

  if (error) throw new Error(error.message)
  return (data ?? [])
    .map((row: any) => row.podmatch_players)
    .filter(Boolean)
    .map((p: any) => ({ id: p.id, display_name: p.display_name, user_id: p.user_id }))
    .sort((a: LeaguePlayer, b: LeaguePlayer) => a.display_name.localeCompare(b.display_name))
}

export async function addPlayer(
  supabase: SupabaseLike,
  userId: string,
  leagueId: string,
  displayName: string
): Promise<void> {
  const { data: player, error: playerError } = await supabase
    .from('podmatch_players')
    .insert({ owner_user_id: userId, display_name: displayName })
    .select('id')
    .single()
  if (playerError) throw new Error(playerError.message)

  const { error: linkError } = await supabase
    .from('podmatch_league_players')
    .insert({ league_id: leagueId, player_id: player.id })
  if (linkError) throw new Error(linkError.message)
}

export async function getRegisteredDecks(
  supabase: SupabaseLike,
  leagueId: string
): Promise<RegisteredDeck[]> {
  const { data, error } = await supabase
    .from('podmatch_league_decks')
    .select('deck_id, player_id, approved, deck_name, commander, power')
    .eq('league_id', leagueId)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row: any) => ({
    deck_id: row.deck_id,
    player_id: row.player_id,
    approved: row.approved,
    deck_name: row.deck_name ?? `Deck ${row.deck_id}`,
    commander: row.commander ?? null,
    power: row.power ?? null,
  }))
}

/**
 * Register a deck to a league, snapshotting its identity + score onto the row.
 * The snapshot means pod generation never has to read another user's
 * owner-only deck_scores. Callable by the admin or by a member for their own
 * deck (RLS enforces ownership of the player + deck).
 */
export async function registerDeck(
  supabase: SupabaseLike,
  leagueId: string,
  deckId: number,
  playerId: string
): Promise<void> {
  const [{ data: deck }, { data: score }, { data: cards }] = await Promise.all([
    supabase.from('decks').select('name, commander').eq('id', deckId).maybeSingle(),
    supabase
      .from('deck_scores')
      .select('overall_power, speed, salt, combo_density, tutor_density, budget_pressure')
      .eq('deck_id', deckId)
      .maybeSingle(),
    supabase.from('deck_cards').select('color_identity').eq('deck_id', deckId),
  ])

  const colors = new Set<string>()
  for (const row of (cards ?? []) as any[]) {
    for (const c of row.color_identity ?? []) colors.add(c)
  }

  const { error } = await supabase.from('podmatch_league_decks').upsert(
    {
      league_id: leagueId,
      deck_id: deckId,
      player_id: playerId,
      approved: true,
      deck_name: deck?.name ?? `Deck ${deckId}`,
      commander: deck?.commander ?? null,
      color_identity: Array.from(colors),
      power: score?.overall_power ?? null,
      speed: score?.speed ?? null,
      salt: score?.salt ?? null,
      combo_density: score?.combo_density ?? null,
      tutor_density: score?.tutor_density ?? null,
      budget_pressure: score?.budget_pressure ?? null,
    },
    { onConflict: 'league_id,deck_id' }
  )
  if (error) throw new Error(error.message)
}

export async function setDeckApproval(
  supabase: SupabaseLike,
  leagueId: string,
  deckId: number,
  approved: boolean
): Promise<void> {
  const { error } = await supabase
    .from('podmatch_league_decks')
    .update({ approved })
    .eq('league_id', leagueId)
    .eq('deck_id', deckId)
  if (error) throw new Error(error.message)
}

// ---- Pod generation --------------------------------------------------------

/** One approved deck per player (highest-power), ready for the pod generator. */
export async function getLeagueEntrants(
  supabase: SupabaseLike,
  leagueId: string
): Promise<PodEntrant[]> {
  const players = await getLeaguePlayers(supabase, leagueId)
  const playerName = new Map(players.map((p) => [p.id, p.display_name]))

  const { data, error } = await supabase
    .from('podmatch_league_decks')
    .select(
      'deck_id, player_id, deck_name, commander, color_identity, power, speed, salt, combo_density, tutor_density, budget_pressure'
    )
    .eq('league_id', leagueId)
    .eq('approved', true)
  if (error) throw new Error(error.message)

  const bestByPlayer = new Map<string, PodEntrant>()
  for (const row of (data ?? []) as any[]) {
    if (!row.player_id || row.power == null) continue
    const entrant: PodEntrant = {
      id: row.deck_id,
      name: row.deck_name ?? `Deck ${row.deck_id}`,
      commander: row.commander ?? null,
      owner: playerName.get(row.player_id) ?? null,
      proxy_count: null,
      overall_power: Number(row.power) ?? 0,
      speed: Number(row.speed) ?? 0,
      salt: Number(row.salt) ?? 0,
      combo_density: Number(row.combo_density) ?? 0,
      tutor_density: Number(row.tutor_density) ?? 0,
      budget_pressure: Number(row.budget_pressure) ?? 0,
      color_identity: (row.color_identity ?? []) as string[],
      player_id: row.player_id,
      player_name: playerName.get(row.player_id) ?? 'Player',
    }
    const existing = bestByPlayer.get(row.player_id)
    if (!existing || entrant.overall_power > existing.overall_power) {
      bestByPlayer.set(row.player_id, entrant)
    }
  }

  return Array.from(bestByPlayer.values())
}

/** Deck pairs that shared a pod in the most recent rounds, for repeat avoidance. */
export async function getRecentDeckPairs(
  supabase: SupabaseLike,
  leagueId: string,
  rounds = 2
): Promise<Set<string>> {
  const { data } = await supabase
    .from('podmatch_pods')
    .select('round_number, podmatch_pod_players(deck_id)')
    .eq('league_id', leagueId)
    .order('round_number', { ascending: false })

  const pairs = new Set<string>()
  const seenRounds = new Set<number>()
  for (const pod of (data ?? []) as any[]) {
    seenRounds.add(pod.round_number)
    if (seenRounds.size > rounds) break
    const deckIds = (pod.podmatch_pod_players ?? [])
      .map((s: any) => s.deck_id)
      .filter((id: number | null): id is number => id != null)
    for (let i = 0; i < deckIds.length; i++) {
      for (let j = i + 1; j < deckIds.length; j++) {
        pairs.add(pairKey(deckIds[i], deckIds[j]))
      }
    }
  }
  return pairs
}

export async function generateAndPersistPods(
  supabase: SupabaseLike,
  leagueId: string,
  roundNumber: number,
  options: PodOptions
): Promise<{ podCount: number; entrantCount: number }> {
  const entrants = await getLeagueEntrants(supabase, leagueId)
  const recentPairs = await getRecentDeckPairs(supabase, leagueId)
  const result = generatePods(entrants, { ...options, recentPairs })
  const playerByDeck = new Map(entrants.map((e) => [e.id, e.player_id]))

  // Replace any existing pods for this round.
  await supabase
    .from('podmatch_pods')
    .delete()
    .eq('league_id', leagueId)
    .eq('round_number', roundNumber)

  for (const pod of result.pods) {
    const { data: podRow, error: podError } = await supabase
      .from('podmatch_pods')
      .insert({
        league_id: leagueId,
        round_number: roundNumber,
        table_number: pod.table_number,
        fit_score: pod.fit_score,
        average_power: pod.average_power,
        warnings: pod.warnings,
      })
      .select('id')
      .single()
    if (podError) throw new Error(podError.message)

    const seats = pod.deck_ids.map((deckId) => ({
      pod_id: podRow.id,
      player_id: playerByDeck.get(deckId)!,
      deck_id: deckId,
    }))
    const { error: seatError } = await supabase.from('podmatch_pod_players').insert(seats)
    if (seatError) throw new Error(seatError.message)
  }

  return { podCount: result.pods.length, entrantCount: entrants.length }
}

export type PodWithSeats = {
  id: string
  round_number: number
  table_number: number
  fit_score: number | null
  average_power: number | null
  warnings: string[]
  seats: { player_id: string; player_name: string; deck_id: number | null; deck_name: string }[]
}

export async function getPods(
  supabase: SupabaseLike,
  leagueId: string,
  roundNumber?: number
): Promise<PodWithSeats[]> {
  let query = supabase
    .from('podmatch_pods')
    .select(
      'id, round_number, table_number, fit_score, average_power, warnings, podmatch_pod_players(player_id, deck_id, podmatch_players(display_name), decks(name))'
    )
    .eq('league_id', leagueId)
  if (roundNumber != null) query = query.eq('round_number', roundNumber)

  const { data, error } = await query
    .order('round_number', { ascending: false })
    .order('table_number', { ascending: true })
  if (error) throw new Error(error.message)

  return (data ?? []).map((pod: any) => ({
    id: pod.id,
    round_number: pod.round_number,
    table_number: pod.table_number,
    fit_score: pod.fit_score,
    average_power: pod.average_power,
    warnings: Array.isArray(pod.warnings) ? pod.warnings : [],
    seats: (pod.podmatch_pod_players ?? []).map((seat: any) => ({
      player_id: seat.player_id,
      player_name: seat.podmatch_players?.display_name ?? 'Player',
      deck_id: seat.deck_id,
      deck_name: seat.decks?.name ?? (seat.deck_id ? `Deck ${seat.deck_id}` : 'Unknown'),
    })),
  }))
}

export async function getLatestRound(
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

// ---- Games -----------------------------------------------------------------

export type ReportGameInput = {
  leagueId: string
  podId?: string | null
  roundNumber: number
  turnCount?: number | null
  notes?: string | null
  players: Array<{
    player_id: string
    deck_id: number | null
    placement: number | null
    eliminations: number
    combo_win: boolean
    no_show: boolean
    sportsmanship: boolean
  }>
}

export async function reportGame(
  supabase: SupabaseLike,
  userId: string,
  league: League,
  input: ReportGameInput,
  handicaps?: Map<string, HandicapApplication>
): Promise<string> {
  const config = resolveScoringConfig(league.settings)
  const podSize = input.players.filter((p) => !p.no_show).length

  const { data: game, error: gameError } = await supabase
    .from('podmatch_games')
    .insert({
      league_id: input.leagueId,
      pod_id: input.podId ?? null,
      round_number: input.roundNumber,
      reported_by: userId,
      status: 'provisional',
      turn_count: input.turnCount ?? null,
      notes: input.notes ?? null,
    })
    .select('id')
    .single()
  if (gameError) throw new Error(gameError.message)

  const rows = input.players.map((p) => {
    const result: GamePlayerResult = {
      player_id: p.player_id,
      placement: p.placement,
      eliminations: p.eliminations,
      combo_win: p.combo_win,
      no_show: p.no_show,
      sportsmanship: p.sportsmanship,
    }
    const { total } = scoreGamePlayer(result, podSize, config, handicaps?.get(p.player_id))
    return {
      game_id: game.id,
      player_id: p.player_id,
      deck_id: p.deck_id,
      placement: p.placement,
      eliminations: p.eliminations,
      combo_win: p.combo_win,
      no_show: p.no_show,
      sportsmanship: p.sportsmanship,
      points_awarded: total,
    }
  })

  const { error: rowsError } = await supabase.from('podmatch_game_players').insert(rows)
  if (rowsError) throw new Error(rowsError.message)

  return game.id as string
}

export async function confirmGame(
  supabase: SupabaseLike,
  gameId: string,
  playerId: string
): Promise<{ finalized: boolean }> {
  const { error } = await supabase
    .from('podmatch_game_confirmations')
    .upsert({ game_id: gameId, player_id: playerId, confirmed: true }, { onConflict: 'game_id,player_id' })
  if (error) throw new Error(error.message)

  const { count } = await supabase
    .from('podmatch_game_confirmations')
    .select('player_id', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .eq('confirmed', true)

  if ((count ?? 0) >= 2) {
    await finalizeGame(supabase, gameId)
    return { finalized: true }
  }
  return { finalized: false }
}

export async function finalizeGame(supabase: SupabaseLike, gameId: string): Promise<void> {
  const { error } = await supabase
    .from('podmatch_games')
    .update({ status: 'final', finalized_at: new Date().toISOString() })
    .eq('id', gameId)
  if (error) throw new Error(error.message)
}

export type GameSummary = {
  id: string
  pod_id: string | null
  round_number: number
  status: string
  played_at: string
  confirmations: number
  players: Array<{
    player_id: string
    display_name: string
    placement: number | null
    points_awarded: number
  }>
}

export async function getGames(
  supabase: SupabaseLike,
  leagueId: string
): Promise<GameSummary[]> {
  const { data, error } = await supabase
    .from('podmatch_games')
    .select(
      'id, pod_id, round_number, status, played_at, podmatch_game_players(player_id, placement, points_awarded, podmatch_players(display_name)), podmatch_game_confirmations(player_id)'
    )
    .eq('league_id', leagueId)
    .order('played_at', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((game: any) => ({
    id: game.id,
    pod_id: game.pod_id ?? null,
    round_number: game.round_number,
    status: game.status,
    played_at: game.played_at,
    confirmations: (game.podmatch_game_confirmations ?? []).length,
    players: (game.podmatch_game_players ?? [])
      .map((p: any) => ({
        player_id: p.player_id,
        display_name: p.podmatch_players?.display_name ?? 'Player',
        placement: p.placement,
        points_awarded: Number(p.points_awarded) || 0,
      }))
      .sort((a: any, b: any) => (a.placement ?? 99) - (b.placement ?? 99)),
  }))
}

// ---- Standings -------------------------------------------------------------

export async function getStandings(
  supabase: SupabaseLike,
  leagueId: string
): Promise<StandingsRow[]> {
  const players = await getLeaguePlayers(supabase, leagueId)

  const { data, error } = await supabase
    .from('podmatch_games')
    .select('status, podmatch_game_players(player_id, placement, points_awarded)')
    .eq('league_id', leagueId)
    .eq('status', 'final')
  if (error) throw new Error(error.message)

  const lines = (data ?? []).flatMap((game: any) =>
    (game.podmatch_game_players ?? []).map((p: any) => ({
      player_id: p.player_id,
      placement: p.placement,
      points_awarded: Number(p.points_awarded) || 0,
    }))
  )

  return calculateStandings(
    lines,
    players.map((p) => ({ id: p.id, display_name: p.display_name }))
  )
}
