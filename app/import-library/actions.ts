'use server'

import { importNormalizedDeckToCollection, toFriendlyImportError } from '@/lib/deck-imports'
import {
  fetchLibraryDeck,
  persistLibraryImportLinkage,
  type LibraryDeckSummary,
  type LibraryImportProvider,
} from '@/lib/deck-sources/library'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function buildReturnUrl(provider: string, account: string, params?: Record<string, string | number>) {
  const search = new URLSearchParams()
  search.set('provider', provider)
  search.set('account', account)

  for (const [key, value] of Object.entries(params ?? {})) {
    search.set(key, String(value))
  }

  return `/import-library?${search.toString()}`
}

async function requireSignedInUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  return { supabase, user }
}

export async function importLibraryDeckAction(formData: FormData) {
  const { supabase, user } = await requireSignedInUser()
  const provider = String(formData.get('provider') || '').trim() as LibraryImportProvider
  const account = String(formData.get('account') || '').trim()
  const username = String(formData.get('username') || '').trim()
  const profileUrl = String(formData.get('profile_url') || '').trim()
  const deckUrl = String(formData.get('deck_url') || '').trim()
  const externalDeckId = String(formData.get('external_deck_id') || '').trim()

  if (!provider || !account || !deckUrl || !externalDeckId) {
    redirect('/import-library?error=missing')
  }

  try {
    const remoteDeck = await fetchLibraryDeck(provider, deckUrl)
    const result = await importNormalizedDeckToCollection({
      supabase,
      userId: user.id,
      actorUserId: user.id,
      deckName: remoteDeck.deckName,
      sourceType: provider,
      sourceUrl: deckUrl,
      parsedCards: remoteDeck.cards,
      sourceFormatHint: remoteDeck.format,
    })

    await persistLibraryImportLinkage(supabase, {
      userId: user.id,
      deckId: result.deckId,
      provider,
      username,
      profileUrl,
      externalDeckId,
      externalDeckUrl: deckUrl,
      syncStatus: result.enrichFailed ? 'imported_with_warnings' : 'imported',
    })

    redirect(buildReturnUrl(provider, account, { importedDeckId: result.deckId }))
  } catch (error) {
    redirect(
      buildReturnUrl(provider, account, {
        importFailed: externalDeckId,
        message: toFriendlyImportError(
          error instanceof Error ? error.message.slice(0, 180) : 'Library deck import failed.'
        ),
      })
    )
  }
}

export async function importAllLibraryDecksAction(formData: FormData) {
  const { supabase, user } = await requireSignedInUser()
  const provider = String(formData.get('provider') || '').trim() as LibraryImportProvider
  const account = String(formData.get('account') || '').trim()
  const username = String(formData.get('username') || '').trim()
  const profileUrl = String(formData.get('profile_url') || '').trim()
  const summariesRaw = String(formData.get('summaries_json') || '').trim()

  if (!provider || !account || !summariesRaw) {
    redirect('/import-library?error=missing')
  }

  let importedCount = 0
  let failedCount = 0

  try {
    const summaries = JSON.parse(summariesRaw) as LibraryDeckSummary[]
    const limitedSummaries = summaries.slice(0, 50)

    for (const summary of limitedSummaries) {
      try {
        const remoteDeck = await fetchLibraryDeck(provider, summary.deckUrl)
        const result = await importNormalizedDeckToCollection({
          supabase,
          userId: user.id,
          actorUserId: user.id,
          deckName: remoteDeck.deckName,
          sourceType: provider,
          sourceUrl: summary.deckUrl,
          parsedCards: remoteDeck.cards,
          sourceFormatHint: remoteDeck.format,
        })

        await persistLibraryImportLinkage(supabase, {
          userId: user.id,
          deckId: result.deckId,
          provider,
          username,
          profileUrl,
          externalDeckId: summary.externalDeckId,
          externalDeckUrl: summary.deckUrl,
          syncStatus: result.enrichFailed ? 'imported_with_warnings' : 'imported',
        })

        importedCount += 1
      } catch {
        failedCount += 1
      }
    }
  } catch {
    failedCount = 1
  }

  redirect(buildReturnUrl(provider, account, { importedCount, failedCount }))
}
