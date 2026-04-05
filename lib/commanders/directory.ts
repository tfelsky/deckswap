import { createClient } from '@supabase/supabase-js'

import { createAdminClient } from '@/lib/supabase/admin'

export type CommanderDirectoryEntry = {
  name: string
  normalized_name: string
  type_line: string | null
  oracle_text: string | null
}

type ScryfallBulkSource = {
  type?: string
  download_uri?: string
  updated_at?: string
}

type ScryfallBulkCard = {
  name: string
  type_line?: string
  oracle_text?: string
  games?: string[]
  layout?: string
  digital?: boolean
  oversized?: boolean
  lang?: string
}

function normalizeName(value: string) {
  return value.trim().toLowerCase()
}

function createPublicReadClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!url || !publishableKey) {
    throw new Error(
      'Supabase public access is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    )
  }

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function isCommanderCard(card: ScryfallBulkCard) {
  const oracle = card.oracle_text?.toLowerCase() || ''
  const typeLine = card.type_line?.toLowerCase() || ''
  const games = card.games ?? []

  if (card.lang && card.lang !== 'en') return false
  if (card.digital) return false
  if (card.oversized) return false
  if (!games.includes('paper')) return false

  return (
    typeLine.includes('legendary creature') ||
    oracle.includes('can be your commander') ||
    oracle.includes('choose a background') ||
    typeLine.includes('background')
  )
}

function uniqueByNormalizedName(cards: ScryfallBulkCard[]) {
  const byName = new Map<string, CommanderDirectoryEntry>()

  for (const card of cards) {
    const name = card.name?.trim()
    if (!name) continue

    const normalized = normalizeName(name)
    if (byName.has(normalized)) continue

    byName.set(normalized, {
      name,
      normalized_name: normalized,
      type_line: card.type_line?.trim() || null,
      oracle_text: card.oracle_text?.trim() || null,
    })
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

export async function fetchCommanderDirectoryFromScryfall() {
  const bulk = await fetch('https://api.scryfall.com/bulk-data', {
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!bulk.ok) {
    throw new Error(`Scryfall bulk data lookup failed: ${bulk.status}`)
  }

  const bulkJson = (await bulk.json()) as {
    data?: ScryfallBulkSource[]
  }

  const oracleCardsSource = (bulkJson.data ?? []).find((entry) => entry.type === 'oracle_cards')

  if (!oracleCardsSource?.download_uri) {
    throw new Error('Scryfall oracle_cards bulk source was not available.')
  }

  const oracleCardsResponse = await fetch(oracleCardsSource.download_uri, {
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!oracleCardsResponse.ok) {
    throw new Error(`Scryfall oracle_cards download failed: ${oracleCardsResponse.status}`)
  }

  const oracleCards = (await oracleCardsResponse.json()) as ScryfallBulkCard[]
  const commanders = uniqueByNormalizedName(oracleCards.filter(isCommanderCard))

  return {
    commanders,
    sourceUpdatedAt: oracleCardsSource.updated_at ?? new Date().toISOString(),
  }
}

export async function refreshCommanderDirectory() {
  const { commanders, sourceUpdatedAt } = await fetchCommanderDirectoryFromScryfall()
  const supabase = createAdminClient()
  const syncedAt = new Date().toISOString()

  for (const batch of chunk(
    commanders.map((entry) => ({
      ...entry,
      source_updated_at: sourceUpdatedAt,
      synced_at: syncedAt,
    })),
    500
  )) {
    const { error } = await supabase
      .from('commander_directory')
      .upsert(batch, { onConflict: 'normalized_name' })

    if (error) {
      throw new Error(error.message)
    }
  }

  const { error: pruneError } = await supabase
    .from('commander_directory')
    .delete()
    .lt('synced_at', syncedAt)

  if (pruneError) {
    throw new Error(pruneError.message)
  }

  return {
    count: commanders.length,
    sourceUpdatedAt,
  }
}

export async function searchCommanderDirectory(query: string, limit = 8) {
  const trimmed = query.trim()

  if (!trimmed) return []

  const supabase = createPublicReadClient()
  const normalized = normalizeName(trimmed)

  const startsWithResult = await supabase
    .from('commander_directory')
    .select('name, normalized_name, type_line, oracle_text')
    .ilike('normalized_name', `${normalized}%`)
    .order('normalized_name', { ascending: true })
    .limit(limit)

  if (startsWithResult.error) {
    throw new Error(startsWithResult.error.message)
  }

  const startsWithRows = (startsWithResult.data ?? []) as CommanderDirectoryEntry[]

  if (startsWithRows.length >= limit) {
    return startsWithRows
  }

  const containsResult = await supabase
    .from('commander_directory')
    .select('name, normalized_name, type_line, oracle_text')
    .ilike('normalized_name', `%${normalized}%`)
    .order('normalized_name', { ascending: true })
    .limit(limit * 2)

  if (containsResult.error) {
    throw new Error(containsResult.error.message)
  }

  const deduped = new Map<string, CommanderDirectoryEntry>()

  for (const row of [...startsWithRows, ...((containsResult.data ?? []) as CommanderDirectoryEntry[])]) {
    if (deduped.has(row.normalized_name)) continue
    deduped.set(row.normalized_name, row)
    if (deduped.size >= limit) break
  }

  return [...deduped.values()]
}
