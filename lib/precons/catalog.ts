import { cache } from 'react'
import type { ImportedDeckCard } from '@/lib/commander/types'

const MTGJSON_API_BASE = 'https://mtgjson.com/api/v5'
const DECK_LIST_URL = `${MTGJSON_API_BASE}/DeckList.json`

type MtgJsonApiResponse<T> = {
  data?: T
}

type MtgJsonDeckListItem = Record<string, unknown>
type MtgJsonDeckDetailCard = Record<string, unknown>
type MtgJsonDeckDetail = Record<string, unknown>

export type PreconCatalogEntry = {
  code: string
  fileName: string
  name: string
  type: string | null
  releaseDate: string | null
  deckUrl: string
}

export type PreconCatalogSummary = PreconCatalogEntry & {
  commanderCount: number
  mainboardCount: number
  sideboardCount: number
  tokenCount: number
  totalCardCount: number
}

export type PreconCatalogDeck = PreconCatalogSummary & {
  cards: ImportedDeckCard[]
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(readString).filter(Boolean) : []
}

function titleCase(value: string | null | undefined) {
  const normalized = readString(value)
  if (!normalized) return null

  return normalized
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function formatDeckUrl(fileName: string) {
  return `${MTGJSON_API_BASE}/decks/${encodeURIComponent(fileName)}.json`
}

function normalizeDeckListEntry(raw: MtgJsonDeckListItem): PreconCatalogEntry | null {
  const fileName = readString(
    raw.fileName ?? raw.filename ?? raw.slug ?? raw.id ?? raw.uuid ?? ''
  )

  if (!fileName) return null

  const name =
    readString(raw.name ?? raw.deckName ?? raw.title ?? '') || fileName.replace(/[-_]+/g, ' ')
  const code = readString(raw.code ?? raw.setCode ?? raw.set ?? raw.parentCode ?? '').toUpperCase()
  const releaseDate =
    readString(raw.releaseDate ?? raw.dateReleased ?? raw.date ?? raw.release_at ?? '') || null
  const type = titleCase(
    readString(raw.type ?? raw.deckType ?? raw.productType ?? raw.layout ?? raw.category ?? '')
  )

  return {
    code,
    fileName,
    name,
    type,
    releaseDate,
    deckUrl: formatDeckUrl(fileName),
  }
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    next: { revalidate: 60 * 60 * 24 },
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch MTGJSON data (${response.status}) from ${url}`)
  }

  return (await response.json()) as MtgJsonApiResponse<T>
}

const fetchDeckList = cache(async () => {
  const payload = await fetchJson<MtgJsonDeckListItem[] | Record<string, MtgJsonDeckListItem>>(DECK_LIST_URL)
  const rawItems = Array.isArray(payload.data)
    ? payload.data
    : Object.values(payload.data ?? {})

  return rawItems
    .map(normalizeDeckListEntry)
    .filter((item): item is PreconCatalogEntry => !!item)
    .sort((left, right) => {
      const releaseCompare = (right.releaseDate ?? '').localeCompare(left.releaseDate ?? '')
      if (releaseCompare !== 0) return releaseCompare
      return left.name.localeCompare(right.name)
    })
})

function getSectionCards(
  deck: MtgJsonDeckDetail,
  keys: string[]
): MtgJsonDeckDetailCard[] {
  for (const key of keys) {
    const value = deck[key]
    if (Array.isArray(value)) {
      return value.filter((item): item is MtgJsonDeckDetailCard => !!item && typeof item === 'object')
    }
  }

  return []
}

function toImportedDeckCard(
  raw: MtgJsonDeckDetailCard,
  fallbackSection: ImportedDeckCard['section'],
  fallbackSetCode: string
): ImportedDeckCard | null {
  const quantity = readNumber(raw.count ?? raw.quantity ?? raw.qty ?? 0)
  const cardName =
    readString(raw.name ?? raw.faceName ?? raw.cardName ?? raw.title ?? raw.displayName ?? '')

  if (!quantity || !cardName) return null

  return {
    section: fallbackSection,
    quantity,
    cardName,
    foil: Boolean(raw.isFoil ?? raw.foil ?? false),
    setCode: readString((raw.setCode ?? raw.code ?? fallbackSetCode) || '') || undefined,
    setName: readString(raw.setName ?? raw.expansionName ?? raw.edition ?? '') || undefined,
    collectorNumber:
      readString(raw.number ?? raw.collectorNumber ?? raw.collector_number ?? '') || undefined,
  }
}

function sumCardCount(cards: ImportedDeckCard[], section: ImportedDeckCard['section']) {
  return cards
    .filter((card) => card.section === section)
    .reduce((sum, card) => sum + card.quantity, 0)
}

function normalizeDeckDetail(
  entry: PreconCatalogEntry,
  raw: MtgJsonDeckDetail
): PreconCatalogDeck {
  const fallbackSetCode =
    readString(raw.code ?? raw.setCode ?? raw.set ?? entry.code).toLowerCase() || undefined

  const commanderCards = getSectionCards(raw, ['commander', 'commanders']).map((card) =>
    toImportedDeckCard(card, 'commander', fallbackSetCode ?? '')
  )
  const mainboardCards = getSectionCards(raw, ['mainBoard', 'mainboard', 'cards']).map((card) =>
    toImportedDeckCard(card, 'mainboard', fallbackSetCode ?? '')
  )
  const sideboardCards = getSectionCards(raw, ['sideBoard', 'sideboard']).map((card) =>
    toImportedDeckCard(card, 'sideboard', fallbackSetCode ?? '')
  )
  const tokenCards = getSectionCards(raw, ['tokens', 'tokenCards']).map((card) =>
    toImportedDeckCard(card, 'token', fallbackSetCode ?? '')
  )

  const cards = [...commanderCards, ...mainboardCards, ...sideboardCards, ...tokenCards].filter(
    (card): card is ImportedDeckCard => !!card
  )

  const commanderCount = sumCardCount(cards, 'commander')
  const mainboardCount = sumCardCount(cards, 'mainboard')
  const sideboardCount = sumCardCount(cards, 'sideboard')
  const tokenCount = sumCardCount(cards, 'token')

  return {
    ...entry,
    name: readString(raw.name ?? raw.deckName ?? entry.name) || entry.name,
    type: titleCase(readString(raw.type ?? raw.deckType ?? entry.type ?? '')) ?? entry.type,
    releaseDate:
      readString(raw.releaseDate ?? raw.dateReleased ?? entry.releaseDate ?? '') || entry.releaseDate,
    cards,
    commanderCount,
    mainboardCount,
    sideboardCount,
    tokenCount,
    totalCardCount: commanderCount + mainboardCount + sideboardCount + tokenCount,
  }
}

const fetchDeckDetail = cache(async (fileName: string) => {
  const payload = await fetchJson<MtgJsonDeckDetail>(formatDeckUrl(fileName))
  return payload.data ?? {}
})

export async function getPreconCatalog(query?: string) {
  const entries = await fetchDeckList()
  const normalizedQuery = readString(query).toLowerCase()

  if (!normalizedQuery) {
    return entries
  }

  return entries.filter((entry) => {
    const haystack = [
      entry.name,
      entry.code,
      entry.type ?? '',
      entry.fileName,
      ...(entry.releaseDate ? [entry.releaseDate] : []),
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedQuery)
  })
}

export async function getPreconCatalogPage(query?: string, limit = 48) {
  const entries = await getPreconCatalog(query)
  const selectedEntries = entries.slice(0, Math.max(limit, 1))
  const details = await Promise.all(
    selectedEntries.map(async (entry) => normalizeDeckDetail(entry, await fetchDeckDetail(entry.fileName)))
  )

  return {
    totalCount: entries.length,
    visibleCount: details.length,
    items: details,
  }
}

export async function getPreconDeck(fileName: string) {
  const normalizedFileName = readString(fileName)
  if (!normalizedFileName) return null

  const entries = await fetchDeckList()
  const entry = entries.find((item) => item.fileName.toLowerCase() === normalizedFileName.toLowerCase())

  if (!entry) return null

  return normalizeDeckDetail(entry, await fetchDeckDetail(entry.fileName))
}

export function getPreconSectionLabel(section: ImportedDeckCard['section']) {
  switch (section) {
    case 'commander':
      return 'Commander'
    case 'mainboard':
      return 'Mainboard'
    case 'sideboard':
      return 'Sideboard'
    case 'token':
      return 'Tokens'
    default:
      return section
  }
}

export function groupPreconCardsBySection(cards: ImportedDeckCard[]) {
  return {
    commander: cards.filter((card) => card.section === 'commander'),
    mainboard: cards.filter((card) => card.section === 'mainboard'),
    sideboard: cards.filter((card) => card.section === 'sideboard'),
    token: cards.filter((card) => card.section === 'token'),
  }
}

export function getPreconTypeOptions(entries: PreconCatalogEntry[]) {
  return readStringArray(entries.map((entry) => entry.type).filter(Boolean))
}
