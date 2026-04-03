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
  card_name: string
  set_code: string | null
  collector_number: string | null
}

type DeckTokenRow = {
  id: number
  token_name: string
  set_code: string | null
  collector_number: string | null
}

export async function enrichDeckWithScryfall(deckId: number) {
  const supabase = await createClient()

  const { data: cards, error: cardsError } = await supabase
    .from('deck_cards')
    .select('id, section, card_name, set_code, collector_number')
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })

  if (cardsError) throw new Error(cardsError.message)

  const { data: tokens, error: tokensError } = await supabase
    .from('deck_tokens')
    .select('id, token_name, set_code, collector_number')
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })

  if (tokensError) throw new Error(tokensError.message)

  const cardRows = (cards ?? []) as DeckCardRow[]
  const tokenRows = (tokens ?? []) as DeckTokenRow[]

  const cardIdentifiers = cardRows.map((row) =>
    row.set_code && row.collector_number
      ? { set: row.set_code, collector_number: row.collector_number }
      : { name: row.card_name }
  )

  const tokenIdentifiers = tokenRows.map((row) =>
    row.set_code && row.collector_number
      ? { set: row.set_code, collector_number: row.collector_number }
      : { name: row.token_name }
  )

  const scryfallCards = cardIdentifiers.length
    ? await fetchScryfallCollection(cardIdentifiers)
    : []

  const scryfallTokens = tokenIdentifiers.length
    ? await fetchScryfallCollection(tokenIdentifiers)
    : []

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

    totalUsd += usd
    totalUsdFoil += usdFoil
    totalEur += eur
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