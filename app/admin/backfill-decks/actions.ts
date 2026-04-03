'use server'

import { requireSuperadmin } from '@/lib/admin/access'
import { enrichDeckWithScryfall } from '@/app/import-deck/enrich'

type BackfillResult = {
  updated: number
  skipped: number
  errors: string[]
}

export async function backfillDeckCommanderImages(): Promise<BackfillResult> {
  const { supabase } = await requireSuperadmin()

  const { data: decks, error: decksError } = await supabase
    .from('decks')
    .select('id, commander, image_url')
    .order('id', { ascending: true })

  if (decksError) {
    throw new Error(decksError.message)
  }

  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (const deck of decks ?? []) {
    const { data: commanderCard, error: commanderError } = await supabase
      .from('deck_cards')
      .select('card_name, image_url')
      .eq('deck_id', deck.id)
      .eq('section', 'commander')
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (commanderError) {
      errors.push(`Deck ${deck.id}: ${commanderError.message}`)
      continue
    }

    if (!commanderCard) {
      skipped++
      continue
    }

    const needsCommanderUpdate =
      !deck.commander || deck.commander.trim() === ''

    const needsImageUpdate =
      !deck.image_url || deck.image_url.trim() === ''

    if (!needsCommanderUpdate && !needsImageUpdate) {
      skipped++
      continue
    }

    const updatePayload: {
      commander?: string
      image_url?: string | null
    } = {}

    if (needsCommanderUpdate) {
      updatePayload.commander = commanderCard.card_name
    }

    if (needsImageUpdate) {
      updatePayload.image_url = commanderCard.image_url ?? null
    }

    const { error: updateError } = await supabase
      .from('decks')
      .update(updatePayload)
      .eq('id', deck.id)

    if (updateError) {
      errors.push(`Deck ${deck.id}: ${updateError.message}`)
      continue
    }

    updated++
  }

  return {
    updated,
    skipped,
    errors,
  }
}

export async function reEnrichAllDecks(): Promise<BackfillResult> {
  const { supabase } = await requireSuperadmin()

  const { data: decks, error: decksError } = await supabase
    .from('decks')
    .select('id')
    .order('id', { ascending: true })

  if (decksError) {
    throw new Error(decksError.message)
  }

  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (const deck of decks ?? []) {
    try {
      await enrichDeckWithScryfall(deck.id)
      updated++
    } catch (error) {
      skipped++
      errors.push(
        `Deck ${deck.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  return {
    updated,
    skipped,
    errors,
  }
}
