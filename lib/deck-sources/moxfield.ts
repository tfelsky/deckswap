import type { ImportedDeckCard } from '@/lib/commander/types'
import { isHardcodedNonTokenLand, isLikelyTokenCard } from '@/lib/commander/parse'

type MoxfieldCardEntry = {
  quantity?: number
  card?: {
    name?: string
    set?: string
    setName?: string
    collectorNumber?: string
    foil?: boolean
    finishes?: string[]
  }
}

type MoxfieldBoard = {
  cards?: Record<string, MoxfieldCardEntry>
}

type MoxfieldDeckResponse = {
  name?: string
  deckName?: string
  title?: string
  format?: string
  commanders?: Record<string, MoxfieldCardEntry>
  mainboard?: Record<string, MoxfieldCardEntry>
  tokens?: Record<string, MoxfieldCardEntry>
  sideboard?: Record<string, MoxfieldCardEntry>
  boards?: {
    commanders?: MoxfieldBoard
    mainboard?: MoxfieldBoard
    tokens?: MoxfieldBoard
    sideboard?: MoxfieldBoard
  }
}

export type MoxfieldSingleSourceSummary = {
  externalSourceId: string
  sourceName: string
  sourceUrl: string
  itemCount: number
  updatedAt?: string | null
}

async function fetchMoxfieldDeckTitle(sourceUrl: string) {
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; DeckSwap/1.0; +https://deckswap.app)',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const html = await response.text()
    const titleMatch = html.match(/<title>(.*?)<\/title>/i)
    const rawTitle = titleMatch?.[1]?.trim()

    if (!rawTitle) {
      return null
    }

    return rawTitle
      .replace(/\s*\|\s*Moxfield\s*$/i, '')
      .replace(/\s*-\s*Moxfield\s*$/i, '')
      .trim()
  } catch {
    return null
  }
}

function parseMoxfieldBoard(
  board: MoxfieldBoard | Record<string, MoxfieldCardEntry> | undefined,
  section: 'commander' | 'mainboard' | 'sideboard' | 'token'
): ImportedDeckCard[] {
  const cardMap = board && 'cards' in board ? board.cards : board

  if (!cardMap) return []

  return Object.values(cardMap)
    .map((entry): ImportedDeckCard | null => {
      const card = entry.card
      const name = card?.name?.trim()

      if (!name) return null

      const inferredSection =
        section === 'mainboard' && isLikelyTokenCard(name, card?.set)
          ? 'token'
          : section
      const normalizedSection =
        inferredSection === 'token' && isHardcodedNonTokenLand(name) ? 'mainboard' : inferredSection

      return {
        section: normalizedSection,
        quantity: Number(entry.quantity ?? 1),
        cardName: name,
        foil:
          card?.foil === true ||
          (card?.finishes ?? []).some((finish: string) => finish.toLowerCase() === 'foil'),
        setCode: card?.set?.toLowerCase() || undefined,
        setName: card?.setName || undefined,
        collectorNumber: card?.collectorNumber || undefined,
      }
    })
    .filter((card): card is ImportedDeckCard => !!card)
}

export function extractMoxfieldPublicId(url: string) {
  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.split('/').filter(Boolean)
    const deckIndex = segments.findIndex((segment) => segment === 'decks')

    if (parsed.hostname !== 'moxfield.com' && parsed.hostname !== 'www.moxfield.com') {
      return null
    }

    if (deckIndex === -1) return null

    const publicId = segments[deckIndex + 1]
    return publicId || null
  } catch {
    return null
  }
}

export async function fetchMoxfieldSinglesSource(
  sourceUrl: string
): Promise<{
  sourceName: string
  sourceUrl: string
  externalSourceId: string
  items: Array<{
    sourceItemKey: string
    cardName: string
    quantity: number
    foil: boolean
    condition: 'near_mint'
    language: 'en'
    setCode?: string
    setName?: string
    collectorNumber?: string
  }>
}> {
  const publicId = extractMoxfieldPublicId(sourceUrl)

  if (!publicId) {
    throw new Error('Enter a public Moxfield deck or binder URL for singles import.')
  }

  const deck = await fetchMoxfieldDeck(sourceUrl)
  const items = deck.cards
    .filter((card) => card.section !== 'token')
    .map((card) => ({
      sourceItemKey: [
        card.section,
        card.cardName.trim().toLowerCase(),
        String(card.setCode ?? '').trim().toLowerCase(),
        String(card.collectorNumber ?? '').trim().toLowerCase(),
        card.foil ? 'foil' : 'normal',
      ].join('::'),
      cardName: card.cardName,
      quantity: Number(card.quantity ?? 1),
      foil: card.foil ?? false,
      condition: 'near_mint' as const,
      language: 'en' as const,
      setCode: card.setCode,
      setName: card.setName,
      collectorNumber: card.collectorNumber,
    }))

  return {
    sourceName: deck.deckName?.trim() || `Moxfield Binder ${publicId}`,
    sourceUrl,
    externalSourceId: publicId,
    items,
  }
}

export async function previewMoxfieldSinglesSource(
  sourceUrl: string
): Promise<MoxfieldSingleSourceSummary> {
  const source = await fetchMoxfieldSinglesSource(sourceUrl)
  return {
    externalSourceId: source.externalSourceId,
    sourceName: source.sourceName,
    sourceUrl: source.sourceUrl,
    itemCount: source.items.reduce((sum, item) => sum + item.quantity, 0),
    updatedAt: null,
  }
}

export async function fetchMoxfieldDeck(
  sourceUrl: string
): Promise<{ deckName: string | null; format: string | null; cards: ImportedDeckCard[] }> {
  const publicId = extractMoxfieldPublicId(sourceUrl)

  if (!publicId) {
    throw new Error('That Moxfield URL could not be understood.')
  }

  const response = await fetch(`https://api2.moxfield.com/v2/decks/all/${publicId}`, {
    headers: {
      Accept: 'application/json',
      Origin: 'https://www.moxfield.com',
      Referer: sourceUrl,
      'User-Agent': 'Mozilla/5.0 (compatible; DeckSwap/1.0; +https://deckswap.app)',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        'Moxfield import was denied with status 403. The deck is likely private, unavailable, or blocking third-party fetches.'
      )
    }

    throw new Error(`Moxfield import failed with status ${response.status}.`)
  }

  const deck = (await response.json()) as MoxfieldDeckResponse

  const cards = [
    ...parseMoxfieldBoard(deck.boards?.commanders ?? deck.commanders, 'commander'),
    ...parseMoxfieldBoard(deck.boards?.mainboard ?? deck.mainboard, 'mainboard'),
    ...parseMoxfieldBoard(deck.boards?.sideboard ?? deck.sideboard, 'sideboard'),
    ...parseMoxfieldBoard(deck.boards?.tokens ?? deck.tokens, 'token'),
  ]

  if (cards.length === 0) {
    throw new Error(
      'Moxfield returned a deck shell but no readable cards. The deck may be private, empty, unsupported, or using a payload shape DeckSwap does not understand yet.'
    )
  }

  const fallbackName =
    deck.name?.trim() ||
    deck.deckName?.trim() ||
    deck.title?.trim() ||
    (await fetchMoxfieldDeckTitle(sourceUrl))

  return {
    deckName: fallbackName || null,
    format: deck.format?.trim() || null,
    cards,
  }
}
