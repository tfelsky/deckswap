'use client'

import {
  fetchGuestImportDraftRemote,
  GUEST_IMPORT_DRAFT_QUERY_KEY,
  GUEST_IMPORT_SAVED_QUERY_KEY,
  readGuestImportDraft,
  saveGuestImportDraft,
  syncGuestImportDraftRemote,
  type GuestImportDraft,
} from '@/lib/guest-import'
import AppHeader from '@/components/app-header'
import Link from 'next/link'
import { Suspense, useActionState, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { importDeckAction, type ImportDeckActionState } from './actions'

const initialState: ImportDeckActionState = {}

export default function ImportDeckPage() {
  return (
    <Suspense fallback={<ImportDeckPageFallback />}>
      <ImportDeckPageContent />
    </Suspense>
  )
}

function ImportDeckPageContent() {
  const [state, formAction, pending] = useActionState(importDeckAction, initialState)
  const [guestDraft, setGuestDraft] = useState<GuestImportDraft | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const existingDraft = readGuestImportDraft()
    if (existingDraft) {
      setGuestDraft(existingDraft)
      return
    }

    const guestDraftToken = searchParams.get(GUEST_IMPORT_DRAFT_QUERY_KEY)?.trim()
    if (!guestDraftToken) return

    let cancelled = false

    fetchGuestImportDraftRemote(guestDraftToken)
      .then((remoteDraft) => {
        if (!remoteDraft || cancelled) return
        saveGuestImportDraft(remoteDraft)
        setGuestDraft(remoteDraft)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  const fields = state?.fields ?? guestDraft ?? undefined
  const showGuestBanner = !!guestDraft || searchParams.get('fromGuest') === '1'
  const fieldFormatOverride = state?.fields?.formatOverride ?? 'auto'
  const [sourceType, setSourceType] = useState(fields?.sourceType ?? 'paste')
  const [formatOverride, setFormatOverride] = useState(fieldFormatOverride)

  useEffect(() => {
    if (!state?.fields || !showGuestBanner) return

    const nextDraft = {
      draftToken:
        guestDraft?.draftToken ?? searchParams.get(GUEST_IMPORT_DRAFT_QUERY_KEY)?.trim() ?? undefined,
      deckName: state.fields.deckName,
      sourceType: state.fields.sourceType,
      formatOverride: state.fields.formatOverride,
      sourceUrl: state.fields.sourceUrl,
      rawList: state.fields.rawList,
    }

    saveGuestImportDraft(nextDraft)
    syncGuestImportDraftRemote(nextDraft).catch(() => {})
  }, [guestDraft?.draftToken, searchParams, showGuestBanner, state?.fields])

  useEffect(() => {
    setSourceType(fields?.sourceType ?? 'paste')
  }, [fields?.sourceType])

  useEffect(() => {
    setFormatOverride(fieldFormatOverride)
  }, [fieldFormatOverride])

  const isMoxfield = sourceType === 'moxfield'
  const isArchidektFile = sourceType === 'archidekt'
  const guestDraftPresent = showGuestBanner || searchParams.get(GUEST_IMPORT_SAVED_QUERY_KEY) === '1'

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="import" />
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <Link
            href="/decks"
            className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
          >
            {'<-'} Back to decks
          </Link>
          <Link
            href="/import-library"
            className="ml-3 inline-block rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-400/15"
          >
            Import a whole library
          </Link>

          <div className="mt-8">
            <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
              Deck Import
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Add a deck
            </h1>

            <p className="mt-3 max-w-2xl text-zinc-400">
              Start with import for the fastest path, or switch to manual creation if you want to build the listing yourself from scratch.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/create-deck"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Create manually instead
              </Link>
              <Link
                href="/precons"
                className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-400/15"
              >
                Browse precon catalog
              </Link>
            </div>
          </div>

        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <form
          action={formAction}
          className="rounded-3xl border border-white/10 bg-zinc-900 p-6 sm:p-8"
        >
          <div className="grid gap-5">
            <input type="hidden" name="guest_draft_present" value={guestDraftPresent ? '1' : '0'} />
            <input
              type="hidden"
              name="guest_draft_token"
              value={
                guestDraft?.draftToken ??
                searchParams.get(GUEST_IMPORT_DRAFT_QUERY_KEY)?.trim() ??
                ''
              }
            />
            <input type="hidden" name="next" value={searchParams.get('next')?.trim() ?? ''} />
            {showGuestBanner && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Guest preview data was carried into your account import flow. Submit this form to
                save the deck to your collection.
              </div>
            )}

            <div className="rounded-3xl border border-white/10 bg-zinc-950/60 p-5">
              <div className="text-sm font-medium text-white">How are you adding this deck?</div>
              <p className="mt-2 text-sm text-zinc-400">
                Use these buttons like simple navigation. The importer still works from what you actually provide.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    value: 'paste',
                    title: 'Paste list',
                    description: 'Best for copied decklists and exported text.',
                  },
                  {
                    value: 'upload',
                    title: 'Upload file',
                    description: 'Use a .txt, .csv, or .tsv export.',
                  },
                  {
                    value: 'archidekt',
                    title: 'Archidekt CSV',
                    description: 'Best for Archidekt CSV or TSV exports with columns.',
                  },
                  {
                    value: 'moxfield',
                    title: 'Use Moxfield URL',
                    description: 'Fastest path when the deck is public and ready to fetch.',
                  },
                ].map((option) => {
                  const selected = sourceType === option.value
                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-2xl border p-4 transition ${
                        selected
                          ? 'border-emerald-400/30 bg-emerald-400/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <input
                        type="radio"
                        name="source_type"
                        value={option.value}
                        checked={selected}
                        onChange={(e) => setSourceType(e.target.value)}
                        className="sr-only"
                      />
                      <div className="text-sm font-medium text-white">{option.title}</div>
                      <div className="mt-2 text-sm text-zinc-400">{option.description}</div>
                    </label>
                  )
                })}
              </div>
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                Selling a sealed precon or a complete played precon? Use the{' '}
                <Link href="/precons" className="font-medium text-white underline underline-offset-4">
                  precon catalog
                </Link>{' '}
                to import the canonical list with tokens in one step.
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-950/60 p-5">
              <div className="text-sm font-medium text-white">Format handling</div>
              <p className="mt-2 text-sm text-zinc-400">
                Leave this on auto-detect for most imports. If a 60-card list should be treated as
                Standard-style, you can force that here and the importer will keep sideboard-aware
                validation on from the start.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    value: 'auto',
                    title: 'Auto-detect',
                    description: 'Use source hints and deck structure to choose the format.',
                  },
                  {
                    value: 'commander',
                    title: 'Commander',
                    description: 'Best for lists missing commander headers or imported loosely.',
                  },
                  {
                    value: 'standard',
                    title: 'Standard-style',
                    description: 'Use 60-card deck rules with an optional 15-card sideboard.',
                  },
                ].map((option) => {
                  const selected = formatOverride === option.value
                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-2xl border p-4 transition ${
                        selected
                          ? 'border-emerald-400/30 bg-emerald-400/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <input
                        type="radio"
                        name="format_override"
                        value={option.value}
                        checked={selected}
                        onChange={(e) => setFormatOverride(e.target.value)}
                        className="sr-only"
                      />
                      <div className="text-sm font-medium text-white">{option.title}</div>
                      <div className="mt-2 text-sm text-zinc-400">{option.description}</div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Deck name
              </label>
              <input
                name="deck_name"
                defaultValue={fields?.deckName ?? ''}
                placeholder="Alela Artifacts"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
              />
              <p className="mt-2 text-xs text-zinc-500">
                Optional if your import source already provides the deck name.
              </p>
            </div>

            {isMoxfield ? (
              <div className="rounded-3xl border border-white/10 bg-zinc-950/60 p-5">
                <div className="text-sm font-medium text-white">Moxfield link</div>
                <p className="mt-2 text-sm text-zinc-400">
                  Paste a public Moxfield deck URL. The importer will try to pull the deck name,
                  cards, and commander data directly from the link.
                </p>
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Source URL
                  </label>
                  <input
                    name="source_url"
                    defaultValue={fields?.sourceUrl ?? ''}
                    placeholder="https://www.moxfield.com/decks/..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    Moxfield imports only work for public deck links.
                  </p>
                </div>
              </div>
            ) : sourceType === 'upload' || isArchidektFile ? (
              <div className="rounded-3xl border border-white/10 bg-zinc-950/60 p-5">
                <div className="text-sm font-medium text-white">
                  {isArchidektFile ? 'Upload an Archidekt export' : 'Upload a file'}
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  {isArchidektFile
                    ? 'Upload an Archidekt `.csv` or `.tsv` export with quantity and card-name columns. Commander, category, foil, set, and collector-number columns will be used when present.'
                    : 'Upload a `.txt`, `.csv`, or `.tsv` deck export if you do not want to paste the list manually.'}
                </p>
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    {isArchidektFile ? 'Archidekt export file' : 'Deck file'}
                  </label>
                  <input
                    name="deck_file"
                    type="file"
                    accept=".txt,.csv,.tsv"
                    className="block w-full rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-400 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-950 hover:file:opacity-90"
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    {isArchidektFile
                      ? 'If you choose the Archidekt option, the importer will prioritize Archidekt column parsing before falling back to plain deck-line parsing.'
                      : 'Text exports are parsed like plain decklists. CSV and TSV uploads can also work when they include quantity and card columns.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-zinc-950/60 p-5">
                <div className="text-sm font-medium text-white">Paste deck list</div>
                <p className="mt-2 text-sm text-zinc-400">
                  Use this for direct text imports or pasted exports from sites like Archidekt.
                </p>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-medium text-white">Tokens and emblems are optional</div>
                  <p className="mt-2 text-sm text-zinc-400">
                    Most players do not include tokens in their exported decklists, so missing them will not block a normal import. If you want the deck package to feel fully play-ready or collector-complete, you can add token, emblem, dungeon, role, initiative, monarch, or other helper lines under a separate <span className="font-medium text-white">Tokens</span> header.
                  </p>
                </div>
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Raw deck list
                  </label>
                  <textarea
                    name="raw_list"
                    rows={16}
                    placeholder={`Commander
1 Alela, Artful Provocateur

Mainboard
1 Sol Ring
1 Arcane Signet
1 Swords to Plowshares
...
1 Island

Tokens
1 Faerie Rogue`}
                    defaultValue={fields?.rawList ?? ''}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    Commander and Standard-style lists both work here. Sideboard headers are
                    supported, and you can still fix the format from the deck page later.
                  </p>
                </div>
              </div>
            )}

            {!isMoxfield && <input type="hidden" name="source_url" value={fields?.sourceUrl ?? ''} />}
            {sourceType !== 'upload' && !isArchidektFile && <input type="hidden" name="deck_file" value="" />}
            {sourceType === 'upload' && <input type="hidden" name="raw_list" value={fields?.rawList ?? ''} />}
            {isArchidektFile && <input type="hidden" name="raw_list" value={fields?.rawList ?? ''} />}

            {isMoxfield && (
              <>
                <input type="hidden" name="deck_file" value="" />
                <input type="hidden" name="raw_list" value={fields?.rawList ?? ''} />
              </>
            )}

            {state?.error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {state.error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-zinc-500">
                Commander validation is the strongest path today, with 60-card support available for simpler imports. If a deck imports imperfectly, you can still fix the format and listing details afterward.
              </div>
              <button
                type="submit"
                disabled={pending}
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? 'Importing...' : 'Import Deck'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  )
}

function ImportDeckPageFallback() {
  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="import" />
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <Link
            href="/decks"
            className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
          >
            {'<-'} Back to decks
          </Link>

          <div className="mt-8">
            <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
              Deck Import
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Import a deck
            </h1>

            <p className="mt-3 max-w-2xl text-zinc-400">
              Loading import tools...
            </p>
          </div>

        </div>
      </section>
    </main>
  )
}
