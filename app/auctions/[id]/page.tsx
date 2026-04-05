import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import AppHeader from '@/components/app-header'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  auctionNextMinimumBid,
  extendedAuctionEndAt,
  formatAuctionStatus,
  formatAuctionTimestamp,
  formatAuctionType,
  getAuctionEligibility,
  isAuctionReserveMet,
  isAuctionSchemaMissing,
  shouldExtendAuction,
} from '@/lib/auction/foundation'
import { createNotification, getUnreadNotificationsCount } from '@/lib/notifications'
import { createClient } from '@/lib/supabase/server'
import { isUnreadTradeOffer, type TradeOfferRow } from '@/lib/trade-offers'

export const dynamic = 'force-dynamic'

type AuctionListing = {
  id: number
  deck_id: number
  seller_user_id: string
  status: string
  auction_type: string
  starting_bid_usd?: number | null
  reserve_price_usd?: number | null
  current_bid_usd?: number | null
  current_high_bidder_user_id?: string | null
  reserve_met?: boolean | null
  bid_count?: number | null
  extension_count?: number | null
  duration_days?: number | null
  ends_at?: string | null
  winner_user_id?: string | null
  final_bid_usd?: number | null
  payment_requested_at?: string | null
  paid_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  payout_released_at?: string | null
  created_at?: string | null
  decks?: {
    name?: string | null
    commander?: string | null
    image_url?: string | null
    price_total_usd_foil?: number | null
  } | null
}

type AuctionBid = {
  id: number
  auction_id: number
  bidder_user_id: string
  amount_usd: number
  created_at?: string | null
}

type AuctionEvent = {
  id: number
  event_type: string
  event_data?: Record<string, unknown> | null
  created_at?: string | null
}

type ReputationSummary = {
  user_id: string
  internal_validation_score?: number | null
  completed_trades_count?: number | null
  is_manually_verified?: boolean | null
  is_known_user?: boolean | null
  banned_status?: string | null
}

type MetadataAuction = Pick<
  AuctionListing,
  'id' | 'auction_type' | 'current_bid_usd' | 'ends_at'
> & {
  decks?: AuctionListing['decks']
}

function formatUsd(value?: number | null) {
  return `$${Number(value ?? 0).toFixed(2)}`
}

function isAuctionEnded(endAt?: string | null) {
  if (!endAt) return false
  return new Date(endAt).getTime() <= Date.now()
}

function formatEventLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const auctionId = Number(id)

  if (!Number.isFinite(auctionId)) {
    return {
      title: 'Auction Not Found | Mythiverse Exchange',
      robots: { index: false, follow: false },
    }
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('auction_listings')
    .select('id, auction_type, current_bid_usd, ends_at, decks!inner(name, commander, image_url)')
    .eq('id', auctionId)
    .maybeSingle()

  const auction = data as MetadataAuction | null

  if (!auction) {
    return {
      title: 'Auction Not Found | Mythiverse Exchange',
      robots: { index: false, follow: false },
    }
  }

  const deckName = auction.decks?.name?.trim() || 'Deck auction'
  const commander = auction.decks?.commander?.trim()
  const currentBid = Number(auction.current_bid_usd ?? 0)
  const description = [
    commander ? `Commander: ${commander}.` : null,
    `Auction type: ${formatAuctionType(auction.auction_type)}.`,
    currentBid > 0 ? `Current bid: $${currentBid.toFixed(2)}.` : null,
    auction.ends_at ? `Ends ${formatAuctionTimestamp(auction.ends_at)}.` : null,
    'View bidding status, pricing, and sale-stage updates on Mythiverse Exchange.',
  ]
    .filter(Boolean)
    .join(' ')
  const title = `${deckName} Auction | Mythiverse Exchange`
  const canonical = `/auctions/${auction.id}`
  const image = auction.decks?.image_url ?? undefined

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function AuctionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const auctionId = Number(id)
  const resolvedSearchParams = searchParams ? await searchParams : {}

  if (!Number.isFinite(auctionId)) {
    redirect('/auctions')
  }

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

  const auctionResult = await supabase
    .from('auction_listings')
    .select('*, decks!inner(name, commander, image_url, price_total_usd_foil)')
    .eq('id', auctionId)
    .maybeSingle()

  if (!auctionResult.data) {
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
            <h1 className="text-3xl font-semibold text-red-300">Auction not found</h1>
            <p className="mt-3 text-zinc-300">
              {isAuctionSchemaMissing(auctionResult.error?.message)
                ? 'Run docs/sql/auction-foundation.sql in Supabase to enable auctions.'
                : auctionResult.error?.message ?? 'This auction does not exist.'}
            </p>
          </div>
        </section>
      </main>
    )
  }

  const auction = auctionResult.data as AuctionListing
  const [bidsResult, eventsResult, sellerSummaryResult] = await Promise.all([
    supabase
      .from('auction_bids')
      .select('*')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false }),
    supabase
      .from('auction_events')
      .select('*')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('profile_reputation_summary')
      .select('*')
      .eq('user_id', auction.seller_user_id)
      .maybeSingle(),
  ])

  const bids = (bidsResult.data ?? []) as AuctionBid[]
  const events = (eventsResult.data ?? []) as AuctionEvent[]
  const sellerEligibility = getAuctionEligibility((sellerSummaryResult.data ?? null) as ReputationSummary | null)
  const reserveMet = isAuctionReserveMet(auction.auction_type, auction.reserve_price_usd, auction.current_bid_usd)
  const ended = isAuctionEnded(auction.ends_at)
  const isSeller = user?.id === auction.seller_user_id
  const isWinningBidder = user?.id === auction.current_high_bidder_user_id || user?.id === auction.winner_user_id
  const canBid = !!user && !isSeller && auction.status === 'active' && !ended
  const canReviewClose = !!user && (isSeller || access.isAdmin) && auction.status === 'active' && ended
  const canRequestPayment = !!user && (isSeller || access.isAdmin) && auction.status === 'pending_confirmation'
  const canMarkPaid = !!user && (isSeller || access.isAdmin) && auction.status === 'awaiting_payment'
  const canMarkShipped = !!user && isSeller && auction.status === 'paid'
  const canConfirmDelivered = !!user && (isWinningBidder || access.isAdmin) && auction.status === 'shipped'
  const canReleasePayout = !!user && (isSeller || access.isAdmin) && auction.status === 'delivered'

  async function placeBidAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    const amountUsd = Number(formData.get('amount_usd'))
    const auctionResult = await supabase
      .from('auction_listings')
      .select('*')
      .eq('id', auctionId)
      .single()

    if (auctionResult.error || !auctionResult.data) {
      redirect(`/auctions/${auctionId}?error=1`)
    }

    const auction = auctionResult.data as AuctionListing

    if (auction.seller_user_id === user.id || auction.status !== 'active' || isAuctionEnded(auction.ends_at)) {
      redirect(`/auctions/${auctionId}?closed=1`)
    }

    const nextMinimumBid = auctionNextMinimumBid(auction.current_bid_usd, auction.starting_bid_usd)
    if (!Number.isFinite(amountUsd) || amountUsd < nextMinimumBid) {
      redirect(`/auctions/${auctionId}?minBid=${nextMinimumBid}`)
    }

    const previousHighBidderId = auction.current_high_bidder_user_id ?? null
    const updatedEndsAt = shouldExtendAuction(auction.ends_at) ? extendedAuctionEndAt(auction.ends_at) : auction.ends_at
    const reserveMet = isAuctionReserveMet(auction.auction_type, auction.reserve_price_usd, amountUsd)

    const bidInsert = await supabase.from('auction_bids').insert({
      auction_id: auctionId,
      bidder_user_id: user.id,
      amount_usd: amountUsd,
    })

    if (bidInsert.error) {
      redirect(`/auctions/${auctionId}?error=1`)
    }

    const listingUpdate = await supabase
      .from('auction_listings')
      .update({
        current_bid_usd: amountUsd,
        current_high_bidder_user_id: user.id,
        reserve_met: reserveMet,
        bid_count: Number(auction.bid_count ?? 0) + 1,
        extension_count:
          updatedEndsAt !== auction.ends_at
            ? Number(auction.extension_count ?? 0) + 1
            : Number(auction.extension_count ?? 0),
        ends_at: updatedEndsAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auctionId)

    if (listingUpdate.error) {
      redirect(`/auctions/${auctionId}?error=1`)
    }

    await supabase.from('auction_events').insert({
      auction_id: auctionId,
      actor_user_id: user.id,
      event_type: updatedEndsAt !== auction.ends_at ? 'late_bid_extended' : 'bid_placed',
      event_data: {
        amountUsd,
        previousHighBidderId,
        extendedTo: updatedEndsAt !== auction.ends_at ? updatedEndsAt : null,
      },
    })

    await createNotification(supabase, {
      userId: auction.seller_user_id,
      actorUserId: user.id,
      type: 'auction_bid_received',
      title: 'New auction bid received',
      body: `A new bid of ${formatUsd(amountUsd)} was placed on your auction.`,
      href: `/auctions/${auctionId}`,
      metadata: { auctionId, amountUsd },
    })

    if (previousHighBidderId && previousHighBidderId !== user.id) {
      await createNotification(supabase, {
        userId: previousHighBidderId,
        actorUserId: user.id,
        type: 'auction_outbid',
        title: 'You were outbid',
        body: 'Another bidder has moved past your offer on this deck.',
        href: `/auctions/${auctionId}`,
        metadata: { auctionId, amountUsd },
      })
    }

    redirect(`/auctions/${auctionId}?bid=1`)
  }

  async function reviewCloseAction() {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/sign-in')

    const auctionResult = await supabase
      .from('auction_listings')
      .select('*')
      .eq('id', auctionId)
      .single()

    if (auctionResult.error || !auctionResult.data) {
      redirect(`/auctions/${auctionId}?error=1`)
    }

    const auction = auctionResult.data as AuctionListing
    const access = await getAdminAccessForUser(user)
    if (!(user.id === auction.seller_user_id || access.isAdmin)) {
      redirect(`/auctions/${auctionId}`)
    }

    if (auction.status !== 'active' || !isAuctionEnded(auction.ends_at)) {
      redirect(`/auctions/${auctionId}`)
    }

    if (!auction.current_high_bidder_user_id || !isAuctionReserveMet(auction.auction_type, auction.reserve_price_usd, auction.current_bid_usd)) {
      await supabase
        .from('auction_listings')
        .update({
          status: 'expired',
          manual_reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', auctionId)

      await supabase.from('auction_events').insert({
        auction_id: auctionId,
        actor_user_id: user.id,
        event_type: 'auction_expired',
        event_data: {
          reason: auction.current_high_bidder_user_id ? 'reserve_not_met' : 'no_bids',
        },
      })

      redirect(`/auctions/${auctionId}?expired=1`)
    }

    await supabase
      .from('auction_listings')
      .update({
        status: 'pending_confirmation',
        winner_user_id: auction.current_high_bidder_user_id,
        final_bid_usd: auction.current_bid_usd,
        manual_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', auctionId)

    await supabase.from('auction_events').insert({
      auction_id: auctionId,
      actor_user_id: user.id,
      event_type: 'winner_confirmed_pending_payment',
      event_data: {
        winnerUserId: auction.current_high_bidder_user_id,
        finalBidUsd: auction.current_bid_usd,
      },
    })

    await createNotification(supabase, {
      userId: auction.current_high_bidder_user_id,
      actorUserId: user.id,
      type: 'auction_winner_reviewed',
      title: 'Your auction win is under review',
      body: 'The seller or admin has confirmed the close and can now request payment.',
      href: `/auctions/${auctionId}`,
      metadata: { auctionId },
    })

    redirect(`/auctions/${auctionId}?reviewed=1`)
  }

  async function requestPaymentAction() {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')

    const access = await getAdminAccessForUser(user)
    const auctionResult = await supabase.from('auction_listings').select('*').eq('id', auctionId).single()
    if (auctionResult.error || !auctionResult.data) redirect(`/auctions/${auctionId}?error=1`)
    const auction = auctionResult.data as AuctionListing
    if (!(user.id === auction.seller_user_id || access.isAdmin) || auction.status !== 'pending_confirmation') {
      redirect(`/auctions/${auctionId}`)
    }

    await supabase
      .from('auction_listings')
      .update({
        status: 'awaiting_payment',
        payment_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', auctionId)

    await supabase.from('auction_events').insert({
      auction_id: auctionId,
      actor_user_id: user.id,
      event_type: 'payment_requested',
      event_data: { winnerUserId: auction.winner_user_id },
    })

    if (auction.winner_user_id) {
      await createNotification(supabase, {
        userId: auction.winner_user_id,
        actorUserId: user.id,
        type: 'auction_payment_requested',
        title: 'Auction payment requested',
        body: 'Your winning bid is ready for manual payment coordination.',
        href: `/auctions/${auctionId}`,
        metadata: { auctionId },
      })
    }

    redirect(`/auctions/${auctionId}?paymentRequested=1`)
  }

  async function markPaidAction() {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')

    const access = await getAdminAccessForUser(user)
    const auctionResult = await supabase.from('auction_listings').select('*').eq('id', auctionId).single()
    if (auctionResult.error || !auctionResult.data) redirect(`/auctions/${auctionId}?error=1`)
    const auction = auctionResult.data as AuctionListing
    if (!(user.id === auction.seller_user_id || access.isAdmin) || auction.status !== 'awaiting_payment') {
      redirect(`/auctions/${auctionId}`)
    }

    await supabase
      .from('auction_listings')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', auctionId)

    await supabase.from('auction_events').insert({
      auction_id: auctionId,
      actor_user_id: user.id,
      event_type: 'payment_marked_received',
      event_data: { winnerUserId: auction.winner_user_id },
    })

    redirect(`/auctions/${auctionId}?paid=1`)
  }

  async function markShippedAction() {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')

    const auctionResult = await supabase.from('auction_listings').select('*').eq('id', auctionId).single()
    if (auctionResult.error || !auctionResult.data) redirect(`/auctions/${auctionId}?error=1`)
    const auction = auctionResult.data as AuctionListing
    if (user.id !== auction.seller_user_id || auction.status !== 'paid') {
      redirect(`/auctions/${auctionId}`)
    }

    await supabase
      .from('auction_listings')
      .update({
        status: 'shipped',
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', auctionId)

    await supabase.from('auction_events').insert({
      auction_id: auctionId,
      actor_user_id: user.id,
      event_type: 'seller_marked_shipped',
      event_data: { winnerUserId: auction.winner_user_id },
    })

    if (auction.winner_user_id) {
      await createNotification(supabase, {
        userId: auction.winner_user_id,
        actorUserId: user.id,
        type: 'auction_order_shipped',
        title: 'Your auction win has shipped',
        body: 'The seller marked the deck as shipped.',
        href: `/auctions/${auctionId}`,
        metadata: { auctionId },
      })
    }

    redirect(`/auctions/${auctionId}?shipped=1`)
  }

  async function confirmDeliveredAction() {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')

    const access = await getAdminAccessForUser(user)
    const auctionResult = await supabase.from('auction_listings').select('*').eq('id', auctionId).single()
    if (auctionResult.error || !auctionResult.data) redirect(`/auctions/${auctionId}?error=1`)
    const auction = auctionResult.data as AuctionListing
    if (!(user.id === auction.winner_user_id || access.isAdmin) || auction.status !== 'shipped') {
      redirect(`/auctions/${auctionId}`)
    }

    await supabase
      .from('auction_listings')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', auctionId)

    await supabase.from('auction_events').insert({
      auction_id: auctionId,
      actor_user_id: user.id,
      event_type: 'delivery_confirmed',
      event_data: { sellerUserId: auction.seller_user_id },
    })

    await createNotification(supabase, {
      userId: auction.seller_user_id,
      actorUserId: user.id,
      type: 'auction_delivery_confirmed',
      title: 'Delivery confirmed',
      body: 'The winning buyer confirmed delivery. Payout can now be released.',
      href: `/auctions/${auctionId}`,
      metadata: { auctionId },
    })

    redirect(`/auctions/${auctionId}?delivered=1`)
  }

  async function releasePayoutAction() {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')

    const access = await getAdminAccessForUser(user)
    const auctionResult = await supabase.from('auction_listings').select('*').eq('id', auctionId).single()
    if (auctionResult.error || !auctionResult.data) redirect(`/auctions/${auctionId}?error=1`)
    const auction = auctionResult.data as AuctionListing
    if (!(user.id === auction.seller_user_id || access.isAdmin) || auction.status !== 'delivered') {
      redirect(`/auctions/${auctionId}`)
    }

    await supabase
      .from('auction_listings')
      .update({
        status: 'payout_released',
        payout_released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', auctionId)

    await supabase.from('auction_events').insert({
      auction_id: auctionId,
      actor_user_id: user.id,
      event_type: 'seller_payout_released',
      event_data: { sellerUserId: auction.seller_user_id },
    })

    redirect(`/auctions/${auctionId}?payout=1`)
  }

  const bannerMap = {
    launched: resolvedSearchParams.launched === '1' ? 'Auction launched.' : null,
    bid: resolvedSearchParams.bid === '1' ? 'Bid placed successfully.' : null,
    reviewed: resolvedSearchParams.reviewed === '1' ? 'Auction close reviewed.' : null,
    expired: resolvedSearchParams.expired === '1' ? 'Auction closed without a winner.' : null,
    paymentRequested: resolvedSearchParams.paymentRequested === '1' ? 'Payment requested from winning bidder.' : null,
    paid: resolvedSearchParams.paid === '1' ? 'Payment marked as received.' : null,
    shipped: resolvedSearchParams.shipped === '1' ? 'Seller marked the deck as shipped.' : null,
    delivered: resolvedSearchParams.delivered === '1' ? 'Delivery confirmed.' : null,
    payout: resolvedSearchParams.payout === '1' ? 'Seller payout released.' : null,
  }
  const minimumBidQuery = Array.isArray(resolvedSearchParams.minBid)
    ? resolvedSearchParams.minBid[0]
    : resolvedSearchParams.minBid

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
          <div className="flex flex-wrap gap-3">
            <Link href="/auctions" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">
              {'<-'} Back to auctions
            </Link>
            <Link href={`/decks/${auction.deck_id}`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
              View deck
            </Link>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            <div className="flex gap-5 rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="w-full max-w-[13rem] overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                <div className="aspect-[5/7]">
                  {auction.decks?.image_url ? (
                    <img
                      src={auction.decks.image_url}
                      alt={auction.decks.name ?? 'Auction deck'}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-full items-end bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-5">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-amber-300/80">Auction</div>
                        <div className="mt-2 text-lg font-semibold text-white">{auction.decks?.commander ?? 'Commander not set'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium tracking-wide text-amber-300">
                  {formatAuctionStatus(auction.status)}
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight">{auction.decks?.name ?? 'Auction'}</h1>
                <p className="mt-2 text-zinc-400">{auction.decks?.commander ?? 'Commander not set'}</p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm text-zinc-400">Current bid</div>
                    <div className="mt-2 text-2xl font-semibold text-amber-300">{formatUsd(auction.current_bid_usd)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm text-zinc-400">Auction type</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{formatAuctionType(auction.auction_type)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm text-zinc-400">Bids</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{Number(auction.bid_count ?? 0)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm text-zinc-400">Ends</div>
                    <div className="mt-2 text-lg font-semibold text-white">{formatAuctionTimestamp(auction.ends_at)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {Object.values(bannerMap)
                .filter(Boolean)
                .map((message) => (
                  <div key={message} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                    {message}
                  </div>
                ))}
              {minimumBidQuery && (
                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                  Your bid needs to be at least {formatUsd(Number(minimumBidQuery))}.
                </div>
              )}

              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold">Auction State</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Reserve</div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {auction.auction_type === 'no_reserve'
                        ? 'No reserve'
                        : reserveMet
                        ? 'Reserve met'
                        : `Reserve ${formatUsd(auction.reserve_price_usd)}`}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Extensions</div>
                    <div className="mt-2 text-sm font-medium text-white">{Number(auction.extension_count ?? 0)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Starting bid</div>
                    <div className="mt-2 text-sm font-medium text-white">{formatUsd(auction.starting_bid_usd)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Seller eligibility</div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {sellerEligibility.eligible ? 'Trust gate met' : 'Would not pass current trust gate'}
                    </div>
                  </div>
                </div>
              </div>

              {canBid && (
                <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6">
                  <h2 className="text-2xl font-semibold">Place a bid</h2>
                  <p className="mt-2 text-sm text-amber-50/80">
                    Late bids extend the timer by 5 minutes. The winning bid still goes through manual confirmation before payment is requested.
                  </p>
                  <form action={placeBidAction} className="mt-5 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm text-zinc-200">Your bid</label>
                      <input
                        name="amount_usd"
                        defaultValue={String(auctionNextMinimumBid(auction.current_bid_usd, auction.starting_bid_usd))}
                        inputMode="decimal"
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white"
                      />
                    </div>
                    <button className="w-full rounded-2xl bg-amber-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">
                      Place bid
                    </button>
                  </form>
                </div>
              )}

              {canReviewClose && (
                <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                  <h2 className="text-2xl font-semibold">Manual close review</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Review the finished bidding period and either confirm the winner into the payment stage or let the auction expire cleanly.
                  </p>
                  <form action={reviewCloseAction} className="mt-5">
                    <button className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">
                      Review close outcome
                    </button>
                  </form>
                </div>
              )}

              {canRequestPayment && <form action={requestPaymentAction}><button className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">Request winner payment</button></form>}
              {canMarkPaid && <form action={markPaidAction}><button className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10">Mark payment received</button></form>}
              {canMarkShipped && <form action={markShippedAction}><button className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10">Mark order shipped</button></form>}
              {canConfirmDelivered && <form action={confirmDeliveredAction}><button className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10">Confirm delivery</button></form>}
              {canReleasePayout && <form action={releasePayoutAction}><button className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">Release seller payout</button></form>}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Bid history</h2>
            <div className="mt-5 space-y-3">
              {bids.length > 0 ? (
                bids.map((bid) => (
                  <div key={bid.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-zinc-300">
                        Bidder {bid.bidder_user_id === user?.id ? 'You' : bid.bidder_user_id.slice(0, 8)}
                      </div>
                      <div className="text-sm font-medium text-amber-300">{formatUsd(bid.amount_usd)}</div>
                    </div>
                    <div className="mt-2 text-xs text-zinc-500">{formatAuctionTimestamp(bid.created_at)}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-zinc-400">
                  No bids yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Activity timeline</h2>
            <div className="mt-5 space-y-3">
              {events.length > 0 ? (
                events.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <div className="text-sm font-medium text-white">{formatEventLabel(event.event_type)}</div>
                    <div className="mt-2 text-xs text-zinc-500">{formatAuctionTimestamp(event.created_at)}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-zinc-400">
                  Auction events will appear here as the listing moves through bidding and fulfillment.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
