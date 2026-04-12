import AppHeader from '@/components/app-header'
import {
  getLibraryImportCapabilities,
  listLibraryDecks,
  listLibrarySingleSources,
  type LibraryDeckSummary,
  type LibraryImportProvider,
  type LibraryImportScope,
  type LibrarySingleSourceSummary,
} from '@/lib/deck-sources/library'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  importAllLibraryDecksAction,
  importLibraryDeckAction,
  importLibrarySinglesSourceAction,
} from './actions'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function getSingleParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key]
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function formatTimestamp(value?: string | null) {
  if (!value) return 'Updated recently'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Updated recently'

  return parsed.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function isExternalImportSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.external_deck_imports'") ||
    message.includes('relation "public.external_deck_imports"')
  )
}

function isExternalSingleImportSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.external_single_imports'") ||
    message.includes('relation "public.external_single_imports"') ||
    message.includes("relation 'public.external_single_sources'") ||
    message.includes('relation "public.external_single_sources"') ||
    message.includes("relation 'public.single_inventory_items'") ||
    message.includes('relation "public.single_inventory_items"')
  )
}

export default async function ImportLibraryPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const provider = (getSingleParam(resolvedSearchParams, 'provider') || 'moxfield') as LibraryImportProvider
  const scope = ((getSingleParam(resolvedSearchParams, 'scope') || 'decks') as LibraryImportScope) || 'decks'
  const account = getSingleParam(resolvedSearchParams, 'account')
  const importedDeckId = getSingleParam(resolvedSearchParams, 'importedDeckId')
  const importedCount = getSingleParam(resolvedSearchParams, 'importedCount')
  const failedCount = getSingleParam(resolvedSearchParams, 'failedCount')
  const importedSinglesCount = getSingleParam(resolvedSearchParams, 'importedSinglesCount')
  const warningCount = getSingleParam(resolvedSearchParams, 'warningCount')
  const skippedCount = getSingleParam(resolvedSearchParams, 'skippedCount')
  const importedSourceName = getSingleParam(resolvedSearchParams, 'importedSourceName')
  const importFailed = getSingleParam(resolvedSearchParams, 'importFailed')
  const importFailedMessage = getSingleParam(resolvedSearchParams, 'message')
  const providerCapabilities = getLibraryImportCapabilities(provider)

  let deckPreview:
    | {
        username: string
        profileUrl: string
        decks: LibraryDeckSummary[]
      }
    | null = null
  let singlesPreview:
    | {
        accountLabel: string
        profileUrl: string
        sources: LibrarySingleSourceSummary[]
      }
    | null = null
  let previewError: string | null = null

  if (account && scope !== 'full_collection') {
    try {
      if (scope === 'singles') {
        singlesPreview = await listLibrarySingleSources(provider, account)
      } else {
        deckPreview = await listLibraryDecks(provider, account)
      }
    } catch (error) {
      previewError =
        error instanceof Error ? error.message : 'Library preview could not be loaded right now.'
    }
  }

  const previewDeckIds = deckPreview?.decks.map((deck) => deck.externalDeckId) ?? []
  const importedMap = new Map<string, number>()

  if (previewDeckIds.length > 0) {
    const importsResult = await supabase
      .from('external_deck_imports')
      .select('external_deck_id, deck_id')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .in('external_deck_id', previewDeckIds)

    if (!importsResult.error) {
      for (const row of importsResult.data ?? []) {
        const externalDeckId = String((row as { external_deck_id?: string }).external_deck_id ?? '').trim()
        const deckId = Number((row as { deck_id?: number }).deck_id ?? 0)
        if (externalDeckId && deckId > 0) {
          importedMap.set(externalDeckId, deckId)
        }
      }
    } else if (!isExternalImportSchemaMissing(importsResult.error.message)) {
      previewError = previewError ?? importsResult.error.message
    }
  }

  const previewSingleIds = singlesPreview?.sources.map((source) => source.externalSourceId) ?? []
  const importedSingleMap = new Map<string, { importedItemCount: number; warningCount: number }>()

  if (previewSingleIds.length > 0) {
    const importsResult = await supabase
      .from('external_single_imports')
      .select('source_key, imported_item_count, warning_count')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .eq('source_scope', 'singles')
      .in('source_key', previewSingleIds)

    if (!importsResult.error) {
      for (const row of importsResult.data ?? []) {
        const sourceKey = String((row as { source_key?: string }).source_key ?? '').trim()
        if (!sourceKey) continue
        importedSingleMap.set(sourceKey, {
          importedItemCount: Number((row as { imported_item_count?: number }).imported_item_count ?? 0),
          warningCount: Number((row as { warning_count?: number }).warning_count ?? 0),
        })
      }
    } else if (!isExternalSingleImportSchemaMissing(importsResult.error.message)) {
      previewError = previewError ?? importsResult.error.message
    }
  }

  const accountPlaceholder =
    scope === 'singles'
      ? provider === 'archidekt'
        ? 'archidekt.com/collection/v2/123456'
        : 'https://moxfield.com/decks/your-binder-or-list'
      : provider === 'archidekt'
      ? 'archidekt.com/u/yourname or your Archidekt username'
      : 'moxfield.com/users/yourname'

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="import" isSignedIn />

      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/import-deck"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
            >
              {'<-'} Back to single deck import
            </Link>
            <Link
              href="/my-singles"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
            >
              View private singles inventory
            </Link>
          </div>

          <div className="mt-8 max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
              Inventory Import
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Import decks and singles into Mythiverse Exchange Ones
            </h1>
            <p className="mt-3 text-zinc-400">
              Phase 1 now supports public deck-library imports plus private singles intake from
              supported provider sources. Decks still flow into staging as full listings, while
              singles land in a private inventory surface that stays out of the marketplace until a
              later release.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[24rem_minmax(0,1fr)]">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold text-white">Preview an inventory source</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Choose whether you are bringing in full decks or private singles inventory. Full
              collection exports remain a later slice.
            </p>

            {scope === 'singles' ? (
              <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-100">
                <div className="font-medium text-white">Singles import modes</div>
                <p className="mt-2">
                  Use a public source URL for live provider fetches, or upload an Archidekt
                  collection CSV/TSV file directly. File import is currently supported for
                  Archidekt.
                </p>
              </div>
            ) : null}

            <div className="mt-6 grid gap-3">
              {providerCapabilities.map((capability) => (
                <div
                  key={capability.scope}
                  className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-white">{capability.label}</div>
                    <div
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        capability.status === 'available'
                          ? 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                          : 'border border-white/10 bg-white/5 text-zinc-300'
                      }`}
                    >
                      {capability.status === 'available' ? 'Available now' : 'Planned next'}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">{capability.description}</p>
                </div>
              ))}
            </div>

            <form method="get" className="mt-6 grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Inventory scope</label>
                <select
                  name="scope"
                  defaultValue={scope}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-emerald-400/40"
                >
                  <option value="decks">Deck libraries</option>
                  <option value="singles">Singles binders</option>
                  <option value="full_collection">Whole collection exports (preview only)</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Provider</label>
                <select
                  name="provider"
                  defaultValue={provider}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-emerald-400/40"
                >
                  <option value="moxfield">Moxfield</option>
                  <option value="archidekt">Archidekt</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  {scope === 'singles' ? 'Singles source URL' : 'Username or profile URL'}
                </label>
                <input
                  name="account"
                  defaultValue={account}
                  placeholder={accountPlaceholder}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
                />
              </div>

              <button
                type="submit"
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
              >
                {scope === 'singles' ? 'Preview singles source' : 'Preview library'}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 text-sm text-zinc-400">
              <div className="font-medium text-white">Phase 1 coverage</div>
              <p className="mt-2">
                Deck libraries still import to private deck staging. Singles imports now support
                direct source URLs and land in a private singles inventory surface with enrichment,
                pricing snapshots, and import warnings when metadata is incomplete.
              </p>
            </div>

            {scope === 'singles' && provider === 'archidekt' ? (
              <form
                action={importLibrarySinglesSourceAction}
                encType="multipart/form-data"
                className="mt-6 grid gap-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4"
              >
                <input type="hidden" name="provider" value={provider} />
                <input type="hidden" name="scope" value={scope} />
                <input type="hidden" name="account" value={account} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium text-white">Import an Archidekt collection file</div>
                    <span className="rounded-full border border-amber-200/20 bg-amber-200/10 px-2.5 py-1 text-[11px] font-medium text-amber-100">
                      CSV / TSV upload
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-amber-50/80">
                    Upload an Archidekt collection export here to import singles directly without
                    using a public collection URL.
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-200">Collection export file</label>
                  <input
                    name="source_file"
                    type="file"
                    accept=".csv,.tsv,text/csv,text/tab-separated-values"
                    className="block w-full rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200 file:mr-4 file:rounded-xl file:border-0 file:bg-amber-300 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-950 hover:file:opacity-90"
                  />
                  <p className="mt-2 text-xs text-amber-50/75">
                    Best results come from Archidekt CSV/TSV exports that include quantity, card name, condition, language, set, and collector number columns.
                  </p>
                </div>
                <button
                  type="submit"
                  className="rounded-2xl bg-amber-300 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:opacity-90"
                >
                  Import collection file
                </button>
              </form>
            ) : null}

            {scope === 'singles' && provider !== 'archidekt' ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 text-sm text-zinc-400">
                <div className="font-medium text-white">File upload availability</div>
                <p className="mt-2">
                  File-based singles import is currently set up for Archidekt collection exports.
                  Switch the provider to Archidekt to reveal the CSV/TSV upload form.
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            {importedDeckId ? (
              <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Source deck imported to staging successfully.{' '}
                <Link href={`/my-decks/${importedDeckId}?tab=settings`} className="font-medium text-white underline">
                  Review deck {importedDeckId}
                </Link>
              </div>
            ) : null}

            {importedCount ? (
              <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Batch import finished with {importedCount} imported to staging and {failedCount || '0'} failed.
              </div>
            ) : null}

            {importedSinglesCount ? (
              <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {importedSourceName || 'Singles source'} imported {importedSinglesCount} singles rows into private inventory.
                {warningCount ? ` ${warningCount} imported with warnings.` : ''}
                {skippedCount ? ` ${skippedCount} duplicate rows were merged in this batch.` : ''}
                {' '}
                <Link href="/my-singles" className="font-medium text-white underline">
                  Review singles inventory
                </Link>
              </div>
            ) : null}

            {importFailed ? (
              <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {scope === 'singles' ? 'Singles source import could not finish right now.' : `Deck ${importFailed} could not be imported right now.`}
                {importFailedMessage ? ` ${importFailedMessage}` : ''}
              </div>
            ) : null}

            {previewError ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {previewError}
              </div>
            ) : null}

            {!deckPreview && !singlesPreview && !previewError ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-950/60 px-6 py-10 text-center text-zinc-400">
                {scope === 'singles'
                  ? 'Enter a supported public singles source URL to preview a private import.'
                  : 'Enter a public Moxfield or Archidekt account to preview the deck inventory available for import today.'}
              </div>
            ) : null}

            {scope === 'decks' && deckPreview ? (
              <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm text-zinc-400">Previewing</div>
                    <h2 className="mt-1 text-2xl font-semibold text-white">{deckPreview.username}</h2>
                    <a
                      href={deckPreview.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm text-emerald-300 hover:text-emerald-200"
                    >
                      Open source profile
                    </a>
                  </div>

                  {deckPreview.decks.length > 0 ? (
                    <form action={importAllLibraryDecksAction}>
                      <input type="hidden" name="provider" value={provider} />
                      <input type="hidden" name="scope" value={scope} />
                      <input type="hidden" name="account" value={account} />
                      <input type="hidden" name="username" value={deckPreview.username} />
                      <input type="hidden" name="profile_url" value={deckPreview.profileUrl} />
                      <input
                        type="hidden"
                        name="summaries_json"
                        value={JSON.stringify(deckPreview.decks)}
                      />
                      <button
                        type="submit"
                        className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15"
                      >
                        Import all visible decks ({deckPreview.decks.length})
                      </button>
                    </form>
                  ) : null}
                </div>

                <div className="mt-6">
                  <div className="text-sm font-medium text-white">Available deck imports</div>
                  <p className="mt-2 text-sm text-zinc-400">
                    These are the deck-level records currently visible from this source.
                  </p>
                </div>

                <div className="mt-4 grid gap-3">
                  {deckPreview.decks.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-zinc-950/60 px-5 py-4 text-sm text-zinc-400">
                      No public deck records were found for this account right now.
                    </div>
                  ) : (
                    deckPreview.decks.map((deck) => {
                      const existingDeckId = importedMap.get(deck.externalDeckId)

                      return (
                        <div
                          key={`${deck.provider}:${deck.externalDeckId}`}
                          className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-lg font-medium text-white">{deck.deckName}</div>
                              <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                                {provider === 'archidekt' ? 'Archidekt' : 'Moxfield'}
                              </div>
                              {deck.formatHint ? (
                                <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                                  {deck.formatHint}
                                </div>
                              ) : null}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-400">
                              <span>{formatTimestamp(deck.updatedAt)}</span>
                              <span>Imports to staging first</span>
                              <a
                                href={deck.deckUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-300 hover:text-emerald-200"
                              >
                                Open source deck
                              </a>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            {existingDeckId ? (
                              <Link
                                href={`/decks/${existingDeckId}`}
                                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white hover:bg-white/10"
                              >
                                Already imported
                              </Link>
                            ) : (
                              <form action={importLibraryDeckAction}>
                                <input type="hidden" name="provider" value={provider} />
                                <input type="hidden" name="scope" value={scope} />
                                <input type="hidden" name="account" value={account} />
                                <input type="hidden" name="username" value={deckPreview.username} />
                                <input type="hidden" name="profile_url" value={deckPreview.profileUrl} />
                                <input type="hidden" name="deck_url" value={deck.deckUrl} />
                                <input type="hidden" name="external_deck_id" value={deck.externalDeckId} />
                                <button
                                  type="submit"
                                  className="rounded-2xl bg-emerald-400 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:opacity-90"
                                >
                                  Import to staging
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ) : null}

            {scope === 'singles' && singlesPreview ? (
              <div>
                <div>
                  <div className="text-sm text-zinc-400">Previewing singles source</div>
                  <h2 className="mt-1 text-2xl font-semibold text-white">{singlesPreview.accountLabel}</h2>
                  <a
                    href={singlesPreview.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm text-emerald-300 hover:text-emerald-200"
                  >
                    Open source
                  </a>
                </div>

                <div className="mt-6">
                  <div className="text-sm font-medium text-white">Available singles sources</div>
                  <p className="mt-2 text-sm text-zinc-400">
                    Singles import stays private in phase 1. Rows are enriched and priced where possible, then saved into your singles inventory for review.
                  </p>
                </div>

                <div className="mt-4 grid gap-3">
                  {singlesPreview.sources.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-zinc-950/60 px-5 py-4 text-sm text-zinc-400">
                      No supported singles source was found for this input right now.
                    </div>
                  ) : (
                    singlesPreview.sources.map((source) => {
                      const importMeta = importedSingleMap.get(source.externalSourceId)

                      return (
                        <div
                          key={`${source.provider}:${source.externalSourceId}`}
                          className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-lg font-medium text-white">{source.sourceName}</div>
                              <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                                {source.sourceKind === 'collection' ? 'Collection' : 'Binder'}
                              </div>
                              <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                                {provider === 'archidekt' ? 'Archidekt' : 'Moxfield'}
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-400">
                              <span>{source.itemCount} cards in source</span>
                              <span>Imports to private singles inventory</span>
                              <a
                                href={source.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-300 hover:text-emerald-200"
                              >
                                Open source
                              </a>
                            </div>
                            {importMeta ? (
                              <div className="mt-2 text-sm text-zinc-400">
                                Last import saved {importMeta.importedItemCount} rows
                                {importMeta.warningCount > 0 ? ` with ${importMeta.warningCount} warnings` : ''}.
                              </div>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <form action={importLibrarySinglesSourceAction}>
                              <input type="hidden" name="provider" value={provider} />
                              <input type="hidden" name="scope" value={scope} />
                              <input type="hidden" name="account" value={account} />
                              <input type="hidden" name="source_url" value={source.sourceUrl} />
                              <button
                                type="submit"
                                className="rounded-2xl bg-emerald-400 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:opacity-90"
                              >
                                {importMeta ? 'Re-import singles' : 'Import singles'}
                              </button>
                            </form>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ) : null}

            {scope === 'full_collection' ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-950/60 px-6 py-10 text-center text-zinc-400">
                Whole collection exports are still planned. Use deck libraries or singles binders for this phase.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  )
}
