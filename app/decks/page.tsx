import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import SignOutButton from '@/components/sign-out-button'

type Deck = {
  id: number
  name: string
  commander?: string | null
  power_level?: number | null
  price_estimate?: number | null
  price_total_usd_foil?: number | null
  image_url?: string | null
}

function powerLabel(power?: number | null) {
  if (power == null) return 'Unrated'
  if (power <= 3) return 'Battlecruiser'
  if (power <= 6) return 'Casual'
  if (power <= 8) return 'High Power'
  return 'cEDH'
}

export default async function DecksPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('decks')
    .select('id, name, commander, power_level, price_estimate, price_total_usd_foil, image_url')
    .order('id', { ascending: true })

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-8">
        <h1 className="text-red-500">Error: {error.message}</h1>
      </main>
    )
  }

  const decks = (data ?? []) as Deck[]

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                Commander Marketplace
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Browse decks worth trying
              </h1>

              <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
                Discover Commander decks by power, style, and blended card value.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/create-deck"
                className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:opacity-90"
              >
                + Create Deck
              </Link>
              <Link
                href="/import-deck"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Import Deck
              </Link>
              <Link
                href="/my-decks"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                My Decks
              </Link>

              {!user ? (
                <Link
                  href="/sign-in"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Sign in
                </Link>
              ) : (
                <SignOutButton />
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Live Decks</div>
              <div className="mt-2 text-3xl font-semibold">{decks.length}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Avg. Power</div>
              <div className="mt-2 text-3xl font-semibold">
                {decks.length
                  ? (
                      decks.reduce(
                        (sum, deck) => sum + (deck.power_level ?? 0),
                        0
                      ) / decks.length
                    ).toFixed(1)
                  : '0.0'}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Top Value</div>
              <div className="mt-2 text-3xl font-semibold">
                $
                {Math.max(
                  0,
                  ...decks.map((deck) => Number(deck.price_total_usd_foil ?? 0))
                ).toFixed(2)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Status</div>
              <div className="mt-2 text-3xl font-semibold text-emerald-300">
                Live
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Available Decks
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Marketplace-style grid with commander, power level, and blended value.
            </p>
          </div>
        </div>

        {decks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <h3 className="text-xl font-semibold">No decks yet</h3>
            <p className="mt-2 text-zinc-400">
              Your connection works. Now seed the table with more decks and metadata.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {decks.map((deck) => (
              <Link key={deck.id} href={`/decks/${deck.id}`}>
                <article className="group cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/80 transition duration-200 hover:border-emerald-400/30 hover:bg-zinc-900">
                  <div className="relative aspect-[16/10] overflow-hidden border-b border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950">
                    {deck.image_url ? (
                      <>
                        <img
                          src={deck.image_url}
                          alt={deck.name}
                          className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
                        />

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5">
                          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                            Commander Deck
                          </div>
                          <div className="mt-2 text-2xl font-semibold text-white">
                            {deck.commander || 'Unknown Commander'}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full w-full items-end p-5">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                            Commander Deck
                          </div>
                          <div className="mt-2 text-2xl font-semibold text-white">
                            {deck.commander || 'Unknown Commander'}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                      Power {deck.power_level ?? 'N/A'}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold tracking-tight">
                          {deck.name}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-400">
                          Commander: {deck.commander || 'Not set'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-right">
                        <div className="text-[10px] uppercase tracking-wide text-emerald-300/80">
                          Value
                        </div>
                        <div className="text-lg font-semibold text-emerald-300">
                          ${Number(deck.price_total_usd_foil ?? 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                        {powerLabel(deck.power_level)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                        Salt Match Pending
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                        Trade Eligible
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
