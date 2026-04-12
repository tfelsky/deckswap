import type { ImportedDeckCard } from '@/lib/commander/types'
import { parseDeckText } from '@/lib/commander/parse'

type ArchidektSearchDeck = {
  id?: number | string
  name?: string
  title?: string
  updatedAt?: string
  updated_at?: string
  createdAt?: string
  format?: number | string
  deckFormat?: string
}

type ArchidektCardEntry = {
  quantity?: number
  categories?: Array<string | { name?: string | null } | null> | null
  category?: string | { name?: string | null } | null
  card?: {
    oracleCard?: {
      name?: string
      typeLine?: string | null
    } | null
    name?: string
    setCode?: string | null
    set?: string | null
    editioncode?: string | null
    collectorNumber?: string | number | null
    uid?: string | null
  } | null
  printing?: {
    name?: string
    edition?: {
      editioncode?: string | null
      name?: string | null
    } | null
    collectorNumber?: string | number | null
    uid?: string | null
  } | null
}

type LibraryDeckSummary = {
  externalDeckId: string
  deckName: string
  deckUrl: string
  updatedAt: string | null
  formatHint: string | null
}

type ArchidektCollectionCardEntry = {
  id?: number
  quantity?: number
  foil?: boolean
  language?: number | string | null
  condition?: number | string | null
  modifier?: string | null
  card?: {
    name?: string
    collectorNumber?: string | number | null
    edition?: {
      editioncode?: string | null
      editionname?: string | null
    } | null
    oracleCard?: {
      name?: string | null
    } | null
  } | null
}

type ArchidektCollectionPayload = {
  next?: string | null
  count?: number
  owner?: {
    id?: number
    username?: string
  } | null
  results?: ArchidektCollectionCardEntry[]
}

export type ArchidektSingleSourceSummary = {
  externalSourceId: string
  sourceName: string
  sourceUrl: string
  itemCount: number
  updatedAt?: string | null
}

function cleanText(value?: string | null) {
  return value?.trim() || ''
}

function mapArchidektFormat(value?: number | string | null) {
  const normalized = String(value ?? '').trim().toLowerCase()

  switch (normalized) {
    case '1':
    case 'standard':
      return 'standard'
    case '2':
    case 'modern':
      return 'modern'
    case '3':
    case 'commander':
    case 'edh':
      return 'commander'
    case '4':
    case 'legacy':
      return 'legacy'
    case '6':
    case 'pauper':
      return 'pauper'
    default:
      return null
  }
}

export function extractArchidektDeckId(url: string) {
  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.split('/').filter(Boolean)
    const deckIndex = segments.findIndex((segment) => segment === 'decks')

    if (!/archidekt\.com$/i.test(parsed.hostname)) {
      return null
    }

    if (deckIndex === -1) return null
    return segments[deckIndex + 1] || null
  } catch {
    return null
  }
}

export function extractArchidektUsername(value: string) {
  const trimmed = value.trim()

  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)
    if (!/archidekt\.com$/i.test(parsed.hostname)) return null

    const segments = parsed.pathname.split('/').filter(Boolean)
    if (segments[0] === 'u' && segments[1]) {
      return segments[1]
    }
  } catch {
    // treat as plain username
  }

  return trimmed.replace(/^@/, '').replace(/\s+/g, '')
}

export function extractArchidektCollectionId(value: string) {
  const trimmed = value.trim()

  if (!trimmed) return null

  if (/^\d+$/.test(trimmed)) {
    return trimmed
  }

  try {
    const parsed = new URL(trimmed)
    if (!/archidekt\.com$/i.test(parsed.hostname)) return null

    const segments = parsed.pathname.split('/').filter(Boolean)
    const collectionIndex = segments.findIndex((segment) => segment === 'collection')
    if (collectionIndex === -1) return null
    if (segments[collectionIndex + 1] === 'v2' && segments[collectionIndex + 2]) {
      return segments[collectionIndex + 2]
    }

    return segments[collectionIndex + 1] || null
  } catch {
    return null
  }
}

function mapArchidektLanguage(value?: number | string | null) {
  const normalized = String(value ?? '').trim().toLowerCase()

  switch (normalized) {
    case '2':
    case 'fr':
      return 'fr'
    case '3':
    case 'de':
      return 'de'
    case '4':
    case 'it':
      return 'it'
    case '5':
    case 'jp':
    case 'ja':
      return 'ja'
    case '6':
    case 'pt':
      return 'pt'
    case '7':
    case 'es':
      return 'es'
    case '8':
    case 'ru':
      return 'ru'
    case '9':
    case 'zhs':
    case 'zh':
      return 'zh'
    default:
      return 'en'
  }
}

function mapArchidektCondition(value?: number | string | null) {
  const normalized = String(value ?? '').trim().toLowerCase()

  switch (normalized) {
    case '2':
    case 'light_play':
      return 'light_play' as const
    case '3':
    case 'moderate_play':
      return 'moderate_play' as const
    case '4':
    case 'heavy_play':
      return 'heavy_play' as const
    case '5':
    case 'damaged':
      return 'damaged' as const
    default:
      return 'near_mint' as const
  }
}

async function fetchArchidektCollectionPage(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; Mythiverse Exchange/1.0; +https://mythivex.com)',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Archidekt singles lookup failed with status ${response.status}.`)
  }

  return (await response.json()) as ArchidektCollectionPayload
}

export async function previewArchidektSinglesSource(
  value: string
): Promise<ArchidektSingleSourceSummary> {
  const collectionId = extractArchidektCollectionId(value)

  if (!collectionId) {
    throw new Error('Enter an Archidekt public collection URL for singles import.')
  }

  const payload = await fetchArchidektCollectionPage(`https://archidekt.com/api/collection/${collectionId}/`)
  const username = cleanText(payload.owner?.username)

  return {
    externalSourceId: collectionId,
    sourceName: username ? `${username}'s Collection` : `Archidekt Collection ${collectionId}`,
    sourceUrl: `https://archidekt.com/collection/v2/${collectionId}`,
    itemCount: Number(payload.count ?? payload.results?.length ?? 0),
    updatedAt: null,
  }
}

export async function fetchArchidektSinglesSource(
  value: string
): Promise<{
  sourceName: string
  sourceUrl: string
  externalSourceId: string
  accountLabel: string
  items: Array<{
    sourceItemKey: string
    cardName: string
    quantity: number
    foil: boolean
    condition: 'near_mint' | 'light_play' | 'moderate_play' | 'heavy_play' | 'damaged'
    language: string
    setCode?: string
    setName?: string
    collectorNumber?: string
  }>
}> {
  const collectionId = extractArchidektCollectionId(value)

  if (!collectionId) {
    throw new Error('Enter an Archidekt public collection URL for singles import.')
  }

  const items: Array<{
    sourceItemKey: string
    cardName: string
    quantity: number
    foil: boolean
    condition: 'near_mint' | 'light_play' | 'moderate_play' | 'heavy_play' | 'damaged'
    language: string
    setCode?: string
    setName?: string
    collectorNumber?: string
  }> = []

  let nextUrl: string | null = `https://archidekt.com/api/collection/${collectionId}/`
  let sourceName = `Archidekt Collection ${collectionId}`
  let accountLabel = collectionId

  while (nextUrl) {
    const payload = await fetchArchidektCollectionPage(nextUrl)
    const username = cleanText(payload.owner?.username)
    if (username) {
      sourceName = `${username}'s Collection`
      accountLabel = username
    }

    for (const entry of payload.results ?? []) {
      const cardName =
        cleanText(entry.card?.oracleCard?.name) || cleanText(entry.card?.name)
      if (!cardName) continue

      items.push({
        sourceItemKey: String(entry.id ?? [cardName, entry.card?.collectorNumber].join('::')).trim(),
        cardName,
        quantity: Math.max(1, Number(entry.quantity ?? 1)),
        foil:
          entry.foil === true ||
          cleanText(entry.modifier).toLowerCase() === 'foil',
        condition: mapArchidektCondition(entry.condition),
        language: mapArchidektLanguage(entry.language),
        setCode: cleanText(entry.card?.edition?.editioncode) || undefined,
        setName: cleanText(entry.card?.edition?.editionname) || undefined,
        collectorNumber: cleanText(String(entry.card?.collectorNumber ?? '')) || undefined,
      })
    }

    nextUrl = payload.next ?? null
    if (nextUrl && nextUrl.startsWith('http://')) {
      nextUrl = nextUrl.replace(/^http:\/\//i, 'https://')
    }
  }

  return {
    sourceName,
    sourceUrl: `https://archidekt.com/collection/v2/${collectionId}`,
    externalSourceId: collectionId,
    accountLabel,
    items,
  }
}

export async function listArchidektLibraryDecks(value: string): Promise<{
  username: string
  profileUrl: string
  decks: LibraryDeckSummary[]
}> {
  const username = extractArchidektUsername(value)

  if (!username) {
    throw new Error('Enter an Archidekt username or profile URL.')
  }

  const url = new URL('https://archidekt.com/api/decks/cards/')
  url.searchParams.set('owner', username)
  url.searchParams.set('orderBy', '-updatedAt')
  url.searchParams.set('pageSize', '100')

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; Mythiverse Exchange/1.0; +https://mythivex.com)',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Archidekt library lookup failed with status ${response.status}.`)
  }

  const payload = await response.json()
  const rows = (Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload?.decks)
    ? payload.decks
    : []) as ArchidektSearchDeck[]

  const decks = rows
    .map((row): LibraryDeckSummary | null => {
      const externalDeckId = String(row.id ?? '').trim()
      if (!externalDeckId) return null

      return {
        externalDeckId,
        deckName: cleanText(row.name) || cleanText(row.title) || `Archidekt Deck ${externalDeckId}`,
        deckUrl: `https://archidekt.com/decks/${externalDeckId}`,
        updatedAt: row.updatedAt ?? row.updated_at ?? row.createdAt ?? null,
        formatHint: cleanText(row.deckFormat) || mapArchidektFormat(row.format),
      }
    })
    .filter((row): row is LibraryDeckSummary => row !== null)

  return {
    username,
    profileUrl: `https://archidekt.com/u/${username}`,
    decks,
  }
}

function toCategoryNames(entry: ArchidektCardEntry) {
  const values = [
    ...(Array.isArray(entry.categories) ? entry.categories : []),
    entry.category ?? null,
  ]

  return values
    .map((value) => {
      if (!value) return ''
      if (typeof value === 'string') return value
      return cleanText(value.name)
    })
    .filter(Boolean)
}

function inferArchidektSection(entry: ArchidektCardEntry) {
  const categoryNames = toCategoryNames(entry)

  if (categoryNames.some((value) => /token/i.test(value))) {
    return 'token' as const
  }

  if (categoryNames.some((value) => /sideboard|maybeboard|companion/i.test(value))) {
    return 'sideboard' as const
  }

  if (categoryNames.some((value) => /commander/i.test(value))) {
    return 'commander' as const
  }

  return 'mainboard' as const
}

function getArchidektCardName(entry: ArchidektCardEntry) {
  return (
    cleanText(entry.card?.oracleCard?.name) ||
    cleanText(entry.card?.name) ||
    cleanText(entry.printing?.name)
  )
}

export async function fetchArchidektDeck(
  sourceUrl: string
): Promise<{ deckName: string; format: string | null; cards: ImportedDeckCard[] }> {
  const deckId = extractArchidektDeckId(sourceUrl)

  if (!deckId) {
    throw new Error('That Archidekt URL could not be understood.')
  }

  const candidates = [
    `https://archidekt.com/api/decks/${deckId}/small/`,
    `https://archidekt.com/api/decks/${deckId}/`,
  ]

  let payload: any = null
  let lastStatus: number | null = null

  for (const url of candidates) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Mythiverse Exchange/1.0; +https://mythivex.com)',
      },
      cache: 'no-store',
    })

    if (response.ok) {
      payload = await response.json()
      break
    }

    lastStatus = response.status
  }

  if (!payload) {
    throw new Error(
      lastStatus
        ? `Archidekt import failed with status ${lastStatus}.`
        : 'Archidekt import failed before deck data could be read.'
    )
  }

  const rawCards = (Array.isArray(payload?.cards)
    ? payload.cards
    : Array.isArray(payload?.deck?.cards)
    ? payload.deck.cards
    : []) as ArchidektCardEntry[]

  const cards = rawCards
    .map((entry): ImportedDeckCard | null => {
      const cardName = getArchidektCardName(entry)
      if (!cardName) return null

      const printing = entry.printing
      const card = entry.card

      return {
        section: inferArchidektSection(entry),
        quantity: Number(entry.quantity ?? 1),
        cardName,
        foil: false,
        setCode:
          cleanText(printing?.edition?.editioncode) ||
          cleanText(card?.setCode) ||
          cleanText(card?.set) ||
          cleanText(card?.editioncode) ||
          undefined,
        setName: cleanText(printing?.edition?.name) || undefined,
        collectorNumber:
          cleanText(String(printing?.collectorNumber ?? '')) ||
          cleanText(String(card?.collectorNumber ?? '')) ||
          undefined,
      }
    })
    .filter((card): card is ImportedDeckCard => !!card)

  if (cards.length === 0) {
    const exportUrl = `${sourceUrl.replace(/\/+$/, '')}/export`

    const exportResponse = await fetch(exportUrl, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; Mythiverse Exchange/1.0; +https://mythivex.com)',
      },
      cache: 'no-store',
    })

    if (exportResponse.ok) {
      const html = await exportResponse.text()
      const parsed = parseDeckText(html, 'archidekt')
      if (parsed.length > 0) {
        return {
          deckName:
            cleanText(payload?.name) || cleanText(payload?.title) || `Archidekt Deck ${deckId}`,
          format: mapArchidektFormat(payload?.format),
          cards: parsed,
        }
      }
    }

    throw new Error(
      'Archidekt returned the deck but no readable cards. The deck may be private, unsupported, or using a payload shape Mythiverse Exchange does not understand yet.'
    )
  }

  return {
    deckName: cleanText(payload?.name) || cleanText(payload?.title) || `Archidekt Deck ${deckId}`,
    format: mapArchidektFormat(payload?.format),
    cards,
  }
}
