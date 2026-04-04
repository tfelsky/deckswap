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
