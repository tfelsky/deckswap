import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  formatTradeOfferStatus,
  formatTradeOfferTimestamp,
  getTradeOfferSignal,
  isTradeOffersSchemaMissing,
  isUnreadTradeOffer,
  type TradeOfferRow,
} from '@/lib/trade-offers'

export const dynamic = 'force-dynamic'

type DeckSummary = {
  id: number
  name: string
  commander?: string | null
  price_total_usd_foil?: number | null
}

function formatUsd(value?: number | null) {
  return `$${Number(value ?? 0).toFixed(2)}`
}

function signalClasses(tone: 'emerald' | 'amber' | 'sky' | 'zinc' | 'red') {
  switch (tone) {
    case 'emerald':
      return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
    case 'amber':
      return 'border-amber-400/20 bg-amber-400/10 text-amber-100'
    case 'sky':
      return 'border-sky-400/20 bg-sky-400/10 text-sky-100'
    case 'red':
      return 'border-red-400/20 bg-red-400/10 text-red-100'
    default:
      return 'border-white/10 bg-white/5 text-zinc-200'
  }
}

export default async function TradeOffersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const { data, error } = await supabase
    .from('trade_offers')
    .select('*')
    .or(`offered_by_user_id.eq.${user.id},requested_user_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Trade offers unavailable</h1>
          <p className="mt-3 text-sm text-zinc-300">
            {isTradeOffersSchemaMissing(error.message)
              ? 'Run docs/sql/trade-offers.sql in Supabase to enable persistent trade offers.'
              : error.message}
          </p>
        </div>
      </main>
    )
  }

  const offers = (data ?? []) as TradeOfferRow[]
  const deckIds = [...new Set(offers.flatMap((offer) => [offer.offered_deck_id, offer.requested_deck_id]))]

  const { data: decksData } = deckIds.length
    ? await supabase
        .from('decks')
        .select('id, name, commander, price_total_usd_foil')
        .in('id', deckIds)
    : { data: [] as DeckSummary[] }
  const decks = new Map<number, DeckSummary>(((decksData ?? []) as DeckSummary[]).map((deck) => [deck.id, deck]))

  const inboundOffers = offers.filter((offer) => offer.requested_user_id === user.id)
  const outboundOffers = offers.filter((offer) => offer.offered_by_user_id === user.id)
  const inboundUnreadCount = inboundOffers.filter((offer) => isUnreadTradeOffer(offer, user.id)).length
  const outboundUnreadCount = outboundOffers.filter((offer) => isUnreadTradeOffer(offer, user.id)).length

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap gap-3">
            <Link href="/my-decks" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">
              {'<-'} Back to My Decks
            </Link>
            <Link href="/trades" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
              Trades Workspace
            </Link>
          </div>

          <div className="mt-8">
            <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
              Trade Offers
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Offers Inbox</h1>
            <p className="mt-3 max-w-3xl text-zinc-400">
              Review inbound offers on your decks and track the ones you&apos;ve sent. Accepted offers can hand off directly into the escrow transaction flow.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-2">
          {[
            { title: 'Incoming offers', offers: inboundOffers, unread: inboundUnreadCount, kind: 'inbound' as const },
            { title: 'Sent offers', offers: outboundOffers, unread: outboundUnreadCount, kind: 'outbound' as const },
          ].map((group) => (
            <div key={group.title} className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">{group.title}</h2>
                <div className="flex items-center gap-2">
                  {group.unread > 0 && (
                    <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-300">
                      {group.unread} new
                    </div>
                  )}
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300">
                    {group.offers.length}
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {group.offers.length > 0 ? (
                  group.offers.map((offer) => {
                    const offeredDeck = decks.get(offer.offered_deck_id)
                    const requestedDeck = decks.get(offer.requested_deck_id)
                    const unread = isUnreadTradeOffer(offer, user.id)
                    const signal = getTradeOfferSignal(offer, user.id)

                    return (
                      <Link
                        key={offer.id}
                        href={`/trade-offers/${offer.id}`}
                        className={`block rounded-3xl border p-5 hover:bg-white/10 ${
                          unread
                            ? 'border-emerald-400/30 bg-emerald-400/10'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-emerald-300/80">
                              Offer #{offer.id}
                            </div>
                            <div className="mt-2 text-lg font-semibold text-white">
                              {offeredDeck?.name || 'Offered deck'} for {requestedDeck?.name || 'Requested deck'}
                            </div>
                            <div className="mt-2 text-sm text-zinc-400">
                              {group.kind === 'inbound'
                                ? `They want your ${requestedDeck?.name || 'deck'}`
                                : `You offered ${offeredDeck?.name || 'your deck'} for ${requestedDeck?.name || 'their deck'}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-zinc-400">
                              {formatTradeOfferStatus(offer.status)}
                            </div>
                            {unread && (
                              <div className="mt-2 text-xs font-medium uppercase tracking-wide text-emerald-300">
                                Unread
                              </div>
                            )}
                            <div className="mt-2 text-sm text-emerald-300">
                              +{formatUsd(offer.cash_equalization_usd)}
                            </div>
                          </div>
                        </div>

                        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${signalClasses(signal.tone)}`}>
                          <div className="font-medium">{signal.label}</div>
                          <div className="mt-1 text-xs opacity-90">{signal.description}</div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <div className="text-xs uppercase tracking-wide text-zinc-500">Offered deck</div>
                            <div className="mt-2 text-sm font-medium text-white">
                              {offeredDeck?.name || 'Unknown deck'}
                            </div>
                            <div className="mt-1 text-sm text-zinc-400">
                              {formatUsd(offeredDeck?.price_total_usd_foil)}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <div className="text-xs uppercase tracking-wide text-zinc-500">Requested deck</div>
                            <div className="mt-2 text-sm font-medium text-white">
                              {requestedDeck?.name || 'Unknown deck'}
                            </div>
                            <div className="mt-1 text-sm text-zinc-400">
                              {formatUsd(requestedDeck?.price_total_usd_foil)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 text-xs text-zinc-500">
                          Created {formatTradeOfferTimestamp(offer.created_at)}
                        </div>

                        {offer.accepted_trade_transaction_id ? (
                          <div className="mt-3 text-sm font-medium text-emerald-300">
                            Open trade deal {'->'}
                          </div>
                        ) : offer.superseded_by_offer_id ? (
                          <div className="mt-3 text-sm font-medium text-amber-200">
                            Open latest counteroffer {'->'}
                          </div>
                        ) : (
                          <div className="mt-3 text-sm font-medium text-zinc-300">
                            Open offer {'->'}
                          </div>
                        )}
                      </Link>
                    )
                  })
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
                    <p className="text-sm text-zinc-400">No offers in this section yet.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
