import AppHeader from '@/components/app-header'
import {
  listLibraryDecks,
  type LibraryDeckSummary,
  type LibraryImportProvider,
} from '@/lib/deck-sources/library'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { importAllLibraryDecksAction, importLibraryDeckAction } from './actions'

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
  const account = getSingleParam(resolvedSearchParams, 'account')
  const importedDeckId = getSingleParam(resolvedSearchParams, 'importedDeckId')
  const importedCount = getSingleParam(resolvedSearchParams, 'importedCount')
  const failedCount = getSingleParam(resolvedSearchParams, 'failedCount')
  const importFailed = getSingleParam(resolvedSearchParams, 'importFailed')
  const importFailedMessage = getSingleParam(resolvedSearchParams, 'message')

  let preview:
    | {
        username: string
        profileUrl: string
        decks: LibraryDeckSummary[]
      }
    | null = null
  let previewError: string | null = null

  if (account) {
    try {
      preview = await listLibraryDecks(provider, account)
    } catch (error) {
      previewError =
        error instanceof Error ? error.message : 'Library preview could not be loaded right now.'
    }
  }

  const previewDeckIds = preview?.decks.map((deck) => deck.externalDeckId) ?? []
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
          </div>

            <div className="mt-8 max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
              Library Import
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Pull in a whole public deck library
            </h1>
              <p className="mt-3 text-zinc-400">
                Start with a public Moxfield or Archidekt profile, preview the decks we can see,
                then import one or batch-import the whole visible library into Mythiverse Exchange. Imported decks land in staging first so you can review details before making them live.
              </p>
            </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[24rem_minmax(0,1fr)]">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold text-white">Preview a library</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Public decks only. Private lists and protected profiles will not show up here, and imported decks start in staging until you choose how to market them.
            </p>

            <form method="get" className="mt-6 grid gap-5">
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
                  Username or profile URL
                </label>
                <input
                  name="account"
                  defaultValue={account}
                  placeholder={
                    provider === 'archidekt'
                      ? 'archidekt.com/u/yourname or your Archidekt username'
                      : 'moxfield.com/users/yourname'
                  }
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
                />
              </div>

              <button
                type="submit"
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
              >
                Preview library
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 text-sm text-zinc-400">
              <div className="font-medium text-white">Phase 1 coverage</div>
              <p className="mt-2">
                This first pass imports public libraries from Moxfield and Archidekt. Deckstats
                and TappedOut are next on the roadmap once this source-linking flow proves out. Each imported deck stays private in staging until you review it.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            {importedDeckId ? (
              <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Library deck imported to staging successfully.{' '}
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

            {importFailed ? (
              <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                Deck {importFailed} could not be imported right now.
                {importFailedMessage ? ` ${importFailedMessage}` : ''}
              </div>
            ) : null}

            {previewError ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {previewError}
              </div>
            ) : null}

            {!preview && !previewError ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-950/60 px-6 py-10 text-center text-zinc-400">
                Enter a public Moxfield or Archidekt account to preview the decks available for
                import.
              </div>
            ) : null}

            {preview ? (
              <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm text-zinc-400">Previewing</div>
                    <h2 className="mt-1 text-2xl font-semibold text-white">
                      {preview.username}
                    </h2>
                    <a
                      href={preview.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm text-emerald-300 hover:text-emerald-200"
                    >
                      Open source profile
                    </a>
                  </div>

                  {preview.decks.length > 0 ? (
                    <form action={importAllLibraryDecksAction}>
                      <input type="hidden" name="provider" value={provider} />
                      <input type="hidden" name="account" value={account} />
                      <input type="hidden" name="username" value={preview.username} />
                      <input type="hidden" name="profile_url" value={preview.profileUrl} />
                      <input
                        type="hidden"
                        name="summaries_json"
                        value={JSON.stringify(preview.decks)}
                      />
                      <button
                        type="submit"
                        className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15"
                      >
                        Import all visible decks ({preview.decks.length})
                      </button>
                    </form>
                  ) : null}
                </div>

                <div className="mt-6 grid gap-3">
                  {preview.decks.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-zinc-950/60 px-5 py-4 text-sm text-zinc-400">
                      No public decks were found for this account right now.
                    </div>
                  ) : (
                    preview.decks.map((deck) => {
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
                                <input type="hidden" name="account" value={account} />
                                <input type="hidden" name="username" value={preview.username} />
                                <input type="hidden" name="profile_url" value={preview.profileUrl} />
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
          </div>
        </div>
      </section>
    </main>
  )
}
