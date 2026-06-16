'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  confirmGame,
  confirmGameViaRpc,
  finalizeGame,
  getLeagueForViewer,
  getMyPlayer,
  isLeagueSchemaMissing,
  joinLeague,
  LEAGUE_SETUP_MESSAGE,
  reportGame,
  type ReportGameInput,
} from '@/lib/podmatch/leagues'
import {
  createEvent,
  generateAndPersistEventRound,
  getEventLatestRound,
  setMyDisplayName,
} from '@/lib/podmatch/events'

export type ActionState = { error?: string; ok?: boolean }

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

function friendly(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  return isLeagueSchemaMissing(message) ? LEAGUE_SETUP_MESSAGE : message
}

export async function createEventAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sign in required.' }

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Give your event a name.' }
  const podSize = Number(formData.get('pod_size')) || 4

  let eventId: string
  try {
    const event = await createEvent(supabase, user.id, { name, pod_size: podSize })
    eventId = event.id
  } catch (error) {
    return { error: friendly(error) }
  }
  redirect(`/podmatch/play/${eventId}`)
}

export async function joinEventAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser()
  const code = String(formData.get('code') ?? '').trim()
  if (!code) return { error: 'Enter the event code.' }

  if (!user) {
    // Carry the code through sign-in so the player lands back ready to join.
    const next = `/podmatch/play?code=${encodeURIComponent(code)}`
    redirect(`/sign-in?next=${encodeURIComponent(next)}`)
  }

  let eventId: string
  try {
    eventId = await joinLeague(supabase, code)
  } catch (error) {
    return { error: friendly(error) }
  }
  redirect(`/podmatch/play/${eventId}`)
}

export async function setMyNameAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sign in required.' }

  const leagueId = String(formData.get('leagueId') ?? '')
  const name = String(formData.get('display_name') ?? '').trim()
  if (!name) return { error: 'Enter a name.' }

  try {
    const me = await getMyPlayer(supabase, leagueId, user.id)
    if (!me) return { error: 'Join the event first.' }
    await setMyDisplayName(supabase, me.id, name)
  } catch (error) {
    return { error: friendly(error) }
  }
  revalidatePath(`/podmatch/play/${leagueId}`)
  return { ok: true }
}

export async function startRoundAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sign in required.' }

  const leagueId = String(formData.get('leagueId') ?? '')
  const viewer = await getLeagueForViewer(supabase, leagueId, user.id).catch(() => null)
  if (!viewer || viewer.role !== 'admin') return { error: 'Only the host can start a round.' }

  try {
    const latest = await getEventLatestRound(supabase, leagueId)
    const result = await generateAndPersistEventRound(supabase, leagueId, latest + 1)
    if (result.podCount === 0) {
      return { error: 'Need at least 3 players to make a table.' }
    }
  } catch (error) {
    return { error: friendly(error) }
  }
  revalidatePath(`/podmatch/play/${leagueId}`)
  return { ok: true }
}

export async function reportResultAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Sign in required.' }

  const leagueId = String(formData.get('leagueId') ?? '')
  const podId = (formData.get('podId') as string) || null
  const roundNumber = Number(formData.get('roundNumber')) || 1
  const winnerId = String(formData.get('winnerId') ?? '')
  const seatIds = String(formData.get('seatIds') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (seatIds.length < 2) return { error: 'A game needs at least two players.' }
  if (!winnerId || !seatIds.includes(winnerId)) return { error: 'Pick the winner.' }

  const viewer = await getLeagueForViewer(supabase, leagueId, user.id).catch(() => null)
  if (!viewer) return { error: 'Event not found.' }

  const players: ReportGameInput['players'] = seatIds.map((pid) => ({
    player_id: pid,
    deck_id: null,
    placement: pid === winnerId ? 1 : null,
    eliminations: 0,
    combo_win: false,
    no_show: false,
    sportsmanship: false,
  }))

  try {
    const gameId = await reportGame(supabase, user.id, viewer.league, {
      leagueId,
      podId,
      roundNumber,
      players,
    })

    if (viewer.role === 'admin') {
      // Host result is authoritative — finalize immediately.
      await finalizeGame(supabase, gameId)
    } else {
      // Player result counts as their own confirmation (1 of 2). A tablemate
      // confirming, or the host finalizing, makes it official.
      const me = await getMyPlayer(supabase, leagueId, user.id)
      if (me) await confirmGameViaRpc(supabase, gameId, me.id)
    }
  } catch (error) {
    return { error: friendly(error) }
  }

  revalidatePath(`/podmatch/play/${leagueId}`)
  return { ok: true }
}

export async function confirmResultAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser()
  if (!user) return
  const leagueId = String(formData.get('leagueId') ?? '')
  const gameId = String(formData.get('gameId') ?? '')
  const playerId = String(formData.get('playerId') ?? '')
  try {
    const viewer = await getLeagueForViewer(supabase, leagueId, user.id)
    if (viewer?.role === 'admin') {
      await confirmGame(supabase, gameId, playerId)
    } else {
      await confirmGameViaRpc(supabase, gameId, playerId)
    }
  } catch {
    // reflected on next render
  }
  revalidatePath(`/podmatch/play/${leagueId}`)
}

export async function finalizeResultAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser()
  if (!user) return
  const leagueId = String(formData.get('leagueId') ?? '')
  const gameId = String(formData.get('gameId') ?? '')
  try {
    const viewer = await getLeagueForViewer(supabase, leagueId, user.id)
    if (viewer?.role === 'admin') await finalizeGame(supabase, gameId)
  } catch {
    // reflected on next render
  }
  revalidatePath(`/podmatch/play/${leagueId}`)
}
