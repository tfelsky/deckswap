import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  calculateAuctionPrototype,
  type AuctionDuration,
  type AuctionFormat,
} from '@/lib/auction/prototype'

export const dynamic = 'force-dynamic'

function parseMoney(value: string | string[] | undefined, fallback: number) {
  const candidate = Array.isArray(value) ? value[0] : value
  const parsed = Number(candidate)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function parseFormat(value: string | string[] | undefined): AuctionFormat {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate === 'no_reserve' ? 'no_reserve' : 'reserve'
}

function parseDuration(value: string | string[] | undefined): AuctionDuration {
  const candidate = Number(Array.isArray(value) ? value[0] : value)
  return candidate === 3 || candidate === 5 ? candidate : 7
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`
}

export default async function AuctionPrototypePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = searchParams ? await searchParams : {}
  const deckId = Number(Array.isArray(params.deckId) ? params.deckId[0] : params.deckId)
  const format = parseFormat(params.format)
  const durationDays = parseDuration(params.durationDays)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  let deckName = 'Untitled deck'
  let deckCommander = 'Commander not set'
  let deckImageUrl: string | null = null
  let deckValue = parseMoney(params.deckValue, 250)
  let reservePrice = parseMoney(params.reservePrice, deckValue * 0.9)

  if (Number.isFinite(deckId)) {
    const { data: deck } = await supabase
      .from('decks')
      .select('id, user_id, name, commander, image_url, price_total_usd_foil')
      .eq('id', deckId)
      .single()

    if (!deck || deck.user_id !== user.id) {
      redirect('/my-decks')
    }

    deckName = deck.name
    deckCommander = deck.commander || 'Commander not set'
    deckImageUrl = deck.image_url || null
    deckValue = parseMoney(params.deckValue, Number(deck.price_total_usd_foil ?? 0) || 250)
    reservePrice = parseMoney(params.reservePrice, deckValue * 0.9)
  }

  const result = calculateAuctionPrototype({
    deckValue,
    format,
    reservePrice,
    durationDays,
  })

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-wrap gap-3">
            <Link
              href={Number.isFinite(deckId) ? `/my-decks/${deckId}` : '/my-decks'}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
            >
              {'<-'} Back
            </Link>
            <Link
              href="/decks"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Marketplace
            </Link>
          </div>

          <div className="mt-8 max-w-4xl">
            <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium tracking-wide text-amber-300">
              Auction Launch Prototype
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Launch a deck into a faster sale flow
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-zinc-400">
              This prototype models no-reserve and reserve auctions for users who want a quicker
              sale path than waiting for a value-for-value trade.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex flex-col gap-6 md:flex-row">
                <div className="w-full max-w-[12rem] overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                  <div className="aspect-[5/7]">
                    {deckImageUrl ? (
                      <img
                        src={deckImageUrl}
                        alt={deckName}
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full items-end bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-5">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-amber-300/80">
                            Auction Candidate
                          </div>
                          <div className="mt-2 text-lg font-semibold text-white">{deckCommander}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="text-sm uppercase tracking-[0.2em] text-zinc-500">Selected Deck</div>
                  <h2 className="mt-3 text-3xl font-semibold">{deckName}</h2>
                  <p className="mt-2 text-sm text-zinc-400">{deckCommander}</p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm text-zinc-400">Blended Value</div>
                      <div className="mt-2 text-2xl font-semibold text-emerald-300">
                        {formatUsd(result.deckValue)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm text-zinc-400">Auction Type</div>
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {result.format === 'no_reserve' ? 'No reserve' : 'Reserve'}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm text-zinc-400">Duration</div>
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {result.durationDays} days
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <form className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Auction Settings</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Tune how aggressive or protected the sale should feel before live bidding exists.
                  </p>
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:opacity-90"
                >
                  Recalculate
                </button>
              </div>

              {Number.isFinite(deckId) && <input type="hidden" name="deckId" value={deckId} />}

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Deck value</label>
                  <input
                    name="deckValue"
                    defaultValue={deckValue}
                    inputMode="decimal"
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-amber-400/40"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Auction type</label>
                  <select
                    name="format"
                    defaultValue={format}
                    style={{ colorScheme: 'dark' }}
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-amber-400/40"
                  >
                    <option value="reserve" className="bg-zinc-900 text-white">
                      Reserve auction
                    </option>
                    <option value="no_reserve" className="bg-zinc-900 text-white">
                      No-reserve auction
                    </option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Reserve price</label>
                  <input
                    name="reservePrice"
                    defaultValue={reservePrice}
                    inputMode="decimal"
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-amber-400/40"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Duration</label>
                  <select
                    name="durationDays"
                    defaultValue={String(durationDays)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-amber-400/40"
                  >
                    <option value="3" className="bg-zinc-900 text-white">
                      3 days
                    </option>
                    <option value="5" className="bg-zinc-900 text-white">
                      5 days
                    </option>
                    <option value="7" className="bg-zinc-900 text-white">
                      7 days
                    </option>
                  </select>
                </div>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Auction Outcome Model</h2>
              <p className="mt-2 text-sm text-zinc-400">
                This gives sellers a realistic view of what speed-for-liquidity can look like.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm text-zinc-400">Suggested Starting Bid</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatUsd(result.suggestedStartingBid)}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm text-zinc-400">Estimated Winning Bid</div>
                  <div className="mt-2 text-2xl font-semibold text-amber-300">
                    {formatUsd(result.estimatedWinningBid)}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm text-zinc-400">DeckSwap Seller Fee</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatUsd(result.sellerFee)}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm text-zinc-400">Estimated Payout</div>
                  <div className="mt-2 text-2xl font-semibold text-emerald-300">
                    {formatUsd(result.payoutBeforeShipping)}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Before outbound shipping and payment rails
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Launch Guidance</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                {result.notes.map((note) => (
                  <p key={note} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    {note}
                  </p>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Launch Status</h2>
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-zinc-950/70 p-4">
                <div className="text-sm font-medium text-white">Live bidding is not wired yet</div>
                <p className="mt-2 text-sm text-zinc-400">
                  This is the seller-side launch prototype. The next step would be persistent auction
                  records, bid intake, timer states, and settlement after the auction closes.
                </p>
              </div>

              <button className="mt-5 w-full rounded-2xl bg-amber-400 px-5 py-3 text-sm font-medium text-zinc-950 opacity-80">
                Launch Auction Prototype
              </button>
              <p className="mt-3 text-center text-xs text-zinc-500">
                Placeholder only for now. No live auction is created yet.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
