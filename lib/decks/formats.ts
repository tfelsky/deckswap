import type { ImportedDeckCard } from '@/lib/commander/types'

export const SUPPORTED_DECK_FORMATS = [
  'unknown',
  'commander',
  'standard',
  'pauper',
  'canlander',
  'legacy',
  'modern',
  'premodern',
] as const

export type StoredDeckFormat = (typeof SUPPORTED_DECK_FORMATS)[number]

const SUPPORTED_SET = new Set<string>(SUPPORTED_DECK_FORMATS)

const MOXFIELD_FORMAT_MAP: Record<string, StoredDeckFormat> = {
  commander: 'commander',
  standard: 'standard',
  paupercommander: 'commander',
  pauperedh: 'commander',
  canadianhighlander: 'canlander',
  canlander: 'canlander',
  legacy: 'legacy',
  modern: 'modern',
  pauper: 'pauper',
  premodern: 'premodern',
}

function isBasicLand(cardName: string) {
  const basics = new Set([
    'plains',
    'island',
    'swamp',
    'mountain',
    'forest',
    'wastes',
  ])

  return basics.has(cardName.toLowerCase())
}

function toSectionCount(cards: ImportedDeckCard[], section: ImportedDeckCard['section']) {
  return cards
    .filter((card) => card.section === section)
    .reduce((sum, card) => sum + card.quantity, 0)
}

export function normalizeDeckFormat(value: string | null | undefined): StoredDeckFormat {
  const normalized = (value ?? '').trim().toLowerCase()
  if (SUPPORTED_SET.has(normalized)) {
    return normalized as StoredDeckFormat
  }

  if (normalized in MOXFIELD_FORMAT_MAP) {
    return MOXFIELD_FORMAT_MAP[normalized]
  }

  return 'unknown'
}

export function getDeckFormatLabel(format: string | null | undefined) {
  switch (normalizeDeckFormat(format)) {
    case 'commander':
      return 'Commander'
    case 'standard':
      return 'Standard'
    case 'pauper':
      return 'Pauper'
    case 'canlander':
      return 'Canadian Highlander'
    case 'legacy':
      return 'Legacy'
    case 'modern':
      return 'Modern'
    case 'premodern':
      return 'Premodern'
    default:
      return 'Unspecified Format'
  }
}

export function detectDeckFormat(
  cards: ImportedDeckCard[],
  sourceHint?: string | null
): StoredDeckFormat {
  const hinted = normalizeDeckFormat(sourceHint)
  if (hinted !== 'unknown') return hinted

  const commanders = cards.filter((card) => card.section === 'commander')
  const nonTokenCards = cards.filter((card) => card.section !== 'token')
  const mainboardCount = toSectionCount(cards, 'mainboard')
  const sideboardCount = toSectionCount(cards, 'sideboard')
  const totalNonTokenCards = nonTokenCards.reduce((sum, card) => sum + card.quantity, 0)

  if (commanders.length > 0) {
    return 'commander'
  }

  const nameCounts = new Map<string, number>()

  for (const card of nonTokenCards) {
    const key = card.cardName.trim().toLowerCase()
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + card.quantity)
  }

  const hasTooManyCopies = Array.from(nameCounts.entries()).some(
    ([name, qty]) => !isBasicLand(name) && qty > 4
  )

  if (
    mainboardCount >= 60 &&
    sideboardCount <= 15 &&
    totalNonTokenCards <= 75 &&
    !hasTooManyCopies
  ) {
    return 'standard'
  }

  return 'unknown'
}

export function formatSupportsCommanderRules(format: string | null | undefined) {
  return normalizeDeckFormat(format) === 'commander'
}
