'use server'

import { parseDeckText } from '@/lib/commander/parse'
import { validateCommanderDeck } from '@/lib/commander/validate'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { enrichDeckWithScryfall } from './enrich'

type ActionState = {
  error?: string
  fields?: {
    deckName: string
    sourceType: string
    sourceUrl: string
    rawList: string
  }
}

function buildActionFields(
  deckName: string,
  sourceType: string,
  sourceUrl: string,
  rawList: string
) {
  return {
    deckName,
    sourceType,
    sourceUrl,
    rawList,
  }
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
  const fields = buildActionFields(deckName, sourceType, sourceUrl, rawList)

  if (!deckName) {
    return { error: 'Deck name is required.', fields }
  }

  if (!rawList) {
    return { error: 'Paste a deck list first.', fields }
  }

  const parsedCards = parseDeckText(rawList, sourceType)

  if (parsedCards.length === 0) {
    return { error: 'No cards could be parsed from that input.', fields }
  }

  const validation = validateCommanderDeck(parsedCards)
  const commanderNames = parsedCards
    .filter((card) => card.section === 'commander')
    .map((card) => card.cardName)

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
    return { error: deckError?.message || 'Failed to create deck.', fields }
  }

  const deckId = deckRow.id

  const deckCards = parsedCards
    .filter((card) => card.section === 'commander' || card.section === 'mainboard')
    .map((card, index) => ({
      deck_id: deckId,
      section: card.section,
      quantity: card.quantity,
      card_name: card.cardName,
      set_code: card.setCode ?? null,
      set_name: card.setName ?? null,
      collector_number: card.collectorNumber ?? null,
      foil: card.foil ?? false,
      sort_order: index,
    }))

  const deckTokens = parsedCards
    .filter((card) => card.section === 'token')
    .map((card, index) => ({
      deck_id: deckId,
      quantity: card.quantity,
      token_name: card.cardName,
      set_code: card.setCode ?? null,
      set_name: card.setName ?? null,
      collector_number: card.collectorNumber ?? null,
      foil: card.foil ?? false,
      sort_order: index,
    }))

  if (deckCards.length > 0) {
    const { error: cardError } = await supabase.from('deck_cards').insert(deckCards)

    if (cardError) {
      return { error: cardError.message, fields }
    }
  }

  if (deckTokens.length > 0) {
    const { error: tokenError } = await supabase.from('deck_tokens').insert(deckTokens)

    if (tokenError) {
      return { error: tokenError.message, fields }
    }
  }

  try {
    await enrichDeckWithScryfall(deckId)
  } catch (error) {
    console.error('Scryfall enrichment failed:', error)
  }

  redirect(`/decks/${deckId}${validation.isValid ? '' : '?imported=1'}`)
}
