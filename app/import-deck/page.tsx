'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { importDeckAction } from './actions'

const initialState = {}

export default function ImportDeckPage() {
  const [state, formAction, pending] = useActionState(importDeckAction, initialState)

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
              Paste a deck list with commander, mainboard, and optional token sections.
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
                required
                placeholder="Alela Artifacts"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Source type
                </label>
                <select
                  name="source_type"
                  defaultValue="text"
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
                  placeholder="https://www.moxfield.com/decks/..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Raw deck list
              </label>
              <textarea
                name="raw_list"
                required
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
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
              />
            </div>

            {state?.error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {state.error}
              </div>
            )}

            {state?.validationErrors && state.validationErrors.length > 0 && (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
                <div className="font-medium">Imported, but validation found issues:</div>
                <ul className="mt-2 list-disc pl-5">
                  {state.validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

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
