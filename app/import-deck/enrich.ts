'use server'

import type { ImportedDeckCard } from '@/lib/commander/types'
import { planCommanderOverlapRowFixes } from '@/lib/commander/normalize'
import { validateDeckForFormat } from '@/lib/commander/validate'
import { deriveDeckColorIdentity } from '@/lib/decks/color-identity'
import { normalizeDeckFormat } from '@/lib/decks/formats'
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

type EnrichedDeckCardRow = DeckCardRow & {
  sort_order: number | null
  image_url: string | null
  is_legendary: boolean | null
  is_background: boolean | null
  can_be_commander: boolean | null
  keywords: string[] | null
  partner_with_name: string | null
  color_identity: string[] | null
}

type DerivedStateCardRow = DeckCardRow & {
  image_url: string | null
  is_legendary: boolean | null
  is_background: boolean | null
  can_be_commander: boolean | null
  keywords: string[] | null
  partner_with_name: string | null
  color_identity: string[] | null
}

type ScryfallCard = {
  id: string
  name: string
  set: string
  set_name: string
  collector_number: string
}

function getMissingSchemaColumn(message?: string | null, table?: string) {
  if (!message) return null

  const schemaCacheMatch = message.match(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/i)
  if (schemaCacheMatch) {
    const [, columnName, tableName] = schemaCacheMatch
    if (!table || table === tableName.split('.').pop()) {
      return columnName
    }
  }

  const relationMatch = message.match(/column "([^"]+)" of relation "([^"]+)"/i)
  if (relationMatch) {
    const [, columnName, tableName] = relationMatch
    if (!table || table === tableName) {
      return columnName
    }
  }

  return null
}

async function updateRowWithSchemaFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: 'deck_cards' | 'deck_tokens' | 'decks',
  idValue: number,
  payload: Record<string, unknown>
) {
  const nextPayload = { ...payload }

  while (Object.keys(nextPayload).length > 0) {
    const { error } = await supabase.from(table).update(nextPayload).eq('id', idValue)

    if (!error) {
      return
    }

    const missingColumn = getMissingSchemaColumn(error.message, table)
    if (!missingColumn || !(missingColumn in nextPayload)) {
      throw new Error(error.message)
    }

    delete nextPayload[missingColumn]
  }

  throw new Error(`No supported ${table} enrichment fields could be written.`)
}

function isBasicLand(cardName: string) {
  const basics = new Set(['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes'])
  return basics.has(cardName.trim().toLowerCase())
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

async function captureDeckPriceSnapshot(
  deckId: number,
  priceTotalUsdFoil: number,
  snapshotType: 'import' | 'refresh'
) {
  const supabase = await createClient()

  if (snapshotType === 'import') {
    const { error } = await supabase.from('deck_price_history').insert({
      deck_id: deckId,
      snapshot_type: 'import',
      price_total_usd_foil: priceTotalUsdFoil,
      captured_at: new Date().toISOString(),
    })
    if (error) throw new Error(error.message)
    return
  }

  const { data: latestSnapshot, error: latestSnapshotError } = await supabase
    .from('deck_price_history')
    .select('captured_at')
    .eq('deck_id', deckId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestSnapshotError) {
    throw new Error(latestSnapshotError.message)
  }

  const today = new Date().toISOString().slice(0, 10)
  const latestDay = latestSnapshot?.captured_at?.slice(0, 10)

  if (latestDay === today) {
    return
  }

  const { error } = await supabase.from('deck_price_history').insert({
    deck_id: deckId,
    snapshot_type: 'refresh',
    price_total_usd_foil: priceTotalUsdFoil,
    captured_at: new Date().toISOString(),
  })

  if (error) {
    throw new Error(error.message)
  }
}

function isDeckPriceHistorySchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.deck_price_history'") ||
    message.includes('relation "public.deck_price_history"') ||
    message.includes("Could not find the relation 'public.deck_price_history'")
  )
}

function toImportedDeckCard(card: DerivedStateCardRow): ImportedDeckCard {
  return {
    section: card.section,
    quantity: card.quantity,
    cardName: card.card_name,
    foil: false,
    setCode: card.set_code ?? undefined,
    collectorNumber: card.collector_number ?? undefined,
    isLegendary: card.is_legendary ?? undefined,
    isBackground: card.is_background ?? undefined,
    canBeCommander: card.can_be_commander ?? undefined,
    keywords: card.keywords ?? undefined,
    partnerWithName: card.partner_with_name ?? undefined,
    colorIdentity: card.color_identity ?? undefined,
  }
}

function hasSingletonCommanderShape(cards: DerivedStateCardRow[]) {
  const totalNonTokenCards = cards.reduce((sum, card) => sum + card.quantity, 0)

  if (totalNonTokenCards !== 100) {
    return false
  }

  const seen = new Set<string>()

  for (const card of cards) {
    const key = card.card_name.trim().toLowerCase()

    if (card.quantity > 1 && !isBasicLand(key)) {
      return false
    }

    if (card.quantity === 1 && !isBasicLand(key)) {
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
    }
  }

  return true
}

async function inferCommanderDeckState(deckId: number) {
  const supabase = await createClient()

  const { data: deckData, error: deckError } = await supabase
    .from('decks')
    .select('id, format, commander')
    .eq('id', deckId)
    .single()

  if (deckError || !deckData) {
    throw new Error(deckError?.message ?? 'Failed to load deck for commander inference.')
  }

  const { data: cardsData, error: cardsError } = await supabase
    .from('deck_cards')
    .select(
      'id, section, quantity, card_name, set_code, collector_number, sort_order, image_url, is_legendary, is_background, can_be_commander, keywords, partner_with_name, color_identity'
    )
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })

  if (cardsError) {
    throw new Error(cardsError.message)
  }

  const cards = (cardsData ?? []) as DerivedStateCardRow[]
  const explicitCommanders = cards.filter((card) => card.section === 'commander')
  const currentFormat = normalizeDeckFormat(deckData.format)

  if (explicitCommanders.length > 0 || currentFormat === 'commander') {
    return
  }

  if (!hasSingletonCommanderShape(cards)) {
    return
  }

  const candidates = cards.filter(
    (card) =>
      card.section === 'mainboard' &&
      card.quantity === 1 &&
      (card.can_be_commander || card.is_legendary || card.is_background)
  )

  if (candidates.length === 0) {
    return
  }

  const byId = new Map<number, DerivedStateCardRow>(cards.map((card) => [card.id, card]))
  const selectedIds: number[] = []

  if (candidates.length === 1) {
    selectedIds.push(candidates[0].id)
  } else if (candidates.length === 2) {
    const promoted = cards.map((card) => {
      if (card.id === candidates[0].id || card.id === candidates[1].id) {
        return { ...toImportedDeckCard(card), section: 'commander' as const }
      }

      return toImportedDeckCard(card)
    })

    if (validateDeckForFormat(promoted, 'commander').isValid) {
      selectedIds.push(candidates[0].id, candidates[1].id)
    }
  }

  if (selectedIds.length > 0) {
    const { error: promoteError } = await supabase
      .from('deck_cards')
      .update({ section: 'commander' })
      .in('id', selectedIds)

    if (promoteError) {
      throw new Error(promoteError.message)
    }
  }

  const promotedCards = cards.map((card) => {
    if (selectedIds.includes(card.id)) {
      return { ...toImportedDeckCard(card), section: 'commander' as const }
    }

    return toImportedDeckCard(card)
  })

  const validation = validateDeckForFormat(promotedCards, 'commander')
  const commanderNames = promotedCards
    .filter((card) => card.section === 'commander')
    .map((card) => card.cardName)

  const promotedLead = selectedIds.length > 0 ? byId.get(selectedIds[0]) : null

  const deckUpdate: {
    format: 'commander'
    commander: string | null
    commander_count: number
    mainboard_count: number
    token_count: number
    commander_mode: string
    commander_names: string[]
    is_valid: boolean
    validation_errors: string[]
    image_url?: string | null
  } = {
    format: 'commander',
    commander: commanderNames[0] ?? null,
    commander_count: validation.commanderCount,
    mainboard_count: validation.mainboardCount,
    token_count: validation.tokenCount,
    commander_mode: validation.commanderMode,
    commander_names: commanderNames,
    is_valid: validation.isValid,
    validation_errors: validation.errors,
  }

  if (promotedLead?.image_url) {
    deckUpdate.image_url = promotedLead.image_url
  }

  const { error: updateError } = await supabase
    .from('decks')
    .update(deckUpdate)
    .eq('id', deckId)

  if (updateError) {
    throw new Error(updateError.message)
  }
}

export async function syncDeckDerivedState(deckId: number) {
  const supabase = await createClient()

  const { data: deckData, error: deckError } = await supabase
    .from('decks')
    .select('id, format')
    .eq('id', deckId)
    .single()

  if (deckError || !deckData) {
    throw new Error(deckError?.message ?? 'Failed to load deck state.')
  }

  const { data: cardsData, error: cardsError } = await supabase
    .from('deck_cards')
    .select(
      'id, section, quantity, card_name, set_code, set_name, collector_number, foil, image_url, is_legendary, is_background, can_be_commander, keywords, partner_with_name, color_identity'
    )
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })

  if (cardsError) {
    throw new Error(cardsError.message)
  }

  let cards = (cardsData ?? []) as DerivedStateCardRow[]

  if (normalizeDeckFormat(deckData.format) === 'commander') {
    const overlapFixes = planCommanderOverlapRowFixes(cards)

    for (const update of overlapFixes.updates) {
      const { error } = await supabase
        .from('deck_cards')
        .update({ quantity: update.quantity })
        .eq('id', update.id)

      if (error) {
        throw new Error(error.message)
      }
    }

    if (overlapFixes.deletes.length > 0) {
      const { error } = await supabase
        .from('deck_cards')
        .delete()
        .in('id', overlapFixes.deletes)

      if (error) {
        throw new Error(error.message)
      }
    }

    if (overlapFixes.hasFixes) {
      const { data: refreshedCardsData, error: refreshedCardsError } = await supabase
        .from('deck_cards')
        .select(
          'id, section, quantity, card_name, set_code, set_name, collector_number, foil, image_url, is_legendary, is_background, can_be_commander, keywords, partner_with_name, color_identity'
        )
        .eq('deck_id', deckId)
        .order('sort_order', { ascending: true })

      if (refreshedCardsError) {
        throw new Error(refreshedCardsError.message)
      }

      cards = (refreshedCardsData ?? []) as DerivedStateCardRow[]
    }
  }

  const { data: tokensData, error: tokensError } = await supabase
    .from('deck_tokens')
    .select('quantity')
    .eq('deck_id', deckId)

  if (tokensError) {
    throw new Error(tokensError.message)
  }

  const importedCards = cards.map(toImportedDeckCard)
  const validation = validateDeckForFormat(importedCards, deckData.format)
  const commanderNames = importedCards
    .filter((card) => card.section === 'commander')
    .map((card) => card.cardName)
  const leadCommander = cards.find((card) => card.section === 'commander')
  const tokenCount = (tokensData ?? []).reduce(
    (sum, token) => sum + Number(token.quantity ?? 0),
    0
  )
  const deckColorIdentity = deriveDeckColorIdentity(cards)

  const { error: updateError } = await supabase
    .from('decks')
    .update({
      commander: commanderNames[0] ?? null,
      commander_count: validation.commanderCount,
      mainboard_count: validation.mainboardCount,
      token_count: tokenCount,
      commander_mode: validation.commanderMode,
      commander_names: commanderNames,
      is_valid: validation.isValid,
      validation_errors: validation.errors,
      color_identity: deckColorIdentity,
      image_url: leadCommander?.image_url ?? undefined,
    })
    .eq('id', deckId)

  if (updateError) {
    throw new Error(updateError.message)
  }
}

export async function enrichDeckWithScryfall(
  deckId: number,
  snapshotType: 'import' | 'refresh' = 'refresh'
) {
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

    await updateRowWithSchemaFallback(supabase, 'deck_cards', row.id, update)

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

    await updateRowWithSchemaFallback(supabase, 'deck_tokens', row.id, update)
  }

  const { data: leadCard, error: leadCardError } = await supabase
    .from('deck_cards')
    .select('card_name, image_url, section, sort_order')
    .eq('deck_id', deckId)
    .order('section', { ascending: true })
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (leadCardError) throw new Error(leadCardError.message)

  const deckUpdate: {
    commander?: string | null
    image_url?: string | null
    price_total_usd: number
    price_total_usd_foil: number
    price_total_eur: number
  } = {
    price_total_usd: Number(totalUsd.toFixed(2)),
    price_total_usd_foil: Number(totalUsdFoil.toFixed(2)),
    price_total_eur: Number(totalEur.toFixed(2)),
  }

  if (leadCard?.section === 'commander' && leadCard.card_name) {
    deckUpdate.commander = leadCard.card_name
  }
  if (leadCard?.image_url) deckUpdate.image_url = leadCard.image_url

  await updateRowWithSchemaFallback(supabase, 'decks', deckId, deckUpdate)

  await inferCommanderDeckState(deckId)
  await syncDeckDerivedState(deckId)

  try {
    await captureDeckPriceSnapshot(deckId, Number(totalUsdFoil.toFixed(2)), snapshotType)
  } catch (error) {
    if (
      error instanceof Error &&
      isDeckPriceHistorySchemaMissing(error.message)
    ) {
      console.warn('Skipping deck price snapshot because deck_price_history is missing.')
      return
    }

    throw error
  }
}
