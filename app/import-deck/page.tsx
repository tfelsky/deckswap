'use client'

import { COMMANDER_BRACKETS } from '@/lib/commander/brackets'
import Link from 'next/link'
import { useActionState } from 'react'
import { importDeckAction } from './actions'

const initialState = {}

export default function ImportDeckPage() {
  const [state, formAction, pending] = useActionState(importDeckAction, initialState)
  const fields = state?.fields

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
              Paste a deck list, upload a `.txt` export, or import directly from a public Moxfield link.
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

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Source type
                </label>
                <select
                  name="source_type"
                  defaultValue={fields?.sourceType ?? 'text'}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400/40"
                >
                  <option value="text">Text</option>
                  <option value="moxfield">Moxfield</option>
                  <option value="archidekt">Archidekt</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Source URL (optional)
                </label>
                <input
                  name="source_url"
                  defaultValue={fields?.sourceUrl ?? ''}
                  placeholder="https://www.moxfield.com/decks/..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Deck file (optional)
              </label>
              <input
                name="deck_file"
                type="file"
                accept=".txt,.csv,.tsv"
                className="block w-full rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-400 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-950 hover:file:opacity-90"
              />
              <p className="mt-2 text-xs text-zinc-500">
                Upload a plain text, CSV, or TSV deck export if you don&apos;t want to paste it.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Raw deck list
              </label>
              <textarea
                name="raw_list"
                rows={18}
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
                For `Moxfield`, the link is enough. For `Text` or `Archidekt`, you can paste here or upload a file above.
              </p>
            </div>

            {state?.error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {state.error}
              </div>
            )}

            <div className="rounded-3xl border border-white/10 bg-zinc-950/60 p-5">
              <h2 className="text-lg font-semibold text-white">Commander Bracket Guide</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Imported decks are automatically estimated against the official Commander bracket beta system using Game Changers and other visible deck signals.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(Object.entries(COMMANDER_BRACKETS) as Array<
                  [string, (typeof COMMANDER_BRACKETS)[keyof typeof COMMANDER_BRACKETS]]
                >).map(([key, bracket]) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="text-sm font-medium text-white">
                      Bracket {key}: {bracket.label}
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">
                      {bracket.shortDescription}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Importing...' : 'Import Deck'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
