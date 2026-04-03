import type { ImportedDeckCard } from '@/lib/commander/types'

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
  boards?: {
    commanders?: MoxfieldBoard
    mainboard?: MoxfieldBoard
    tokens?: MoxfieldBoard
  }
}

async function fetchMoxfieldDeckTitle(sourceUrl: string) {
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        Accept: 'text/html',
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
  board: MoxfieldBoard | undefined,
  section: 'commander' | 'mainboard' | 'token'
): ImportedDeckCard[] {
  if (!board?.cards) return []

  return Object.values(board.cards)
    .map((entry) => {
      const card = entry.card
      const name = card?.name?.trim()

      if (!name) return null

      return {
        section,
        quantity: Number(entry.quantity ?? 1),
        cardName: name,
        foil:
          card?.foil === true ||
          (card?.finishes ?? []).some((finish) => finish.toLowerCase() === 'foil'),
        setCode: card?.set?.toLowerCase() || undefined,
        setName: card?.setName || undefined,
        collectorNumber: card?.collectorNumber || undefined,
      } satisfies ImportedDeckCard
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
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Moxfield import failed with status ${response.status}.`)
  }

  const deck = (await response.json()) as MoxfieldDeckResponse

  const cards = [
    ...parseMoxfieldBoard(deck.boards?.commanders, 'commander'),
    ...parseMoxfieldBoard(deck.boards?.mainboard, 'mainboard'),
    ...parseMoxfieldBoard(deck.boards?.tokens, 'token'),
  ]

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
