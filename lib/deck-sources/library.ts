import {
  fetchArchidektDeck,
  fetchArchidektSinglesSource,
  listArchidektLibraryDecks,
  previewArchidektSinglesSource,
} from '@/lib/deck-sources/archidekt'
import {
  fetchMoxfieldDeck,
  fetchMoxfieldSinglesSource,
  previewMoxfieldSinglesSource,
} from '@/lib/deck-sources/moxfield'
import { isDeckImportEventsSchemaMissing } from '@/lib/import-events'
import type { ImportedDeckCard } from '@/lib/commander/types'
import { isSingleImportSchemaMissing } from '@/lib/singles/import-events'

export type LibraryImportProvider = 'moxfield' | 'archidekt'
export type LibraryImportScope = 'decks' | 'singles' | 'full_collection'

export type LibraryImportCapability = {
  scope: LibraryImportScope
  label: string
  status: 'available' | 'planned'
  description: string
}

export type LibraryDeckSummary = {
  provider: LibraryImportProvider
  externalDeckId: string
  deckName: string
  deckUrl: string
  profileUrl: string
  username: string
  formatHint?: string | null
  updatedAt?: string | null
}

export type LibrarySingleSourceSummary = {
  provider: LibraryImportProvider
  externalSourceId: string
  sourceName: string
  sourceUrl: string
  sourceKind: 'binder' | 'collection'
  accountLabel: string
  itemCount: number
  updatedAt?: string | null
}

export type ImportedSingleCard = {
  sourceItemKey: string
  cardName: string
  quantity: number
  foil?: boolean
  condition?: 'near_mint' | 'light_play' | 'moderate_play' | 'heavy_play' | 'damaged'
  language?: string
  setCode?: string
  setName?: string
  collectorNumber?: string
}

type SupabaseLike = any

const PROVIDER_LIBRARY_CAPABILITIES: Record<
  LibraryImportProvider,
  LibraryImportCapability[]
> = {
  moxfield: [
    {
      scope: 'decks',
      label: 'Deck libraries',
      status: 'available',
      description: 'Preview public decks from a profile and import them into staging.',
    },
    {
      scope: 'singles',
      label: 'Singles binders',
      status: 'available',
      description: 'Import a public binder-like Moxfield list into private singles inventory.',
    },
    {
      scope: 'full_collection',
      label: 'Whole collection exports',
      status: 'planned',
      description: 'Bring in deckless inventory and mixed holdings from full collection exports.',
    },
  ],
  archidekt: [
    {
      scope: 'decks',
      label: 'Deck libraries',
      status: 'available',
      description: 'Preview public decks from a profile and import them into staging.',
    },
    {
      scope: 'singles',
      label: 'Singles binders',
      status: 'available',
      description: 'Import a public Archidekt collection into private singles inventory.',
    },
    {
      scope: 'full_collection',
      label: 'Whole collection exports',
      status: 'planned',
      description: 'Support imports that include decks, staples, and unsorted collection inventory.',
    },
  ],
}

function cleanText(value?: string | null) {
  return value?.trim() || ''
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeUserInput(value: string) {
  return value.trim().replace(/^@/, '')
}

function extractMoxfieldUsername(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)
    if (!/moxfield\.com$/i.test(parsed.hostname)) return null
    const segments = parsed.pathname.split('/').filter(Boolean)
    if (segments[0] === 'users' && segments[1]) {
      return segments[1]
    }
  } catch {
    // treat as plain username
  }

  return decodeUserInput(trimmed)
}

export async function listMoxfieldLibraryDecks(value: string): Promise<{
  username: string
  profileUrl: string
  decks: LibraryDeckSummary[]
}> {
  const username = extractMoxfieldUsername(value)

  if (!username) {
    throw new Error('Enter a Moxfield username or profile URL.')
  }

  const profileUrl = `https://moxfield.com/users/${username}`
  const response = await fetch(profileUrl, {
    headers: {
      Accept: 'text/html',
      'User-Agent': 'Mozilla/5.0 (compatible; Mythiverse Exchange/1.0; +https://mythivex.com)',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Moxfield library lookup failed with status ${response.status}.`)
  }

  const html = await response.text()
  const anchorPattern =
    /<a[^>]+href="\/decks\/([A-Za-z0-9_-]+)"[^>]*>([\s\S]*?)<\/a>/gi

  const seen = new Set<string>()
  const decks: LibraryDeckSummary[] = []
  let match: RegExpExecArray | null

  while ((match = anchorPattern.exec(html))) {
    const externalDeckId = match[1]
    if (!externalDeckId || seen.has(externalDeckId)) continue

    const deckName = stripHtml(match[2] || '')
    if (!deckName || /clone deck|playtest|share/i.test(deckName)) continue

    seen.add(externalDeckId)
    decks.push({
      provider: 'moxfield',
      externalDeckId,
      deckName,
      deckUrl: `https://moxfield.com/decks/${externalDeckId}`,
      profileUrl,
      username,
      formatHint: null,
      updatedAt: null,
    })
  }

  return { username, profileUrl, decks }
}

export async function listLibraryDecks(provider: LibraryImportProvider, value: string) {
  if (provider === 'archidekt') {
    const result = await listArchidektLibraryDecks(value)
    return {
      ...result,
      decks: result.decks.map((deck) => ({
        provider,
        ...deck,
        profileUrl: result.profileUrl,
        username: result.username,
      })),
    }
  }

  return listMoxfieldLibraryDecks(value)
}

export async function listLibrarySingleSources(
  provider: LibraryImportProvider,
  value: string
): Promise<{
  accountLabel: string
  profileUrl: string
  sources: LibrarySingleSourceSummary[]
}> {
  if (provider === 'archidekt') {
    const source = await previewArchidektSinglesSource(value)
    const accountLabel = source.sourceName.replace(/'s Collection$/, '') || source.externalSourceId
    return {
      accountLabel,
      profileUrl: source.sourceUrl,
      sources: [
        {
          provider,
          externalSourceId: source.externalSourceId,
          sourceName: source.sourceName,
          sourceUrl: source.sourceUrl,
          sourceKind: 'collection',
          accountLabel,
          itemCount: source.itemCount,
          updatedAt: source.updatedAt,
        },
      ],
    }
  }

  const source = await previewMoxfieldSinglesSource(value)
  return {
    accountLabel: source.sourceName,
    profileUrl: source.sourceUrl,
    sources: [
      {
        provider,
        externalSourceId: source.externalSourceId,
        sourceName: source.sourceName,
        sourceUrl: source.sourceUrl,
        sourceKind: 'binder',
        accountLabel: source.sourceName,
        itemCount: source.itemCount,
        updatedAt: source.updatedAt,
      },
    ],
  }
}

export function getLibraryImportCapabilities(provider: LibraryImportProvider) {
  return PROVIDER_LIBRARY_CAPABILITIES[provider]
}

export async function fetchLibraryDeck(
  provider: LibraryImportProvider,
  deckUrl: string
): Promise<{ deckName: string; format: string | null; cards: ImportedDeckCard[] }> {
  if (provider === 'archidekt') {
    return fetchArchidektDeck(deckUrl)
  }

  const deck = await fetchMoxfieldDeck(deckUrl)

  return {
    deckName: deck.deckName || 'Imported Moxfield Deck',
    format: deck.format,
    cards: deck.cards,
  }
}

export async function fetchLibrarySingles(
  provider: LibraryImportProvider,
  sourceValue: string
): Promise<{
  sourceName: string
  sourceUrl: string
  externalSourceId: string
  accountLabel: string
  items: ImportedSingleCard[]
}> {
  if (provider === 'archidekt') {
    const source = await fetchArchidektSinglesSource(sourceValue)
    return {
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      externalSourceId: source.externalSourceId,
      accountLabel: source.accountLabel,
      items: source.items,
    }
  }

  const source = await fetchMoxfieldSinglesSource(sourceValue)
  return {
    sourceName: source.sourceName,
    sourceUrl: source.sourceUrl,
    externalSourceId: source.externalSourceId,
    accountLabel: source.sourceName,
    items: source.items,
  }
}

function isExternalImportSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.external_deck_sources'") ||
    message.includes('relation "public.external_deck_sources"') ||
    message.includes("relation 'public.external_deck_imports'") ||
    message.includes('relation "public.external_deck_imports"') ||
    isDeckImportEventsSchemaMissing(message)
  )
}

function isExternalSingleImportSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.external_single_sources'") ||
    message.includes('relation "public.external_single_sources"') ||
    message.includes("relation 'public.external_single_imports'") ||
    message.includes('relation "public.external_single_imports"') ||
    isSingleImportSchemaMissing(message)
  )
}

export async function persistLibraryImportLinkage(
  supabase: SupabaseLike,
  args: {
    userId: string
    deckId: number
    provider: LibraryImportProvider
    username: string
    profileUrl: string
    externalDeckId: string
    externalDeckUrl: string
    syncStatus?: string
    lastError?: string | null
  }
) {
  const sourceResult = await supabase.from('external_deck_sources').upsert(
    {
      user_id: args.userId,
      provider: args.provider,
      external_username: args.username,
      profile_url: args.profileUrl,
      status: args.lastError ? 'error' : 'active',
      last_synced_at: new Date().toISOString(),
      last_error: args.lastError ?? null,
    },
    { onConflict: 'user_id,provider,external_username' }
  )

  if (sourceResult.error && !isExternalImportSchemaMissing(sourceResult.error.message)) {
    console.error('Failed to save external deck source linkage:', sourceResult.error)
  }

  const importResult = await supabase.from('external_deck_imports').upsert(
    {
      user_id: args.userId,
      deck_id: args.deckId,
      provider: args.provider,
      external_deck_id: args.externalDeckId,
      external_deck_url: args.externalDeckUrl,
      import_mode: 'library',
      sync_status: args.syncStatus ?? 'imported',
      last_error: args.lastError ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider,external_deck_id' }
  )

  if (importResult.error && !isExternalImportSchemaMissing(importResult.error.message)) {
    console.error('Failed to save external deck import linkage:', importResult.error)
  }
}

export async function persistLibrarySinglesImportLinkage(
  supabase: SupabaseLike,
  args: {
    userId: string
    provider: LibraryImportProvider
    accountLabel: string
    sourceScope?: 'singles' | 'full_collection'
    sourceKey: string
    sourceName: string
    sourceUrl: string
    importedItemCount: number
    warningCount?: number
    skippedCount?: number
    failedCount?: number
    syncStatus?: string
    lastError?: string | null
  }
) {
  const scope = args.sourceScope ?? 'singles'
  const sourceResult = await supabase.from('external_single_sources').upsert(
    {
      user_id: args.userId,
      provider: args.provider,
      external_account: args.accountLabel,
      source_scope: scope,
      source_key: args.sourceKey,
      source_name: args.sourceName,
      source_url: args.sourceUrl,
      status: args.lastError ? 'error' : 'active',
      imported_item_count: args.importedItemCount,
      last_synced_at: new Date().toISOString(),
      last_error: args.lastError ?? null,
    },
    { onConflict: 'user_id,provider,source_scope,source_key' }
  )

  if (sourceResult.error && !isExternalSingleImportSchemaMissing(sourceResult.error.message)) {
    console.error('Failed to save external single source linkage:', sourceResult.error)
  }

  const importResult = await supabase.from('external_single_imports').upsert(
    {
      user_id: args.userId,
      provider: args.provider,
      source_scope: scope,
      source_key: args.sourceKey,
      source_name: args.sourceName,
      source_url: args.sourceUrl,
      sync_status: args.syncStatus ?? 'imported',
      imported_item_count: args.importedItemCount,
      warning_count: args.warningCount ?? 0,
      skipped_count: args.skippedCount ?? 0,
      failed_count: args.failedCount ?? 0,
      last_error: args.lastError ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider,source_scope,source_key' }
  )

  if (importResult.error && !isExternalSingleImportSchemaMissing(importResult.error.message)) {
    console.error('Failed to save external single import linkage:', importResult.error)
  }
}
