'use client'

import { COMMANDER_BRACKETS } from '@/lib/commander/brackets'
import AppHeader from '@/components/app-header'
import { normalizeBoxType } from '@/lib/decks/marketing'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function CreateDeckPage() {
  const supabase = createClient()
  const router = useRouter()

  const [name, setName] = useState('')
  const [commander, setCommander] = useState('')
  const [value, setValue] = useState<number | ''>('')
  const [isSleeved, setIsSleeved] = useState(false)
  const [isBoxed, setIsBoxed] = useState(false)
  const [isSealed, setIsSealed] = useState(false)
  const [isCompletePrecon, setIsCompletePrecon] = useState(false)
  const [boxType, setBoxType] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      setError(userError.message)
      setLoading(false)
      return
    }

    if (!user) {
      setError('You must be signed in to create a deck.')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('decks').insert([
      {
        name,
        commander: commander || null,
        price_estimate: value === '' ? null : Number(value),
        is_sleeved: isSleeved,
        is_boxed: isBoxed,
        is_sealed: isSealed,
        is_complete_precon: isCompletePrecon,
        box_type: isBoxed ? normalizeBoxType(boxType) : null,
        user_id: user.id,
      },
    ])

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push('/decks')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="create" />
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <Link
            href="/decks"
            className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
          >
            {'<-'} Back to decks
          </Link>

          <div className="mt-8">
            <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
              Marketplace Listing
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Create a deck</h1>

            <p className="mt-3 max-w-2xl text-zinc-400">
              Add a Commander deck to the marketplace. Brackets are now estimated automatically from a full imported list instead of using a manual power-level number.
            </p>
          </div>

        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-zinc-900 p-6 sm:p-8"
        >
          <div className="grid gap-5">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Deck name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alela Artifacts"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
              />
            </div>

            <div>
              <label
                htmlFor="commander"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Commander
              </label>
              <input
                id="commander"
                type="text"
                value={commander}
                onChange={(e) => setCommander(e.target.value)}
                placeholder="Alela, Artful Provocateur"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
              />
            </div>

            <div>
              <label
                htmlFor="value"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Estimated value ($)
              </label>
              <input
                id="value"
                type="number"
                min="0"
                step="1"
                value={value}
                onChange={(e) =>
                  setValue(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="180"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-950/60 p-5">
              <h2 className="text-lg font-semibold text-white">Listing presentation</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Show buyers how the deck is packaged, whether it is sealed, and whether a Wizards Commander precon is still complete.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={isSleeved}
                    onChange={(e) => setIsSleeved(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-emerald-400"
                  />
                  Sleeved
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={isBoxed}
                    onChange={(e) => setIsBoxed(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-emerald-400"
                  />
                  Boxed
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={isSealed}
                    onChange={(e) => setIsSealed(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-emerald-400"
                  />
                  Sealed
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={isCompletePrecon}
                    onChange={(e) => setIsCompletePrecon(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-emerald-400"
                  />
                  Complete Commander precon
                </label>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="boxType"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Box type
                </label>
                <input
                  id="boxType"
                  type="text"
                  value={boxType}
                  onChange={(e) => setBoxType(e.target.value)}
                  disabled={!isBoxed}
                  placeholder="Boulder 100+"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-950/60 p-5">
              <h2 className="text-lg font-semibold text-white">Commander Brackets</h2>
              <p className="mt-2 text-sm text-zinc-400">
                To estimate an official bracket automatically, import a full deck list. Manual listings can still be created now and upgraded with `/import-deck` later.
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

            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Creating...' : 'Create Deck'}
              </button>

              <Link
                href="/decks"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-medium text-white hover:bg-white/10"
              >
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </section>
    </main>
  )
}
