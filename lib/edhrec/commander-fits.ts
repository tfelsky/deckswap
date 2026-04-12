import { createAdminClient } from '@/lib/supabase/admin'

const EDHREC_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const EDHREC_ERROR_RETRY_MS = 3 * 24 * 60 * 60 * 1000
const EDHREC_NO_MATCH_RETRY_MS = 14 * 24 * 60 * 60 * 1000
const EDHREC_CONCURRENCY = 2
const EDHREC_DAILY_CARD_LIMIT = 150
const EDHREC_USER_AGENT = 'Mozilla/5.0 (compatible; DeckSwap/1.0; +https://deckswap.local)'

type SupabaseAdmin = ReturnType<typeof createAdminClient>

type CacheKeyType = 'oracle_id' | 'name'
type MatchStatus = 'matched' | 'no_match' | 'error'
type FetchStatus = 'ok' | 'no_match' | 'error'

export type DeckCardCommanderMatchRow = {
  deck_card_id: number
  matched_commander_name?: string | null
  edhrec_rank?: number | null
  inclusion_percent?: number | null
  card_deck_count?: number | null
  commander_deck_count?: number | null
  source_url?: string | null
  cache_scraped_at?: string | null
  match_status?: MatchStatus | null
}

type OwnedDeckCard = {
  id: number
  deck_id: number
  user_id: string
  card_name: string
  oracle_id?: string | null
  quantity: number
}

type CachedCommanderRec = {
  card_key_type: CacheKeyType
  card_key: string
  oracle_id?: string | null
  normalized_card_name: string
  raw_card_name: string
  commander_name?: string | null
  normalized_commander_name?: string | null
  edhrec_rank: number
  inclusion_percent?: number | null
  card_deck_count?: number | null
  commander_deck_count?: number | null
  fetch_status: FetchStatus
  fetch_error?: string | null
  source_url?: string | null
  scraped_at: string
}

type ParsedCommanderRec = {
  commanderName: string
  edhrecRank: number
  inclusionPercent: number | null
  cardDeckCount: number | null
  commanderDeckCount: number | null
}

type RefreshCommanderFitsOptions = {
  force?: boolean
  deckId?: number
  maxDistinctCards?: number
}

type RefreshCommanderFitsResult = {
  cardRowsProcessed: number
  distinctCardsProcessed: number
  distinctCardsRequested: number
  matchedCount: number
  noMatchCount: number
  errorCount: number
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function buildEdhrecSlug(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function htmlToMeaningfulLines(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, '\n')
  )
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function parseCompactDeckCount(value: string) {
  const trimmed = value.trim().toUpperCase()
  const match = trimmed.match(/^(\d+(?:\.\d+)?)([KM])?$/)
  if (!match) return null

  const base = Number(match[1])
  if (!Number.isFinite(base)) return null

  const multiplier = match[2] === 'M' ? 1_000_000 : match[2] === 'K' ? 1_000 : 1
  return Math.round(base * multiplier)
}

function parseCommanderStatLine(line: string) {
  const match = line.match(
    /^(\d+(?:\.\d+)?)%inclusion\s+([0-9.]+[KM]?)\s+decks\s+([0-9.]+[KM]?)\s+decks$/i
  )
  if (!match) return null

  const inclusionPercent = Number(match[1])
  return {
    inclusionPercent: Number.isFinite(inclusionPercent) ? inclusionPercent : null,
    cardDeckCount: parseCompactDeckCount(match[2]),
    commanderDeckCount: parseCompactDeckCount(match[3]),
  }
}

const EDHREC_SECTION_HEADINGS = new Set([
  'Top Commanders',
  'New Cards',
  'Top Cards',
  'Game Changers',
  'Creatures',
  'Instants',
  'Sorceries',
  'Utility Artifacts',
  'Enchantments',
  'Battles',
  'Planeswalkers',
  'Utility Lands',
  'Mana Artifacts',
  'Lands',
  'Back to Top',
  'Group by',
  'Sort by',
  'Filters Card Filters',
])

function findTopCommandersStart(lines: string[]) {
  return lines.findIndex((line) => line === 'Top Commanders')
}

export function parseEdhrecTopCommandersFromHtml(html: string) {
  const lines = htmlToMeaningfulLines(html)
  const start = findTopCommandersStart(lines)

  if (start === -1) {
    return []
  }

  const results: ParsedCommanderRec[] = []
  let sawStats = false

  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]
    const stats = parseCommanderStatLine(lines[index])

    if (!stats) {
      if (sawStats && EDHREC_SECTION_HEADINGS.has(line)) {
        break
      }
      continue
    }

    sawStats = true

    const commanderName = lines[index - 1]?.trim() || ''
    if (!commanderName || commanderName === 'Top Commanders') continue

    results.push({
      commanderName,
      edhrecRank: results.length + 1,
      inclusionPercent: stats.inclusionPercent,
      cardDeckCount: stats.cardDeckCount,
      commanderDeckCount: stats.commanderDeckCount,
    })
  }

  return results
}

function buildCacheIdentity(card: Pick<OwnedDeckCard, 'card_name' | 'oracle_id'>) {
  const normalizedCardName = normalizeName(card.card_name)
  const oracleId = String(card.oracle_id ?? '').trim().toLowerCase()

  if (oracleId) {
    return {
      cardKeyType: 'oracle_id' as const,
      cardKey: oracleId,
      oracleId,
      normalizedCardName,
      rawCardName: card.card_name.trim(),
    }
  }

  return {
    cardKeyType: 'name' as const,
    cardKey: normalizedCardName,
    oracleId: null,
    normalizedCardName,
    rawCardName: card.card_name.trim(),
  }
}

function cacheMapKey(cardKeyType: CacheKeyType, cardKey: string) {
  return `${cardKeyType}:${cardKey}`
}

function isFreshScrape(rows: CachedCommanderRec[]) {
  const latest = rows.reduce<number | null>((max, row) => {
    const value = Date.parse(row.scraped_at)
    if (!Number.isFinite(value)) return max
    return max == null ? value : Math.max(max, value)
  }, null)

  return latest != null && Date.now() - latest <= EDHREC_CACHE_TTL_MS
}

function getLatestScrapeAgeMs(rows: CachedCommanderRec[]) {
  const latest = rows.reduce<number | null>((max, row) => {
    const value = Date.parse(row.scraped_at)
    if (!Number.isFinite(value)) return max
    return max == null ? value : Math.max(max, value)
  }, null)

  return latest == null ? null : Date.now() - latest
}

function shouldRefreshCachedRows(rows: CachedCommanderRec[], force = false) {
  if (force) return true
  if (rows.length === 0) return true

  const ageMs = getLatestScrapeAgeMs(rows)
  if (ageMs == null) return true

  const hasOk = rows.some((row) => row.fetch_status === 'ok')
  if (hasOk) {
    return ageMs > EDHREC_CACHE_TTL_MS
  }

  const hasNoMatch = rows.some((row) => row.fetch_status === 'no_match')
  if (hasNoMatch) {
    return ageMs > EDHREC_NO_MATCH_RETRY_MS
  }

  return ageMs > EDHREC_ERROR_RETRY_MS
}

async function fetchCommanderDirectoryNames(
  supabase: SupabaseAdmin,
  normalizedNames: string[]
) {
  if (normalizedNames.length === 0) return new Map<string, string>()

  const { data, error } = await supabase
    .from('commander_directory')
    .select('name, normalized_name')
    .in('normalized_name', normalizedNames)

  if (error) {
    console.error('Commander directory lookup failed:', error.message)
    return new Map<string, string>()
  }

  return new Map(
    ((data ?? []) as Array<{ name?: string | null; normalized_name?: string | null }>)
      .filter((row) => row.name && row.normalized_name)
      .map((row) => [String(row.normalized_name), String(row.name)])
  )
}

async function readCachedRecsForKey(
  supabase: SupabaseAdmin,
  cardKeyType: CacheKeyType,
  cardKey: string
) {
  const { data, error } = await supabase
    .from('edhrec_card_commander_recs')
    .select(
      'card_key_type, card_key, oracle_id, normalized_card_name, raw_card_name, commander_name, normalized_commander_name, edhrec_rank, inclusion_percent, card_deck_count, commander_deck_count, fetch_status, fetch_error, source_url, scraped_at'
    )
    .eq('card_key_type', cardKeyType)
    .eq('card_key', cardKey)
    .order('edhrec_rank', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as CachedCommanderRec[]
}

async function storeCachedRecsForKey(
  supabase: SupabaseAdmin,
  cardIdentity: ReturnType<typeof buildCacheIdentity>,
  rows: CachedCommanderRec[]
) {
  const { error: deleteError } = await supabase
    .from('edhrec_card_commander_recs')
    .delete()
    .eq('card_key_type', cardIdentity.cardKeyType)
    .eq('card_key', cardIdentity.cardKey)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  if (rows.length === 0) {
    return
  }

  const { error: insertError } = await supabase
    .from('edhrec_card_commander_recs')
    .insert(rows)

  if (insertError) {
    throw new Error(insertError.message)
  }
}

async function fetchAndCacheRecsForCard(
  supabase: SupabaseAdmin,
  card: OwnedDeckCard,
  force = false
) {
  const identity = buildCacheIdentity(card)
  const existingRows = await readCachedRecsForKey(supabase, identity.cardKeyType, identity.cardKey)

  if (!shouldRefreshCachedRows(existingRows, force)) {
    return existingRows
  }

  const sourceUrl = `https://edhrec.com/cards/${buildEdhrecSlug(identity.rawCardName)}`

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        Accept: 'text/html',
        'User-Agent': EDHREC_USER_AGENT,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`EDHREC request failed with status ${response.status}.`)
    }

    const html = await response.text()
    const parsedRows = parseEdhrecTopCommandersFromHtml(html)
    const scrapedAt = new Date().toISOString()
    const commanderNameMap = await fetchCommanderDirectoryNames(
      supabase,
      Array.from(new Set(parsedRows.map((row) => normalizeName(row.commanderName))))
    )

    const nextRows: CachedCommanderRec[] =
      parsedRows.length > 0
        ? parsedRows.map((row) => {
            const normalizedCommanderName = normalizeName(row.commanderName)
            return {
              card_key_type: identity.cardKeyType,
              card_key: identity.cardKey,
              oracle_id: identity.oracleId,
              normalized_card_name: identity.normalizedCardName,
              raw_card_name: identity.rawCardName,
              commander_name:
                commanderNameMap.get(normalizedCommanderName) ?? row.commanderName,
              normalized_commander_name: normalizedCommanderName,
              edhrec_rank: row.edhrecRank,
              inclusion_percent: row.inclusionPercent,
              card_deck_count: row.cardDeckCount,
              commander_deck_count: row.commanderDeckCount,
              fetch_status: 'ok',
              fetch_error: null,
              source_url: response.url || sourceUrl,
              scraped_at: scrapedAt,
            }
          })
        : [
            {
              card_key_type: identity.cardKeyType,
              card_key: identity.cardKey,
              oracle_id: identity.oracleId,
              normalized_card_name: identity.normalizedCardName,
              raw_card_name: identity.rawCardName,
              commander_name: null,
              normalized_commander_name: null,
              edhrec_rank: 0,
              inclusion_percent: null,
              card_deck_count: null,
              commander_deck_count: null,
              fetch_status: 'no_match',
              fetch_error: null,
              source_url: response.url || sourceUrl,
              scraped_at: scrapedAt,
            },
          ]

    await storeCachedRecsForKey(supabase, identity, nextRows)
    return nextRows
  } catch (error) {
    if (existingRows.length > 0) {
      return existingRows
    }

    const fallbackRows: CachedCommanderRec[] = [
      {
        card_key_type: identity.cardKeyType,
        card_key: identity.cardKey,
        oracle_id: identity.oracleId,
        normalized_card_name: identity.normalizedCardName,
        raw_card_name: identity.rawCardName,
        commander_name: null,
        normalized_commander_name: null,
        edhrec_rank: 0,
        inclusion_percent: null,
        card_deck_count: null,
        commander_deck_count: null,
        fetch_status: 'error',
        fetch_error: error instanceof Error ? error.message : 'EDHREC lookup failed.',
        source_url: sourceUrl,
        scraped_at: new Date().toISOString(),
      },
    ]

    await storeCachedRecsForKey(supabase, identity, fallbackRows)
    return fallbackRows
  }
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
) {
  let cursor = 0

  async function next() {
    while (cursor < items.length) {
      const current = items[cursor]
      cursor += 1
      await worker(current)
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, () => next())
  )
}

function selectBestCommanderRec(rows: CachedCommanderRec[]) {
  const okRows = rows
    .filter((row) => row.fetch_status === 'ok' && row.commander_name)
    .slice()
    .sort((left, right) => {
      const rankOrder = left.edhrec_rank - right.edhrec_rank
      if (rankOrder !== 0) return rankOrder
      return Number(right.commander_deck_count ?? 0) - Number(left.commander_deck_count ?? 0)
    })

  return okRows[0] ?? null
}

async function loadOwnedDeckCardsForUser(
  supabase: SupabaseAdmin,
  userId: string,
  deckId?: number
) {
  let deckQuery = supabase.from('decks').select('id, user_id').eq('user_id', userId)

  if (deckId != null) {
    deckQuery = deckQuery.eq('id', deckId)
  }

  const { data: deckRows, error: deckError } = await deckQuery
  if (deckError) {
    throw new Error(deckError.message)
  }

  const ownedDecks = (deckRows ?? []) as Array<{ id: number; user_id: string }>
  const deckIds = ownedDecks.map((deck) => Number(deck.id)).filter((id) => id > 0)
  if (deckIds.length === 0) {
    return [] as OwnedDeckCard[]
  }

  const { data: cardRows, error: cardError } = await supabase
    .from('deck_cards')
    .select('id, deck_id, card_name, oracle_id, quantity, section')
    .in('deck_id', deckIds)
    .in('section', ['commander', 'mainboard', 'sideboard'])

  if (cardError) {
    throw new Error(cardError.message)
  }

  const deckUserMap = new Map(ownedDecks.map((deck) => [Number(deck.id), deck.user_id]))

  return ((cardRows ?? []) as Array<{
    id: number
    deck_id: number
    card_name: string
    oracle_id?: string | null
    quantity?: number | null
  }>).map((card) => ({
    id: Number(card.id),
    deck_id: Number(card.deck_id),
    user_id: String(deckUserMap.get(Number(card.deck_id)) ?? userId),
    card_name: String(card.card_name ?? '').trim(),
    oracle_id: card.oracle_id ?? null,
    quantity: Math.max(1, Number(card.quantity ?? 1)),
  }))
}

async function loadOwnedDeckCardsForAllUsers(supabase: SupabaseAdmin) {
  const { data: deckRows, error: deckError } = await supabase.from('decks').select('id, user_id')
  if (deckError) {
    throw new Error(deckError.message)
  }

  const decks = (deckRows ?? []) as Array<{ id: number; user_id: string }>
  const deckIds = decks.map((deck) => Number(deck.id)).filter((id) => id > 0)
  if (deckIds.length === 0) {
    return [] as OwnedDeckCard[]
  }

  const { data: cardRows, error: cardError } = await supabase
    .from('deck_cards')
    .select('id, deck_id, card_name, oracle_id, quantity, section')
    .in('deck_id', deckIds)
    .in('section', ['commander', 'mainboard', 'sideboard'])

  if (cardError) {
    throw new Error(cardError.message)
  }

  const deckUserMap = new Map(decks.map((deck) => [Number(deck.id), deck.user_id]))

  return ((cardRows ?? []) as Array<{
    id: number
    deck_id: number
    card_name: string
    oracle_id?: string | null
    quantity?: number | null
  }>).map((card) => ({
    id: Number(card.id),
    deck_id: Number(card.deck_id),
    user_id: String(deckUserMap.get(Number(card.deck_id)) ?? ''),
    card_name: String(card.card_name ?? '').trim(),
    oracle_id: card.oracle_id ?? null,
    quantity: Math.max(1, Number(card.quantity ?? 1)),
  }))
}

async function syncCommanderFitMatchesForCards(
  supabase: SupabaseAdmin,
  cards: OwnedDeckCard[],
  options: { force?: boolean; maxDistinctCards?: number } = {}
): Promise<RefreshCommanderFitsResult> {
  const force = options.force ?? false
  const distinctCardMap = new Map<string, OwnedDeckCard>()

  for (const card of cards) {
    const identity = buildCacheIdentity(card)
    const key = cacheMapKey(identity.cardKeyType, identity.cardKey)
    if (!distinctCardMap.has(key)) {
      distinctCardMap.set(key, card)
    }
  }

  const distinctCards = Array.from(distinctCardMap.values())
  const cacheByKey = new Map<string, CachedCommanderRec[]>()
  const cardsToFetch: OwnedDeckCard[] = []

  for (const card of distinctCards) {
    const identity = buildCacheIdentity(card)
    const existingRows = await readCachedRecsForKey(supabase, identity.cardKeyType, identity.cardKey)
    cacheByKey.set(cacheMapKey(identity.cardKeyType, identity.cardKey), existingRows)

    if (shouldRefreshCachedRows(existingRows, force)) {
      cardsToFetch.push(card)
    }
  }

  const limitedCardsToFetch =
    force || !options.maxDistinctCards || options.maxDistinctCards <= 0
      ? cardsToFetch
      : cardsToFetch.slice(0, options.maxDistinctCards)

  await runWithConcurrency(limitedCardsToFetch, EDHREC_CONCURRENCY, async (card) => {
    const identity = buildCacheIdentity(card)
    const rows = await fetchAndCacheRecsForCard(supabase, card, force)
    cacheByKey.set(cacheMapKey(identity.cardKeyType, identity.cardKey), rows)
  })

  const upsertRows = cards.map((card) => {
    const identity = buildCacheIdentity(card)
    const cacheRows = cacheByKey.get(cacheMapKey(identity.cardKeyType, identity.cardKey)) ?? []
    const bestRec = selectBestCommanderRec(cacheRows)
    const latestScrapedAt =
      cacheRows
        .map((row) => row.scraped_at)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null

    if (bestRec) {
      return {
        deck_card_id: card.id,
        deck_id: card.deck_id,
        user_id: card.user_id,
        card_name: card.card_name,
        card_quantity: card.quantity,
        cache_card_key_type: identity.cardKeyType,
        cache_card_key: identity.cardKey,
        match_status: 'matched',
        matched_commander_name: bestRec.commander_name ?? null,
        normalized_commander_name: bestRec.normalized_commander_name ?? null,
        edhrec_rank: bestRec.edhrec_rank,
        inclusion_percent: bestRec.inclusion_percent ?? null,
        card_deck_count: bestRec.card_deck_count ?? null,
        commander_deck_count: bestRec.commander_deck_count ?? null,
        source_url: bestRec.source_url ?? null,
        cache_scraped_at: latestScrapedAt,
        matched_at: new Date().toISOString(),
      }
    }

    const errorRow = cacheRows.find((row) => row.fetch_status === 'error')
    const noMatchRow = cacheRows.find((row) => row.fetch_status === 'no_match')
    const fallbackRow = errorRow ?? noMatchRow ?? null

    return {
      deck_card_id: card.id,
      deck_id: card.deck_id,
      user_id: card.user_id,
      card_name: card.card_name,
      card_quantity: card.quantity,
      cache_card_key_type: identity.cardKeyType,
      cache_card_key: identity.cardKey,
      match_status: errorRow ? 'error' : 'no_match',
      matched_commander_name: null,
      normalized_commander_name: null,
      edhrec_rank: null,
      inclusion_percent: null,
      card_deck_count: null,
      commander_deck_count: null,
      source_url: fallbackRow?.source_url ?? null,
      cache_scraped_at: latestScrapedAt,
      matched_at: new Date().toISOString(),
    }
  })

  if (upsertRows.length > 0) {
    const { error } = await supabase
      .from('deck_card_commander_matches')
      .upsert(upsertRows, { onConflict: 'deck_card_id' })

    if (error) {
      throw new Error(error.message)
    }
  }

  return {
    cardRowsProcessed: cards.length,
    distinctCardsProcessed: distinctCards.length,
    distinctCardsRequested: limitedCardsToFetch.length,
    matchedCount: upsertRows.filter((row) => row.match_status === 'matched').length,
    noMatchCount: upsertRows.filter((row) => row.match_status === 'no_match').length,
    errorCount: upsertRows.filter((row) => row.match_status === 'error').length,
  }
}

export async function refreshCommanderFitsForUser(
  userId: string,
  options: RefreshCommanderFitsOptions = {}
) {
  const supabase = createAdminClient()
  const cards = await loadOwnedDeckCardsForUser(supabase, userId, options.deckId)
  return syncCommanderFitMatchesForCards(supabase, cards, {
    force: options.force,
    maxDistinctCards: options.maxDistinctCards,
  })
}

export async function refreshCommanderFitsForAllUsers(options: { force?: boolean } = {}) {
  const supabase = createAdminClient()
  const cards = await loadOwnedDeckCardsForAllUsers(supabase)
  return syncCommanderFitMatchesForCards(supabase, cards, {
    force: options.force,
    maxDistinctCards: EDHREC_DAILY_CARD_LIMIT,
  })
}
