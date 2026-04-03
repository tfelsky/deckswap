'use client'

import {
  GUEST_IMPORT_DRAFT_KEY,
  GUEST_IMPORT_SAVED_QUERY_KEY,
  type GuestImportDraft,
} from '@/lib/guest-import'
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
    const raw = window.sessionStorage.getItem(GUEST_IMPORT_DRAFT_KEY)
    if (!raw) return

    try {
      setGuestDraft(JSON.parse(raw) as GuestImportDraft)
    } catch {
      setGuestDraft(null)
    }
  }, [])

  const fields = state?.fields ?? guestDraft ?? undefined
  const showGuestBanner = !!guestDraft || searchParams.get('fromGuest') === '1'
  const [sourceType, setSourceType] = useState(fields?.sourceType ?? 'text')

  useEffect(() => {
    setSourceType(fields?.sourceType ?? 'text')
  }, [fields?.sourceType])

  const isMoxfield = sourceType === 'moxfield'
  const guestDraftPresent = showGuestBanner || searchParams.get(GUEST_IMPORT_SAVED_QUERY_KEY) === '1'

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
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
              Import a Commander deck
            </h1>

            <p className="mt-3 max-w-2xl text-zinc-400">
              Bring in a deck from text, file, or a public Moxfield link, then let DeckSwap
              handle parsing, commander detection, and validation.
            </p>
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
            {showGuestBanner && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Guest preview data was carried into your account import flow. Submit this form to
                save the deck to your collection.
              </div>
            )}

            <div className="rounded-3xl border border-white/10 bg-zinc-950/60 p-5">
              <div className="text-sm font-medium text-white">Import type</div>
              <p className="mt-2 text-sm text-zinc-400">
                Start by choosing how you want to bring the deck in.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    value: 'text',
                    title: 'Paste text',
                    description: 'Best for copied decklists with commander and token sections.',
                  },
                  {
                    value: 'archidekt',
                    title: 'Upload or paste Archidekt',
                    description: 'Use an Archidekt export or pasted list.',
                  },
                  {
                    value: 'moxfield',
                    title: 'Public Moxfield link',
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
            ) : (
              <>
                <div className="rounded-3xl border border-white/10 bg-zinc-950/60 p-5">
                  <div className="text-sm font-medium text-white">Upload a file</div>
                  <p className="mt-2 text-sm text-zinc-400">
                    Upload a `.txt`, `.csv`, or `.tsv` deck export if you do not want to paste the
                    list manually.
                  </p>
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-zinc-300">
                      Deck file
                    </label>
                    <input
                      name="deck_file"
                      type="file"
                      accept=".txt,.csv,.tsv"
                      className="block w-full rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-400 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-950 hover:file:opacity-90"
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-zinc-950/60 p-5">
                  <div className="text-sm font-medium text-white">Paste deck list</div>
                  <p className="mt-2 text-sm text-zinc-400">
                    Use this for direct text imports or if you prefer to paste an Archidekt export.
                  </p>
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
                      Full Commander lists import best. If commander detection misses, you can fix
                      it from the deck page after import.
                    </p>
                  </div>
                </div>
              </>
            )}

            {!isMoxfield && (
              <input type="hidden" name="source_url" value={fields?.sourceUrl ?? ''} />
            )}

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
                Commander validation is live. Broader format rules will return once that support is
                cleaned up.
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
    <main className="min-h-screen bg-zinc-950 text-white">
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
              Import a Commander deck
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
