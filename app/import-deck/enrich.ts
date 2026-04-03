'use server'

import { createClient } from '@/lib/supabase/server'
import {
  fetchScryfallCollection,
  scryfallToDeckCardUpdate,
  scryfallToDeckTokenUpdate,
} from '@/lib/scryfall/enrich'

type DeckCardRow = {
  id: number
  section: 'commander' | 'mainboard'
  quantity: number
  card_name: string
  set_code: string | null
  collector_number: string | null
}

type DeckTokenRow = {
  id: number
  quantity: number
  token_name: string
  set_code: string | null
  collector_number: string | null
}

type ScryfallCard = {
  id: string
  name: string
  set: string
  collector_number: string
}

function printKey(setCode: string | null, collectorNumber: string | null) {
  if (!setCode || !collectorNumber) return null
  return `${setCode.toLowerCase()}::${collectorNumber.toLowerCase()}`
}

function nameKey(name: string) {
  return name.trim().toLowerCase()
}

async function fetchCollectionSafe(
  identifiers: Array<
    | { set: string; collector_number: string }
    | { name: string }
  >
): Promise<ScryfallCard[]> {
  if (identifiers.length === 0) return []

  try {
    return (await fetchScryfallCollection(identifiers)) as ScryfallCard[]
  } catch (error) {
    console.error('Scryfall collection lookup failed:', error)
    return []
  }
}

function buildCardMatchMap(cards: ScryfallCard[]) {
  const byPrint = new Map<string, ScryfallCard>()
  const byName = new Map<string, ScryfallCard>()

  for (const card of cards) {
    const pKey = printKey(card.set, card.collector_number)
    if (pKey && !byPrint.has(pKey)) {
      byPrint.set(pKey, card)
    }

    const nKey = nameKey(card.name)
    if (!byName.has(nKey)) {
      byName.set(nKey, card)
    }
  }

  return { byPrint, byName }
}

async function resolveDeckCardMatches(cardRows: DeckCardRow[]) {
  const exactIdentifiers = cardRows
    .filter((row) => row.set_code && row.collector_number)
    .map((row) => ({
      set: row.set_code as string,
      collector_number: row.collector_number as string,
    }))

  const exactCards = await fetchCollectionSafe(exactIdentifiers)
  const exactMaps = buildCardMatchMap(exactCards)

  const unmatchedRows = cardRows.filter((row) => {
    const pKey = printKey(row.set_code, row.collector_number)
    if (!pKey) return true
    return !exactMaps.byPrint.has(pKey)
  })

  const fallbackCards = await fetchCollectionSafe(
    unmatchedRows.map((row) => ({ name: row.card_name }))
  )
  const fallbackMaps = buildCardMatchMap(fallbackCards)

  return cardRows.map((row) => {
    const pKey = printKey(row.set_code, row.collector_number)

    if (pKey) {
      const exactMatch = exactMaps.byPrint.get(pKey)
      if (exactMatch) return exactMatch
    }

    return fallbackMaps.byName.get(nameKey(row.card_name)) ?? null
  })
}

async function resolveDeckTokenMatches(tokenRows: DeckTokenRow[]) {
  const exactIdentifiers = tokenRows
    .filter((row) => row.set_code && row.collector_number)
    .map((row) => ({
      set: row.set_code as string,
      collector_number: row.collector_number as string,
    }))

  const exactCards = await fetchCollectionSafe(exactIdentifiers)
  const exactMaps = buildCardMatchMap(exactCards)

  const unmatchedRows = tokenRows.filter((row) => {
    const pKey = printKey(row.set_code, row.collector_number)
    if (!pKey) return true
    return !exactMaps.byPrint.has(pKey)
  })

  const fallbackCards = await fetchCollectionSafe(
    unmatchedRows.map((row) => ({ name: row.token_name }))
  )
  const fallbackMaps = buildCardMatchMap(fallbackCards)

  return tokenRows.map((row) => {
    const pKey = printKey(row.set_code, row.collector_number)

    if (pKey) {
      const exactMatch = exactMaps.byPrint.get(pKey)
      if (exactMatch) return exactMatch
    }

    return fallbackMaps.byName.get(nameKey(row.token_name)) ?? null
  })
}

export async function enrichDeckWithScryfall(deckId: number) {
  const supabase = await createClient()

  const { data: cards, error: cardsError } = await supabase
    .from('deck_cards')
    .select('id, section, quantity, card_name, set_code, collector_number')
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })

  if (cardsError) throw new Error(cardsError.message)

  const { data: tokens, error: tokensError } = await supabase
    .from('deck_tokens')
    .select('id, quantity, token_name, set_code, collector_number')
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })

  if (tokensError) throw new Error(tokensError.message)

  const cardRows = (cards ?? []) as DeckCardRow[]
  const tokenRows = (tokens ?? []) as DeckTokenRow[]

  const scryfallCards = await resolveDeckCardMatches(cardRows)
  const scryfallTokens = await resolveDeckTokenMatches(tokenRows)

  let totalUsd = 0
  let totalUsdFoil = 0
  let totalEur = 0

  for (let i = 0; i < cardRows.length; i++) {
    const row = cardRows[i]
    const match = scryfallCards[i]
    if (!match) continue

    const update = scryfallToDeckCardUpdate(match)

    const { error } = await supabase
      .from('deck_cards')
      .update(update)
      .eq('id', row.id)

    if (error) throw new Error(error.message)

    const usd = update.price_usd ?? 0
    const usdFoil = update.price_usd_foil ?? update.price_usd ?? 0
    const eur = update.price_eur ?? 0

    totalUsd += usd * row.quantity
    totalUsdFoil += usdFoil * row.quantity
    totalEur += eur * row.quantity
  }

  for (let i = 0; i < tokenRows.length; i++) {
    const row = tokenRows[i]
    const match = scryfallTokens[i]
    if (!match) continue

    const update = scryfallToDeckTokenUpdate(match)

    const { error } = await supabase
      .from('deck_tokens')
      .update(update)
      .eq('id', row.id)

    if (error) throw new Error(error.message)
  }

  const { data: commanderCard, error: commanderError } = await supabase
    .from('deck_cards')
    .select('card_name, image_url')
    .eq('deck_id', deckId)
    .eq('section', 'commander')
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (commanderError) throw new Error(commanderError.message)

  const deckUpdate: {
    commander?: string
    image_url?: string | null
    price_total_usd: number
    price_total_usd_foil: number
    price_total_eur: number
  } = {
    price_total_usd: Number(totalUsd.toFixed(2)),
    price_total_usd_foil: Number(totalUsdFoil.toFixed(2)),
    price_total_eur: Number(totalEur.toFixed(2)),
  }

  if (commanderCard?.card_name) deckUpdate.commander = commanderCard.card_name
  if (commanderCard?.image_url) deckUpdate.image_url = commanderCard.image_url

  const { error: deckUpdateError } = await supabase
    .from('decks')
    .update(deckUpdate)
    .eq('id', deckId)

  if (deckUpdateError) throw new Error(deckUpdateError.message)
}
