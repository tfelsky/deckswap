'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  DECK_SCORES_SETUP_MESSAGE,
  getDeckForScoring,
  persistDeckScore,
} from '@/lib/podmatch/decks'
import { buildRuleZeroProfile } from '@/lib/podmatch/rule-zero'
import { scoreDeck } from '@/lib/podmatch/scoring'

export type ScoreDeckActionState = { error?: string; ok?: boolean }

export async function scoreDeckAction(
  _prev: ScoreDeckActionState,
  formData: FormData
): Promise<ScoreDeckActionState> {
  const deckId = Number(formData.get('deckId'))
  if (!Number.isFinite(deckId) || deckId <= 0) {
    return { error: 'Invalid deck.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to score a deck.' }
  }

  let deckBundle
  try {
    deckBundle = await getDeckForScoring(supabase, deckId, user.id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to load deck.' }
  }

  if (!deckBundle) {
    return { error: 'Deck not found or not yours.' }
  }

  const { deck, cards } = deckBundle
  if (!cards.length) {
    return { error: 'This deck has no cards to score yet. Import a decklist first.' }
  }

  const score = scoreDeck(cards)
  const ruleZero = buildRuleZeroProfile(deck, score, cards)

  try {
    const { schemaMissing } = await persistDeckScore(supabase, deckId, score, ruleZero)
    if (schemaMissing) {
      return { error: DECK_SCORES_SETUP_MESSAGE }
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to save score.' }
  }

  revalidatePath('/podmatch')
  revalidatePath(`/podmatch/decks/${deckId}`)
  return { ok: true }
}
