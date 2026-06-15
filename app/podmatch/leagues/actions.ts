'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  addPlayer,
  confirmGame,
  createLeague,
  finalizeGame,
  generateAndPersistPods,
  getLatestRound,
  getLeague,
  isLeagueSchemaMissing,
  LEAGUE_SETUP_MESSAGE,
  registerDeck,
  reportGame,
  setDeckApproval,
  type ReportGameInput,
} from '@/lib/podmatch/leagues'
import type { PodOptions } from '@/lib/podmatch/pods'
import { applyRatingsForGame, getHandicapData } from '@/lib/podmatch/league-ratings'
import { computeHandicap, resolveHandicapConfig } from '@/lib/podmatch/handicap'
import type { HandicapApplication } from '@/lib/podmatch/league-scoring'

export type ActionState = { error?: string; ok?: boolean }

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null }
  return { supabase, user }
}

function friendly(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  return isLeagueSchemaMissing(message) ? LEAGUE_SETUP_MESSAGE : message
}

export async function createLeagueAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sign in required.' }

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'League name is required.' }

  const podSize = Number(formData.get('pod_size')) || 4
  const proxiesAllowed = formData.get('proxies_allowed') !== 'off'

  let leagueId: string
  try {
    const league = await createLeague(supabase, user.id, {
      name,
      pod_size: podSize,
      season_start: (formData.get('season_start') as string) || null,
      season_end: (formData.get('season_end') as string) || null,
      proxies_allowed: proxiesAllowed,
    })
    leagueId = league.id
  } catch (error) {
    return { error: friendly(error) }
  }

  redirect(`/podmatch/leagues/${leagueId}`)
}

export async function addPlayerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sign in required.' }

  const leagueId = String(formData.get('leagueId') ?? '')
  const displayName = String(formData.get('display_name') ?? '').trim()
  if (!displayName) return { error: 'Player name is required.' }

  try {
    await addPlayer(supabase, user.id, leagueId, displayName)
  } catch (error) {
    return { error: friendly(error) }
  }

  revalidatePath(`/podmatch/leagues/${leagueId}/players`)
  return { ok: true }
}

export async function registerDeckAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sign in required.' }

  const leagueId = String(formData.get('leagueId') ?? '')
  const deckId = Number(formData.get('deckId'))
  const playerId = String(formData.get('playerId') ?? '')
  if (!deckId || !playerId) return { error: 'Pick a player and a deck.' }

  try {
    await registerDeck(supabase, leagueId, deckId, playerId)
  } catch (error) {
    return { error: friendly(error) }
  }

  revalidatePath(`/podmatch/leagues/${leagueId}/players`)
  return { ok: true }
}

export async function toggleDeckApprovalAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser()
  if (!user) return

  const leagueId = String(formData.get('leagueId') ?? '')
  const deckId = Number(formData.get('deckId'))
  const approved = formData.get('approved') === 'true'

  try {
    await setDeckApproval(supabase, leagueId, deckId, approved)
  } catch {
    // Surfaced on next render; nothing to do here.
  }
  revalidatePath(`/podmatch/leagues/${leagueId}/players`)
}

export async function generatePodsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sign in required.' }

  const leagueId = String(formData.get('leagueId') ?? '')
  let league
  try {
    league = await getLeague(supabase, leagueId, user.id)
  } catch (error) {
    return { error: friendly(error) }
  }
  if (!league) return { error: 'League not found.' }

  const proxiesAllowed = (league.settings as any)?.proxies_allowed !== false
  const options: PodOptions = {
    allowProxies: proxiesAllowed,
    allowStax: true,
    allowCombo: true,
  }

  try {
    const latest = await getLatestRound(supabase, leagueId)
    const result = await generateAndPersistPods(supabase, leagueId, latest + 1, options)
    if (result.entrantCount < 3) {
      return { error: 'Need at least 3 players with an approved, scored deck to make a pod.' }
    }
  } catch (error) {
    return { error: friendly(error) }
  }

  revalidatePath(`/podmatch/leagues/${leagueId}/pods`)
  return { ok: true }
}

export async function reportGameAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sign in required.' }

  const leagueId = String(formData.get('leagueId') ?? '')
  const league = await getLeague(supabase, leagueId, user.id).catch(() => null)
  if (!league) return { error: 'League not found.' }

  const podId = (formData.get('podId') as string) || null
  const roundNumber = Number(formData.get('roundNumber')) || 1
  const playerIds = String(formData.get('playerIds') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (playerIds.length < 2) return { error: 'A game needs at least two players.' }

  const players: ReportGameInput['players'] = playerIds.map((pid) => ({
    player_id: pid,
    deck_id: Number(formData.get(`deck_${pid}`)) || null,
    placement: formData.get(`placement_${pid}`)
      ? Number(formData.get(`placement_${pid}`))
      : null,
    eliminations: Number(formData.get(`elim_${pid}`)) || 0,
    combo_win: formData.get(`combo_${pid}`) === 'on',
    no_show: formData.get(`noshow_${pid}`) === 'on',
    sportsmanship: formData.get(`sport_${pid}`) === 'on',
  }))

  // Apply soft handicaps to bonus points when the league enables them.
  let handicaps: Map<string, HandicapApplication> | undefined
  const handicapConfig = resolveHandicapConfig(league.settings)
  if (handicapConfig.enabled) {
    try {
      const data = await getHandicapData(supabase, leagueId)
      handicaps = new Map(
        data.map((d) => {
          const out = computeHandicap(d.input, handicapConfig)
          return [
            d.player_id,
            { bonusMultiplier: out.bonus_point_multiplier, catchUpBonus: out.catch_up_bonus },
          ]
        })
      )
    } catch {
      handicaps = undefined
    }
  }

  try {
    await reportGame(
      supabase,
      user.id,
      league,
      {
        leagueId,
        podId,
        roundNumber,
        turnCount: formData.get('turn_count') ? Number(formData.get('turn_count')) : null,
        notes: (formData.get('notes') as string) || null,
        players,
      },
      handicaps
    )
  } catch (error) {
    return { error: friendly(error) }
  }

  revalidatePath(`/podmatch/leagues/${leagueId}`)
  revalidatePath(`/podmatch/leagues/${leagueId}/standings`)
  redirect(`/podmatch/leagues/${leagueId}?reported=1`)
}

export async function confirmGameAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser()
  if (!user) return
  const leagueId = String(formData.get('leagueId') ?? '')
  const gameId = String(formData.get('gameId') ?? '')
  const playerId = String(formData.get('playerId') ?? '')
  try {
    const { finalized } = await confirmGame(supabase, gameId, playerId)
    if (finalized) await applyRatingsForGame(supabase, gameId)
  } catch {
    // no-op; reflected on next render
  }
  revalidatePath(`/podmatch/leagues/${leagueId}`)
  revalidatePath(`/podmatch/leagues/${leagueId}/standings`)
}

export async function finalizeGameAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser()
  if (!user) return
  const leagueId = String(formData.get('leagueId') ?? '')
  const gameId = String(formData.get('gameId') ?? '')
  try {
    await finalizeGame(supabase, gameId)
    await applyRatingsForGame(supabase, gameId)
  } catch {
    // no-op
  }
  revalidatePath(`/podmatch/leagues/${leagueId}`)
  revalidatePath(`/podmatch/leagues/${leagueId}/standings`)
}

export async function setHandicapsAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser()
  if (!user) return
  const leagueId = String(formData.get('leagueId') ?? '')
  const enabled = formData.get('enabled') === 'true'

  const league = await getLeague(supabase, leagueId, user.id).catch(() => null)
  if (!league) return

  const settings = {
    ...(league.settings as Record<string, unknown>),
    handicap: {
      ...((league.settings as any)?.handicap ?? {}),
      enabled,
      type: 'soft',
    },
  }

  await supabase.from('podmatch_leagues').update({ settings }).eq('id', leagueId)
  revalidatePath(`/podmatch/leagues/${leagueId}/handicaps`)
}
