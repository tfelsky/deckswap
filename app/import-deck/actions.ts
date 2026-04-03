'use server'

import { createClient } from '@/lib/supabase/server'
import { parseDeckText } from '@/lib/commander/parse'
import { validateCommanderDeck } from '@/lib/commander/validate'
import { redirect } from 'next/navigation'
import { enrichDeckWithScryfall } from './enrich'

type ActionState = {
  error?: string
  success?: boolean
  validationErrors?: string[]
}

export async function importDeckAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to import a deck.' }
  }

  const deckName = String(formData.get('deck_name') || '').trim()
  const sourceType = String(formData.get('source_type') || 'text').trim()
  const sourceUrl = String(formData.get('source_url') || '').trim()
  const rawList = String(formData.get('raw_list') || '').trim()

  if (!deckName) {
    return { error: 'Deck name is required.' }
  }

  if (!rawList) {
    return { error: 'Paste a deck list first.' }
  }

  const parsedCards = parseDeckText(rawList)

  if (parsedCards.length === 0) {
    return { error: 'No cards could be parsed from that input.' }
  }

  const validation = validateCommanderDeck(parsedCards)

  const commanderNames = parsedCards
  .filter((c) => c.section === 'commander')
  .map((c) => c.cardName)

const primaryCommanderName = commanderNames[0] ?? null

 const { data: deckRow, error: deckError } = await supabase
  .from('decks')
  .insert([
    {
      user_id: user.id,
      name: deckName,
      commander: primaryCommanderName,
      format: 'commander',
      commander_count: validation.commanderCount,
      mainboard_count: validation.mainboardCount,
      token_count: validation.tokenCount,
      commander_mode: validation.commanderMode,
      commander_names: commanderNames,
      is_valid: validation.isValid,
      validation_errors: validation.errors,
      source_type: sourceType || 'text',
      source_url: sourceUrl || null,
    },
  ])
  .select('id')
  .single()

  if (deckError || !deckRow) {
    return { error: deckError?.message || 'Failed to create deck.' }
  }

  const deckId = deckRow.id

  const deckCards = parsedCards
    .filter((c) => c.section === 'commander' || c.section === 'mainboard')
    .map((c, index) => ({
      deck_id: deckId,
      section: c.section,
      quantity: c.quantity,
      card_name: c.cardName,
      set_code: c.setCode ?? null,
      set_name: c.setName ?? null,
      collector_number: c.collectorNumber ?? null,
      foil: c.foil ?? false,
      sort_order: index,
    }))

  const deckTokens = parsedCards
    .filter((c) => c.section === 'token')
    .map((c, index) => ({
      deck_id: deckId,
      quantity: c.quantity,
      token_name: c.cardName,
      set_code: c.setCode ?? null,
      set_name: c.setName ?? null,
      collector_number: c.collectorNumber ?? null,
      foil: c.foil ?? false,
      sort_order: index,
    }))

  if (deckCards.length > 0) {
    const { error: cardError } = await supabase.from('deck_cards').insert(deckCards)
    if (cardError) {
      return { error: cardError.message }
    }
  }


  if (deckTokens.length > 0) {
    const { error: tokenError } = await supabase.from('deck_tokens').insert(deckTokens)
    if (tokenError) {
      return { error: tokenError.message }
    }
  }
try {
  await enrichDeckWithScryfall(deckId)
} catch (error) {
  console.error('Scryfall enrichment failed:', error)
}  if (!validation.isValid) {
    return {
      success: true,
      validationErrors: validation.errors,
    }
  }

  redirect(`/decks/${deckId}`)
}