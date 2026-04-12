'use server'

import { importNormalizedDeckToCollection, toFriendlyImportError } from '@/lib/deck-imports'
import {
  fetchLibraryDeck,
  fetchLibrarySingles,
  persistLibraryImportLinkage,
  persistLibrarySinglesImportLinkage,
  type LibraryDeckSummary,
  type LibraryImportProvider,
} from '@/lib/deck-sources/library'
import { importSinglesToCollection } from '@/lib/singles/imports'
import { looksLikeArchidektCollectionTable, parseArchidektCollectionTable } from '@/lib/singles/parse'
import { createClient } from '@/lib/supabase/server'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { redirect } from 'next/navigation'

function buildReturnUrl(
  provider: string,
  account: string,
  scope: string,
  params?: Record<string, string | number>
) {
  const search = new URLSearchParams()
  search.set('provider', provider)
  search.set('account', account)
  search.set('scope', scope)

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

function getFriendlySinglesImportMessage(message?: string) {
  const normalized = String(message ?? '').trim()

  if (!normalized) {
    return 'Singles import failed before any rows were saved.'
  }

  if (normalized.includes('File-based singles import is only set up for Archidekt')) {
    return 'That file upload needs the provider set to Archidekt. Switch the provider to Archidekt, then upload the collection CSV or TSV again.'
  }

  if (normalized.includes('does not look like an Archidekt collection export')) {
    return 'That file did not match the expected Archidekt collection export format. Use an Archidekt collection CSV or TSV with quantity and card-name columns, then try again.'
  }

  if (normalized.includes('No readable singles rows were found')) {
    return 'The file uploaded successfully, but no readable singles rows were found in it. Double-check the export format and make sure it contains card rows.'
  }

  if (normalized.includes('Singles inventory tables are not set up yet')) {
    return 'The import could not save because the singles inventory tables are not set up in Supabase yet.'
  }

  return normalized
}

export async function importLibraryDeckAction(formData: FormData) {
  const { supabase, user } = await requireSignedInUser()
  const provider = String(formData.get('provider') || '').trim() as LibraryImportProvider
  const account = String(formData.get('account') || '').trim()
  const scope = String(formData.get('scope') || 'decks').trim()
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

    redirect(buildReturnUrl(provider, account, scope, { importedDeckId: result.deckId }))
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }

    redirect(
      buildReturnUrl(provider, account, scope, {
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
  const scope = String(formData.get('scope') || 'decks').trim()
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

  redirect(buildReturnUrl(provider, account, scope, { importedCount, failedCount }))
}

export async function importLibrarySinglesSourceAction(formData: FormData) {
  const { supabase, user } = await requireSignedInUser()
  const provider = String(formData.get('provider') || '').trim() as LibraryImportProvider
  const account = String(formData.get('account') || '').trim()
  const scope = String(formData.get('scope') || 'singles').trim()
  const sourceUrl = String(formData.get('source_url') || '').trim()
  const sourceFile = formData.get('source_file')

  const hasUploadedFile = sourceFile instanceof File && sourceFile.size > 0

  if (!provider || (!sourceUrl && !hasUploadedFile)) {
    redirect('/import-library?error=missing')
  }

  try {
    let source: Awaited<ReturnType<typeof fetchLibrarySingles>>

    if (hasUploadedFile) {
      const fileText = (await sourceFile.text()).trim()
      const fileStem = sourceFile.name.replace(/\.[^.]+$/, '').trim() || 'archidekt-collection'
      const fallbackSourceKey = `file:${fileStem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'archidekt-collection'}`

      if (provider !== 'archidekt') {
        throw new Error('File-based singles import is only set up for Archidekt collection exports right now.')
      }

      if (!looksLikeArchidektCollectionTable(fileText)) {
        throw new Error(
          'That file does not look like an Archidekt collection export yet. Upload a CSV or TSV with quantity and card-name columns plus collection metadata like condition, language, set, or collector number.'
        )
      }

      const items = parseArchidektCollectionTable(fileText)

      if (items.length === 0) {
        throw new Error('No readable singles rows were found in that Archidekt collection file.')
      }

      source = {
        sourceName: fileStem,
        sourceUrl: '',
        externalSourceId: fallbackSourceKey,
        accountLabel: account || fileStem,
        items,
      }
    } else {
      source = await fetchLibrarySingles(provider, sourceUrl)
    }

    const result = await importSinglesToCollection({
      supabase,
      userId: user.id,
      actorUserId: user.id,
      provider,
      sourceScope: 'singles',
      sourceAccount: source.accountLabel,
      sourceKey: source.externalSourceId,
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      items: source.items,
    })

    await persistLibrarySinglesImportLinkage(supabase, {
      userId: user.id,
      provider,
      accountLabel: source.accountLabel,
      sourceScope: 'singles',
      sourceKey: source.externalSourceId,
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      importedItemCount: result.importedCount,
      warningCount: result.warningCount,
      skippedCount: result.skippedCount,
      failedCount: result.failedCount,
      syncStatus: result.warningCount > 0 ? 'imported_with_warnings' : 'imported',
    })

    redirect(
      buildReturnUrl(provider, account, scope, {
        importedSinglesCount: result.importedCount,
        warningCount: result.warningCount,
        skippedCount: result.skippedCount,
        importedSourceName: source.sourceName,
      })
    )
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }

    const rawMessage =
      error instanceof Error ? error.message.slice(0, 180) : 'Singles import failed.'
    const message = getFriendlySinglesImportMessage(rawMessage)

    const fileName =
      sourceFile instanceof File && sourceFile.size > 0
        ? sourceFile.name.replace(/\.[^.]+$/, '').trim() || 'archidekt-collection'
        : ''
    const fallbackSourceKey =
      sourceFile instanceof File && sourceFile.size > 0
        ? `file:${fileName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'archidekt-collection'}`
        : sourceUrl || 'manual-source'
    const fallbackSourceName = fileName || account || 'singles-import'
    const fallbackSourceUrl = sourceFile instanceof File && sourceFile.size > 0 ? '' : sourceUrl
    const fallbackAccountLabel = account || fileName || provider

    await persistLibrarySinglesImportLinkage(supabase, {
      userId: user.id,
      provider,
      accountLabel: fallbackAccountLabel,
      sourceScope: 'singles',
      sourceKey: fallbackSourceKey,
      sourceName: fallbackSourceName,
      sourceUrl: fallbackSourceUrl,
      importedItemCount: 0,
      warningCount: 0,
      skippedCount: 0,
      failedCount: 1,
      syncStatus: 'error',
      lastError: message,
    })

    redirect(
      buildReturnUrl(provider, account, scope, {
        importFailed: 'singles',
        importFailedKind: hasUploadedFile ? 'file' : 'source',
        message,
      })
    )
  }
}
