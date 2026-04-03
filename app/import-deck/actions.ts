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
  requiresCommanderSelection?: boolean
  commanderCandidates?: string[]
  fields?: {
    deckName: string
    sourceType: string
    sourceUrl: string
    rawList: string
    commanderName: string
  }
}

function buildActionFields(
  deckName: string,
  sourceType: string,
  sourceUrl: string,
  rawList: string,
  commanderName: string
) {
  return {
    deckName,
    sourceType,
    sourceUrl,
    rawList,
    commanderName,
  }
}

function getCommanderCandidates(cards: ReturnType<typeof parseDeckText>) {
  const seen = new Set<string>()
  const candidates: string[] = []

  for (const card of cards) {
    if (card.section === 'token') continue

    const normalized = card.cardName.trim()
    const key = normalized.toLowerCase()

    if (!normalized || seen.has(key)) continue

    seen.add(key)
    candidates.push(normalized)
  }

  return candidates
}

function assignSelectedCommander(
  cards: ReturnType<typeof parseDeckText>,
  commanderName: string
) {
  const normalizedCommander = commanderName.trim().toLowerCase()
  const nextCards: ReturnType<typeof parseDeckText> = []
  let assigned = false

  for (const card of cards) {
    if (
      !assigned &&
      card.section !== 'token' &&
      card.cardName.trim().toLowerCase() === normalizedCommander
    ) {
      nextCards.push({
        ...card,
        section: 'commander',
        quantity: 1,
      })

      if (card.quantity > 1) {
        nextCards.push({
          ...card,
          section: 'mainboard',
          quantity: card.quantity - 1,
        })
      }

      assigned = true
      continue
    }

    nextCards.push(card)
  }

  return assigned ? nextCards : null
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
  const commanderName = String(formData.get('commander_name') || '').trim()
  const fields = buildActionFields(
    deckName,
    sourceType,
    sourceUrl,
    rawList,
    commanderName
  )

  if (!deckName) {
    return { error: 'Deck name is required.', fields }
  }

  if (!rawList) {
    return { error: 'Paste a deck list first.', fields }
  }

  let parsedCards = parseDeckText(rawList, sourceType)

  if (parsedCards.length === 0) {
    return { error: 'No cards could be parsed from that input.', fields }
  }

  const hasExplicitCommander = parsedCards.some((c) => c.section === 'commander')

  if (sourceType.toLowerCase() === 'archidekt' && !hasExplicitCommander) {
    const commanderCandidates = getCommanderCandidates(parsedCards)

    if (commanderCandidates.length === 0) {
      return {
        error: 'No commander candidates were found in that Archidekt list.',
        fields,
      }
    }

    if (!commanderName) {
      return {
        requiresCommanderSelection: true,
        commanderCandidates,
        fields,
      }
    }

    const selectedCards = assignSelectedCommander(parsedCards, commanderName)

    if (!selectedCards) {
      return {
        error: 'Choose a commander from the imported card list.',
        requiresCommanderSelection: true,
        commanderCandidates,
        fields,
      }
    }

    parsedCards = selectedCards
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
    return { error: deckError?.message || 'Failed to create deck.', fields }
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
}  if (!validation.isValid) {
    return {
      success: true,
      validationErrors: validation.errors,
      fields,
    }
  }

  redirect(`/decks/${deckId}`)
}
