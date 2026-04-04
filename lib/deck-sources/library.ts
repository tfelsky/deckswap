import { fetchArchidektDeck, listArchidektLibraryDecks } from '@/lib/deck-sources/archidekt'
import { fetchMoxfieldDeck } from '@/lib/deck-sources/moxfield'
import { isDeckImportEventsSchemaMissing } from '@/lib/import-events'
import type { ImportedDeckCard } from '@/lib/commander/types'

export type LibraryImportProvider = 'moxfield' | 'archidekt'

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

type SupabaseLike = any

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
