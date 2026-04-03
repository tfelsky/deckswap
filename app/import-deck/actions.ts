'use server'

import { parseDeckText } from '@/lib/commander/parse'
import { validateCommanderDeck } from '@/lib/commander/validate'
import { fetchMoxfieldDeck } from '@/lib/deck-sources/moxfield'
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
  const deckFile = formData.get('deck_file')
  const fields = buildActionFields(deckName, sourceType, sourceUrl, rawList)

  let resolvedDeckName = deckName
  let resolvedRawList = rawList
  let parsedCards =
    sourceType.toLowerCase() === 'moxfield' ? [] : parseDeckText(resolvedRawList, sourceType)

  if (
    deckFile instanceof File &&
    deckFile.size > 0 &&
    !resolvedRawList
  ) {
    resolvedRawList = (await deckFile.text()).trim()

    if (!resolvedDeckName) {
      resolvedDeckName = deckFile.name.replace(/\.[^.]+$/, '').trim()
    }

    parsedCards = parseDeckText(resolvedRawList, sourceType)
  }

  if (sourceType.toLowerCase() === 'moxfield') {
    if (!sourceUrl) {
      return {
        error: 'Add a Moxfield deck URL to import from a link.',
        fields: buildActionFields(resolvedDeckName, sourceType, sourceUrl, resolvedRawList),
      }
    }

    try {
      const deck = await fetchMoxfieldDeck(sourceUrl)
      parsedCards = deck.cards

      if (!resolvedDeckName) {
        resolvedDeckName = deck.deckName ?? ''
      }
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to import that Moxfield deck.',
        fields: buildActionFields(resolvedDeckName, sourceType, sourceUrl, resolvedRawList),
      }
    }
  }

  if (!resolvedDeckName) {
    return {
      error: 'Deck name is required unless the source provides one.',
      fields: buildActionFields(resolvedDeckName, sourceType, sourceUrl, resolvedRawList),
    }
  }

  if (parsedCards.length === 0) {
    return {
      error:
        resolvedRawList || deckFile instanceof File
          ? 'No cards could be parsed from that input.'
          : 'Paste a deck list, upload a .txt file, or provide a supported deck URL.',
      fields: buildActionFields(resolvedDeckName, sourceType, sourceUrl, resolvedRawList),
    }
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
        name: resolvedDeckName,
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
    return {
      error: deckError?.message || 'Failed to create deck.',
      fields: buildActionFields(resolvedDeckName, sourceType, sourceUrl, resolvedRawList),
    }
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
      return {
        error: cardError.message,
        fields: buildActionFields(resolvedDeckName, sourceType, sourceUrl, resolvedRawList),
      }
    }
  }

  if (deckTokens.length > 0) {
    const { error: tokenError } = await supabase.from('deck_tokens').insert(deckTokens)

    if (tokenError) {
      return {
        error: tokenError.message,
        fields: buildActionFields(resolvedDeckName, sourceType, sourceUrl, resolvedRawList),
      }
    }
  }

  try {
    await enrichDeckWithScryfall(deckId)
  } catch (error) {
    console.error('Scryfall enrichment failed:', error)
  }

  redirect(`/decks/${deckId}${validation.isValid ? '' : '?imported=1'}`)
}
