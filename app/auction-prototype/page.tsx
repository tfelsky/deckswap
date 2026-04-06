import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AdminOnlyCallout } from '@/components/admin-only-callout'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  calculateAuctionPrototype,
  type AuctionDuration,
  type AuctionFormat,
} from '@/lib/auction/prototype'
import {
  auctionMinimumIncrement,
  formatAuctionSettlementMode,
  formatAuctionType,
  getAuctionEligibility,
  isAuctionSchemaMissing,
} from '@/lib/auction/foundation'
import FormActionButton from '@/components/form-action-button'

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

function parseSettlementMode(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate === 'self_cleared' ? 'self_cleared' : 'managed'
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`
}

function withAdminAuctionBypass(
  eligibility: ReturnType<typeof getAuctionEligibility>,
  isAdmin: boolean
) {
  if (!isAdmin) {
    return eligibility
  }

  return {
    eligible: true,
    reason: 'Admin testing override active. Auction launch is enabled for this account.',
  }
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
  const settlementMode = parseSettlementMode(params.settlementMode)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const access = await getAdminAccessForUser(user)

  const [summaryResult, deckResult] = await Promise.all([
    supabase
      .from('profile_reputation_summary')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
    Number.isFinite(deckId)
      ? supabase
          .from('decks')
          .select('id, user_id, name, commander, image_url, price_total_usd_foil')
          .eq('id', deckId)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ])

  let deckName = 'Untitled deck'
  let deckCommander = 'Commander not set'
  let deckImageUrl: string | null = null
  let deckValue = parseMoney(params.deckValue, 250)
  let reservePrice = parseMoney(params.reservePrice, deckValue * 0.9)

  if (Number.isFinite(deckId)) {
    const deck = deckResult.data

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
  const eligibility = withAdminAuctionBypass(
    getAuctionEligibility(summaryResult.data ?? null),
    access.isAdmin
  )

  async function launchAuctionAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    const access = await getAdminAccessForUser(user)

    const deckId = Number(formData.get('deckId'))
    const auctionType = String(formData.get('format') || 'reserve') === 'no_reserve' ? 'no_reserve' : 'reserve'
    const durationDays = Number(formData.get('durationDays'))
    const settlementMode =
      String(formData.get('settlementMode') || 'managed') === 'self_cleared'
        ? 'self_cleared'
        : 'managed'
    const deckValue = Math.max(0, Number(formData.get('deckValue') || 0))
    const reservePrice =
      auctionType === 'reserve' ? Math.max(0, Number(formData.get('reservePrice') || 0)) : 0

    if (!Number.isFinite(deckId) || (durationDays !== 3 && durationDays !== 5 && durationDays !== 7)) {
      redirect('/auction-prototype?error=1')
    }

    const [summaryResult, deckResult, existingAuctionResult] = await Promise.all([
      supabase
        .from('profile_reputation_summary')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('decks')
        .select('id, user_id, name, price_total_usd_foil')
        .eq('id', deckId)
        .single(),
      supabase
        .from('auction_listings')
        .select('id, status')
        .eq('deck_id', deckId)
        .in('status', ['active', 'pending_confirmation', 'awaiting_payment', 'paid', 'shipped', 'delivered'])
        .maybeSingle(),
    ])

    if (deckResult.error || !deckResult.data || deckResult.data.user_id !== user.id) {
      redirect('/my-decks')
    }

    if (existingAuctionResult.error && !isAuctionSchemaMissing(existingAuctionResult.error.message)) {
      redirect(`/auction-prototype?deckId=${deckId}&error=1`)
    }

    if (existingAuctionResult.data) {
      redirect(`/auctions/${existingAuctionResult.data.id}?existing=1`)
    }

    const eligibility = withAdminAuctionBypass(
      getAuctionEligibility(summaryResult.data ?? null),
      access.isAdmin
    )
    if (!eligibility.eligible) {
      redirect(`/auction-prototype?deckId=${deckId}&trust=1`)
    }

    const modeled = calculateAuctionPrototype({
      deckValue: deckValue || Number(deckResult.data.price_total_usd_foil ?? 0) || 0,
      format: auctionType,
      reservePrice,
      durationDays: durationDays as AuctionDuration,
    })
    const now = new Date()
    const endsAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString()

    const listingInsert = await supabase
      .from('auction_listings')
      .insert({
        deck_id: deckId,
        seller_user_id: user.id,
        status: 'active',
        auction_type: auctionType,
        settlement_mode: settlementMode,
        starting_bid_usd: modeled.suggestedStartingBid,
        reserve_price_usd: auctionType === 'reserve' ? modeled.reservePrice : null,
        current_bid_usd: 0,
        reserve_met: auctionType === 'no_reserve',
        min_increment_usd: auctionMinimumIncrement(modeled.suggestedStartingBid),
        bid_count: 0,
        extension_count: 0,
        duration_days: durationDays,
        starts_at: now.toISOString(),
        ends_at: endsAt,
      })
      .select('id')
      .single()

    if (listingInsert.error || !listingInsert.data) {
      if (isAuctionSchemaMissing(listingInsert.error?.message)) {
        redirect(`/auction-prototype?deckId=${deckId}&schemaMissing=1`)
      }

      redirect(`/auction-prototype?deckId=${deckId}&error=1`)
    }

    await supabase.from('auction_events').insert({
      auction_id: listingInsert.data.id,
      actor_user_id: user.id,
      event_type: 'auction_launched',
      event_data: {
        deckId,
        auctionType,
        settlementMode,
        durationDays,
        startingBidUsd: modeled.suggestedStartingBid,
        reservePriceUsd: auctionType === 'reserve' ? modeled.reservePrice : null,
      },
    })

    redirect(`/auctions/${listingInsert.data.id}?launched=1`)
  }

  const trustBlocked = params.trust === '1'
  const error = params.error === '1'
  const schemaMissing = params.schemaMissing === '1'

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
              href="/auctions"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Live Auctions
            </Link>
          </div>

          <div className="mt-8 max-w-4xl">
            <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium tracking-wide text-amber-300">
              Auction Launch
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Launch a deck into a faster sale flow
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-zinc-400">
              Auctions now launch into a real direct-sale workflow with late-bid time extensions,
              manual winner confirmation, and either managed follow-through or self-cleared settlement with arbitration support.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {trustBlocked && (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                {eligibility.reason}
              </div>
            )}
            {schemaMissing && (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                Run <code>docs/sql/auction-foundation.sql</code> in Supabase before launching auctions.
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
                We couldn&apos;t launch that auction right now.
              </div>
            )}
            {access.isAdmin && (
              <AdminOnlyCallout
                title="Auction testing override"
                description="This launch path is visible to admins only because it includes a trust-gate bypass for internal testing."
              >
                <p className="text-sm text-amber-50/85">{eligibility.reason}</p>
              </AdminOnlyCallout>
            )}
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
                      <p className="mt-3 text-xs text-zinc-400">
                        Based on the deck&apos;s current saved card rows. It&apos;s a pricing anchor, not a promise of the winning bid.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm text-zinc-400">Auction Type</div>
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {formatAuctionType(result.format)}
                      </div>
                    </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm text-zinc-400">Settlement lane</div>
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {formatAuctionSettlementMode(settlementMode)}
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

            <form action={launchAuctionAction} className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Auction Settings</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Choose the sale shape, then launch a real listing if your seller trust threshold is met.
                  </p>
                </div>
                <FormActionButton
                  pendingLabel="Launching auction..."
                  className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Launch Auction
                </FormActionButton>
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
                  <label className="mb-2 block text-sm text-zinc-400">Settlement lane</label>
                  <select
                    name="settlementMode"
                    defaultValue={settlementMode}
                    style={{ colorScheme: 'dark' }}
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-amber-400/40"
                  >
                    <option value="managed" className="bg-zinc-900 text-white">
                      Managed by DeckSwap
                    </option>
                    <option value="self_cleared" className="bg-zinc-900 text-white">
                      Self-cleared between users
                    </option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Duration</label>
                  <select
                    name="durationDays"
                    defaultValue={String(durationDays)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-amber-400/40"
                  >
                    <option value="3" className="bg-zinc-900 text-white">3 days</option>
                    <option value="5" className="bg-zinc-900 text-white">5 days</option>
                    <option value="7" className="bg-zinc-900 text-white">7 days</option>
                  </select>
                </div>
              </div>

              {!access.isAdmin ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                  <div className="font-medium text-white">Seller trust gate</div>
                  <p className="mt-2">{eligibility.reason}</p>
                </div>
              ) : null}

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                <div className="font-medium text-white">What the trust score means</div>
                <p className="mt-2">
                  The internal validation score is an internal seller-readiness signal based on activity, reply speed, location consistency, and transaction history. A 70+ score means the account cleared the current auction trust threshold, not that a sale is guaranteed.
                </p>
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
                    Before shipping and payment rails
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Live Auction Rules</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  Late bids extend the timer by 5 minutes to reduce sniping.
                </p>
                <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  Auction winners do not pay instantly. The listing moves into manual confirmation first.
                </p>
                <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  Managed auctions keep the current payment and delivery checkpoints. Self-cleared auctions use buyer and seller attestations plus arbitration when either side disputes the settlement.
                </p>
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
          </div>
        </div>
      </section>
    </main>
  )
}
