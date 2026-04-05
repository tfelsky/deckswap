import type { Metadata } from 'next'
import Link from 'next/link'
import AppHeader from '@/components/app-header'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  formatAuctionStatus,
  formatAuctionTimestamp,
  formatAuctionType,
  isAuctionReserveMet,
  isAuctionSchemaMissing,
} from '@/lib/auction/foundation'
import { getUnreadNotificationsCount } from '@/lib/notifications'
import { createClient } from '@/lib/supabase/server'
import { isUnreadTradeOffer, type TradeOfferRow } from '@/lib/trade-offers'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Live Auctions | Mythiverse Exchange',
  description:
    'Browse live deck auctions, reserve and no-reserve listings, current bids, and sale-stage follow-through on Mythiverse Exchange.',
  alternates: {
    canonical: '/auctions',
  },
}

type AuctionListingRow = {
  id: number
  deck_id: number
  seller_user_id: string
  status: string
  auction_type: string
  starting_bid_usd?: number | null
  reserve_price_usd?: number | null
  current_bid_usd?: number | null
  bid_count?: number | null
  ends_at?: string | null
  image_url?: string | null
  name?: string | null
  commander?: string | null
}

function formatUsd(value?: number | null) {
  return `$${Number(value ?? 0).toFixed(2)}`
}

export default async function AuctionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = await getAdminAccessForUser(user)
  const { data: tradeOffersData } = user
    ? await supabase
        .from('trade_offers')
        .select('id, offered_by_user_id, requested_user_id, offered_deck_id, requested_deck_id, cash_equalization_usd, status, message, accepted_trade_transaction_id, last_action_by_user_id, offered_by_viewed_at, requested_user_viewed_at, created_at, updated_at')
        .or(`offered_by_user_id.eq.${user.id},requested_user_id.eq.${user.id}`)
    : { data: [] as TradeOfferRow[] }
  const unreadTradeOffers = user
    ? ((tradeOffersData ?? []) as TradeOfferRow[]).filter((offer) =>
        isUnreadTradeOffer(offer, user.id)
      ).length
    : 0
  const unreadNotifications = user ? await getUnreadNotificationsCount(supabase, user.id) : 0

  const auctionsResult = await supabase
    .from('auction_listings')
    .select('id, deck_id, seller_user_id, status, auction_type, starting_bid_usd, reserve_price_usd, current_bid_usd, bid_count, ends_at, decks!inner(name, commander, image_url)')
    .order('created_at', { ascending: false })

  if (auctionsResult.error) {
    return (
      <main className="min-h-screen bg-zinc-950 pt-32 text-white">
        <AppHeader
          current="decks"
          isSignedIn={!!user}
          isAdmin={access.isAdmin}
          unreadTradeOffers={unreadTradeOffers}
          unreadNotifications={unreadNotifications}
        />
        <section className="mx-auto max-w-4xl px-6 py-16">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8">
            <h1 className="text-3xl font-semibold text-red-300">Auctions unavailable</h1>
            <p className="mt-3 text-zinc-300">
              {isAuctionSchemaMissing(auctionsResult.error.message)
                ? 'Run docs/sql/auction-foundation.sql in Supabase to enable auctions.'
                : auctionsResult.error.message}
            </p>
          </div>
        </section>
      </main>
    )
  }

  const auctions = ((auctionsResult.data ?? []) as Array<any>).map((row) => ({
    ...row,
    name: row.decks?.name ?? 'Untitled deck',
    commander: row.decks?.commander ?? 'Commander not set',
    image_url: row.decks?.image_url ?? null,
  })) as AuctionListingRow[]

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader
        current="decks"
        isSignedIn={!!user}
        isAdmin={access.isAdmin}
        unreadTradeOffers={unreadTradeOffers}
        unreadNotifications={unreadNotifications}
      />

      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium tracking-wide text-amber-300">
                Direct-Sale Auctions
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                Live auctions and sale-stage follow-through
              </h1>
              <p className="mt-4 text-lg text-zinc-400">
                Browse reserve and no-reserve auctions, watch late-bid extensions, and follow listings through payment, shipping, delivery, and payout.
              </p>
            </div>

            {user && (
              <Link
                href="/my-decks"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                Launch from my decks
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {auctions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <h2 className="text-2xl font-semibold">No auctions yet</h2>
            <p className="mt-3 text-zinc-400">
              Launch the first auction from one of your decks to start the faster-sale side of the marketplace.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {auctions.map((auction) => (
              <Link
                key={auction.id}
                href={`/auctions/${auction.id}`}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/80 transition hover:border-amber-400/30 hover:bg-zinc-900"
              >
                <div className="relative aspect-[16/10] overflow-hidden border-b border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
                  {auction.image_url ? (
                    <img
                      src={auction.image_url}
                      alt={auction.name ?? 'Auction deck'}
                      className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : null}

                  <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-medium text-white">
                    {formatAuctionStatus(auction.status)}
                  </div>

                  <div className="absolute right-4 top-4 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200">
                    {formatAuctionType(auction.auction_type)}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5">
                    <div className="text-xl font-semibold text-white">{auction.name}</div>
                    <div className="mt-1 text-sm text-zinc-300">{auction.commander}</div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">Current bid</div>
                      <div className="mt-2 text-lg font-semibold text-amber-300">
                        {formatUsd(auction.current_bid_usd)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">Bid count</div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {Number(auction.bid_count ?? 0)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-300">
                    {auction.auction_type === 'reserve' && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        Reserve {isAuctionReserveMet(auction.auction_type, auction.reserve_price_usd, auction.current_bid_usd) ? 'met' : 'open'}
                      </span>
                    )}
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      Ends {formatAuctionTimestamp(auction.ends_at)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
