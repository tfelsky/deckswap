import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import AppHeader from '@/components/app-header'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  auctionNextMinimumBid,
  extendedAuctionEndAt,
  formatAuctionArbitrationIssueType,
  formatAuctionArbitrationStatus,
  formatAuctionSettlementMode,
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
  settlement_mode?: string | null
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
  manual_reviewed_at?: string | null
  winner_acknowledged_at?: string | null
  seller_acknowledged_at?: string | null
  payment_requested_at?: string | null
  paid_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  payout_released_at?: string | null
  buyer_payment_marked_at?: string | null
  seller_fulfillment_marked_at?: string | null
  buyer_received_marked_at?: string | null
  settled_at?: string | null
  dispute_opened_at?: string | null
  dispute_resolved_at?: string | null
  dispute_summary?: string | null
  created_at?: string | null
  updated_at?: string | null
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

type AuctionArbitrationCase = {
  id: number
  auction_id: number
  requested_by_user_id: string
  counterparty_user_id?: string | null
  status: string
  issue_type: string
  requested_action?: string | null
  claimant_statement: string
  respondent_statement?: string | null
  evidence_summary?: string | null
  internal_notes?: string | null
  outcome?: string | null
  last_checkpoint?: string | null
  resolution_deadline_at?: string | null
  resolved_at?: string | null
  created_at?: string | null
  updated_at?: string | null
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

function getSettlementCheckpointLabel(auction: AuctionListing) {
  if (auction.buyer_received_marked_at) return 'Receipt confirmed'
  if (auction.seller_fulfillment_marked_at) return 'Fulfillment confirmed'
  if (auction.buyer_payment_marked_at) return 'Buyer payment confirmed'
  if (auction.winner_acknowledged_at && auction.seller_acknowledged_at) return 'Both sides acknowledged'
  if (auction.winner_acknowledged_at) return 'Winner acknowledged'
  if (auction.seller_acknowledged_at) return 'Seller acknowledged'
  return 'Winner not yet acknowledged'
}

function getReturnQuery(key: string) {
  return `?${key}=1`
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
  const [bidsResult, eventsResult, sellerSummaryResult, arbitrationResult] = await Promise.all([
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
    supabase
      .from('auction_arbitration_cases')
      .select('*')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false }),
  ])

  const bids = (bidsResult.data ?? []) as AuctionBid[]
  const events = (eventsResult.data ?? []) as AuctionEvent[]
  const arbitrationCases = isAuctionSchemaMissing(arbitrationResult.error?.message)
    ? []
    : ((arbitrationResult.data ?? []) as AuctionArbitrationCase[])
  const activeArbitrationCase =
    arbitrationCases.find((item) => item.status === 'open' || item.status === 'in_review') ?? null
  const sellerEligibility = getAuctionEligibility(
    (sellerSummaryResult.data ?? null) as ReputationSummary | null
  )
  const reserveMet = isAuctionReserveMet(
    auction.auction_type,
    auction.reserve_price_usd,
    auction.current_bid_usd
  )
  const ended = isAuctionEnded(auction.ends_at)
  const settlementMode = auction.settlement_mode ?? 'managed'
  const isSeller = user?.id === auction.seller_user_id
  const isWinningBidder =
    user?.id === auction.current_high_bidder_user_id || user?.id === auction.winner_user_id
  const isParticipant = isSeller || isWinningBidder
  const canBid = !!user && !isSeller && auction.status === 'active' && !ended
  const canReviewClose =
    !!user && (isSeller || access.isAdmin) && auction.status === 'active' && ended

  const canRequestPayment =
    settlementMode === 'managed' &&
    !!user &&
    (isSeller || access.isAdmin) &&
    auction.status === 'pending_confirmation'
  const canMarkPaid =
    settlementMode === 'managed' &&
    !!user &&
    (isSeller || access.isAdmin) &&
    auction.status === 'awaiting_payment'
  const canMarkShipped =
    settlementMode === 'managed' && !!user && isSeller && auction.status === 'paid'
  const canConfirmDelivered =
    settlementMode === 'managed' &&
    !!user &&
    (isWinningBidder || access.isAdmin) &&
    auction.status === 'shipped'
  const canReleasePayout =
    settlementMode === 'managed' &&
    !!user &&
    (isSeller || access.isAdmin) &&
    auction.status === 'delivered'

  const canSellerAcknowledgeSettlement =
    settlementMode === 'self_cleared' &&
    !!user &&
    (isSeller || access.isAdmin) &&
    auction.status === 'pending_confirmation' &&
    !auction.seller_acknowledged_at
  const canWinnerAcknowledgeSettlement =
    settlementMode === 'self_cleared' &&
    !!user &&
    (isWinningBidder || access.isAdmin) &&
    auction.status === 'pending_confirmation' &&
    !auction.winner_acknowledged_at
  const canMarkBuyerPayment =
    settlementMode === 'self_cleared' &&
    !!user &&
    (isWinningBidder || access.isAdmin) &&
    auction.status === 'awaiting_settlement' &&
    !auction.buyer_payment_marked_at
  const canMarkSellerFulfillment =
    settlementMode === 'self_cleared' &&
    !!user &&
    (isSeller || access.isAdmin) &&
    auction.status === 'awaiting_settlement' &&
    !auction.seller_fulfillment_marked_at
  const canMarkBuyerReceipt =
    settlementMode === 'self_cleared' &&
    !!user &&
    (isWinningBidder || access.isAdmin) &&
    auction.status === 'awaiting_settlement' &&
    !!auction.seller_fulfillment_marked_at &&
    !auction.buyer_received_marked_at
  const canRequestArbitration =
    settlementMode === 'self_cleared' &&
    !!user &&
    (isParticipant || access.isAdmin) &&
    auction.status !== 'active' &&
    auction.status !== 'completed' &&
    auction.status !== 'cancelled' &&
    !activeArbitrationCase
  const canResolveArbitration =
    settlementMode === 'self_cleared' && !!user && access.isAdmin && !!activeArbitrationCase

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

    if (
      auction.seller_user_id === user.id ||
      auction.status !== 'active' ||
      isAuctionEnded(auction.ends_at)
    ) {
      redirect(`/auctions/${auctionId}?closed=1`)
    }

    const nextMinimumBid = auctionNextMinimumBid(
      auction.current_bid_usd,
      auction.starting_bid_usd
    )
    if (!Number.isFinite(amountUsd) || amountUsd < nextMinimumBid) {
      redirect(`/auctions/${auctionId}?minBid=${nextMinimumBid}`)
    }

    const previousHighBidderId = auction.current_high_bidder_user_id ?? null
    const updatedEndsAt = shouldExtendAuction(auction.ends_at)
      ? extendedAuctionEndAt(auction.ends_at)
      : auction.ends_at
    const reserveMet = isAuctionReserveMet(
      auction.auction_type,
      auction.reserve_price_usd,
      amountUsd
    )

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

    if (
      !auction.current_high_bidder_user_id ||
      !isAuctionReserveMet(
        auction.auction_type,
        auction.reserve_price_usd,
        auction.current_bid_usd
      )
    ) {
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
        settlementMode: auction.settlement_mode ?? 'managed',
      },
    })

    await createNotification(supabase, {
      userId: auction.current_high_bidder_user_id,
      actorUserId: user.id,
      type: 'auction_winner_reviewed',
      title: 'Your auction win is under review',
      body:
        auction.settlement_mode === 'self_cleared'
          ? 'The seller confirmed the close. Next both sides need to acknowledge the self-cleared settlement lane.'
          : 'The seller or admin has confirmed the close and can now request payment.',
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
    if (
      auction.settlement_mode === 'self_cleared' ||
      !(user.id === auction.seller_user_id || access.isAdmin) ||
      auction.status !== 'pending_confirmation'
    ) {
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
    if (
      auction.settlement_mode === 'self_cleared' ||
      !(user.id === auction.seller_user_id || access.isAdmin) ||
      auction.status !== 'awaiting_payment'
    ) {
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
    if (
      auction.settlement_mode === 'self_cleared' ||
      user.id !== auction.seller_user_id ||
      auction.status !== 'paid'
    ) {
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
    if (
      auction.settlement_mode === 'self_cleared' ||
      !(user.id === auction.winner_user_id || access.isAdmin) ||
      auction.status !== 'shipped'
    ) {
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
    if (
      auction.settlement_mode === 'self_cleared' ||
      !(user.id === auction.seller_user_id || access.isAdmin) ||
      auction.status !== 'delivered'
    ) {
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

  async function sellerAcknowledgeSettlementAction() {
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
    if (
      auction.settlement_mode !== 'self_cleared' ||
      !(user.id === auction.seller_user_id || access.isAdmin) ||
      auction.status !== 'pending_confirmation'
    ) {
      redirect(`/auctions/${auctionId}`)
    }

    const now = new Date().toISOString()
    const bothAcknowledged = !!auction.winner_acknowledged_at
    await supabase
      .from('auction_listings')
      .update({
        seller_acknowledged_at: now,
        status: bothAcknowledged ? 'awaiting_settlement' : 'pending_confirmation',
        updated_at: now,
      })
      .eq('id', auctionId)

    await supabase.from('auction_events').insert({
      auction_id: auctionId,
      actor_user_id: user.id,
      event_type: 'seller_acknowledged_self_cleared_settlement',
      event_data: {
        winnerUserId: auction.winner_user_id,
        openedSettlement: bothAcknowledged,
      },
    })

    if (auction.winner_user_id) {
      await createNotification(supabase, {
        userId: auction.winner_user_id,
        actorUserId: user.id,
        type: 'auction_settlement_acknowledged',
        title: 'Seller acknowledged the self-cleared sale',
        body: bothAcknowledged
          ? 'Both sides are now in the self-cleared settlement stage.'
          : 'The seller acknowledged the close. Your acknowledgement will open the settlement stage.',
        href: `/auctions/${auctionId}`,
        metadata: { auctionId },
      })
    }

    redirect(`/auctions/${auctionId}${getReturnQuery('sellerAcknowledged')}`)
  }

  async function winnerAcknowledgeSettlementAction() {
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
    if (
      auction.settlement_mode !== 'self_cleared' ||
      !(user.id === auction.winner_user_id || access.isAdmin) ||
      auction.status !== 'pending_confirmation'
    ) {
      redirect(`/auctions/${auctionId}`)
    }

    const now = new Date().toISOString()
    const bothAcknowledged = !!auction.seller_acknowledged_at
    await supabase
      .from('auction_listings')
      .update({
        winner_acknowledged_at: now,
        status: bothAcknowledged ? 'awaiting_settlement' : 'pending_confirmation',
        updated_at: now,
      })
      .eq('id', auctionId)

    await supabase.from('auction_events').insert({
      auction_id: auctionId,
      actor_user_id: user.id,
      event_type: 'winner_acknowledged_self_cleared_settlement',
      event_data: {
        sellerUserId: auction.seller_user_id,
        openedSettlement: bothAcknowledged,
      },
    })

    await createNotification(supabase, {
      userId: auction.seller_user_id,
      actorUserId: user.id,
      type: 'auction_settlement_acknowledged',
      title: 'Buyer acknowledged the self-cleared sale',
      body: bothAcknowledged
        ? 'Both sides are now in the self-cleared settlement stage.'
        : 'The buyer acknowledged the close. Your acknowledgement will open the settlement stage.',
      href: `/auctions/${auctionId}`,
      metadata: { auctionId },
    })

    redirect(`/auctions/${auctionId}${getReturnQuery('winnerAcknowledged')}`)
  }

  async function markBuyerPaymentAction() {
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
    if (
      auction.settlement_mode !== 'self_cleared' ||
      !(user.id === auction.winner_user_id || access.isAdmin) ||
      auction.status !== 'awaiting_settlement'
    ) {
      redirect(`/auctions/${auctionId}`)
    }

    const now = new Date().toISOString()
    await supabase
      .from('auction_listings')
      .update({
        buyer_payment_marked_at: now,
        updated_at: now,
      })
      .eq('id', auctionId)

    await supabase.from('auction_events').insert({
      auction_id: auctionId,
      actor_user_id: user.id,
      event_type: 'buyer_marked_payment_sent',
      event_data: {
        sellerUserId: auction.seller_user_id,
      },
    })

    await createNotification(supabase, {
      userId: auction.seller_user_id,
      actorUserId: user.id,
      type: 'auction_self_cleared_payment_marked',
      title: 'Buyer marked payment as sent',
      body: 'The winning bidder recorded that payment was sent in the self-cleared lane.',
      href: `/auctions/${auctionId}`,
      metadata: { auctionId },
    })

    redirect(`/auctions/${auctionId}${getReturnQuery('buyerPaid')}`)
  }

  async function markSellerFulfillmentAction() {
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
    if (
      auction.settlement_mode !== 'self_cleared' ||
      !(user.id === auction.seller_user_id || access.isAdmin) ||
      auction.status !== 'awaiting_settlement'
    ) {
      redirect(`/auctions/${auctionId}`)
    }

    const now = new Date().toISOString()
    await supabase
      .from('auction_listings')
      .update({
        seller_fulfillment_marked_at: now,
        updated_at: now,
      })
      .eq('id', auctionId)

    await supabase.from('auction_events').insert({
      auction_id: auctionId,
      actor_user_id: user.id,
      event_type: 'seller_marked_self_cleared_fulfillment',
      event_data: {
        winnerUserId: auction.winner_user_id,
      },
    })

    if (auction.winner_user_id) {
      await createNotification(supabase, {
        userId: auction.winner_user_id,
        actorUserId: user.id,
        type: 'auction_self_cleared_fulfillment_marked',
        title: 'Seller marked fulfillment',
        body: 'The seller recorded that the deck was handed off or shipped.',
        href: `/auctions/${auctionId}`,
        metadata: { auctionId },
      })
    }

    redirect(`/auctions/${auctionId}${getReturnQuery('sellerFulfilled')}`)
  }

  async function markBuyerReceiptAction() {
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
    if (
      auction.settlement_mode !== 'self_cleared' ||
      !(user.id === auction.winner_user_id || access.isAdmin) ||
      auction.status !== 'awaiting_settlement'
    ) {
      redirect(`/auctions/${auctionId}`)
    }

    const now = new Date().toISOString()
    await supabase
      .from('auction_listings')
      .update({
        buyer_received_marked_at: now,
        settled_at: now,
        dispute_resolved_at: auction.dispute_resolved_at ?? now,
        status: 'completed',
        updated_at: now,
      })
      .eq('id', auctionId)

    await supabase.from('auction_events').insert({
      auction_id: auctionId,
      actor_user_id: user.id,
      event_type: 'buyer_confirmed_self_cleared_receipt',
      event_data: {
        sellerUserId: auction.seller_user_id,
      },
    })

    await createNotification(supabase, {
      userId: auction.seller_user_id,
      actorUserId: user.id,
      type: 'auction_self_cleared_completed',
      title: 'Self-cleared auction completed',
      body: 'The buyer confirmed receipt and the auction has been closed as completed.',
      href: `/auctions/${auctionId}`,
      metadata: { auctionId },
    })

    redirect(`/auctions/${auctionId}${getReturnQuery('buyerReceived')}`)
  }

  async function requestArbitrationAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')

    const access = await getAdminAccessForUser(user)
    const issueType = String(formData.get('issue_type') || 'other').trim()
    const claimantStatement = String(formData.get('claimant_statement') || '').trim()
    const requestedAction = String(formData.get('requested_action') || '').trim()
    const evidenceSummary = String(formData.get('evidence_summary') || '').trim()

    if (!claimantStatement) {
      redirect(`/auctions/${auctionId}?arbitrationError=1`)
    }

    const auctionResult = await supabase.from('auction_listings').select('*').eq('id', auctionId).single()
    if (auctionResult.error || !auctionResult.data) redirect(`/auctions/${auctionId}?error=1`)
    const auction = auctionResult.data as AuctionListing

    const isSeller = user.id === auction.seller_user_id
    const isWinner = user.id === auction.winner_user_id
    if (
      auction.settlement_mode !== 'self_cleared' ||
      !(isSeller || isWinner || access.isAdmin) ||
      auction.status === 'completed' ||
      auction.status === 'cancelled'
    ) {
      redirect(`/auctions/${auctionId}`)
    }

    const now = new Date().toISOString()
    const requestedByUserId = access.isAdmin
      ? (auction.winner_user_id ?? auction.seller_user_id)
      : user.id
    const counterpartyUserId =
      requestedByUserId === auction.seller_user_id
        ? auction.winner_user_id ?? null
        : auction.seller_user_id

    const insertResult = await supabase.from('auction_arbitration_cases').insert({
      auction_id: auctionId,
      requested_by_user_id: requestedByUserId,
      counterparty_user_id: counterpartyUserId,
      status: 'open',
      issue_type: issueType,
      requested_action: requestedAction || null,
      claimant_statement: claimantStatement,
      evidence_summary: evidenceSummary || null,
      last_checkpoint: getSettlementCheckpointLabel(auction),
    })

    if (insertResult.error) {
      redirect(`/auctions/${auctionId}?arbitrationError=1`)
    }

    await supabase
      .from('auction_listings')
      .update({
        status: 'under_arbitration',
        dispute_opened_at: now,
        dispute_summary: claimantStatement.slice(0, 500),
        updated_at: now,
      })
      .eq('id', auctionId)

    await supabase.from('auction_events').insert({
      auction_id: auctionId,
      actor_user_id: user.id,
      event_type: 'self_cleared_arbitration_requested',
      event_data: {
        issueType,
        requestedAction: requestedAction || null,
        lastCheckpoint: getSettlementCheckpointLabel(auction),
      },
    })

    if (counterpartyUserId) {
      await createNotification(supabase, {
        userId: counterpartyUserId,
        actorUserId: user.id,
        type: 'auction_arbitration_requested',
        title: 'Auction arbitration requested',
        body: 'The self-cleared auction has been moved into arbitration review.',
        href: `/auctions/${auctionId}`,
        metadata: { auctionId, issueType },
      })
    }

    redirect(`/auctions/${auctionId}${getReturnQuery('arbitrationRequested')}`)
  }

  async function resolveArbitrationAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')

    const access = await getAdminAccessForUser(user)
    if (!access.isAdmin) redirect(`/auctions/${auctionId}`)

    const caseId = Number(formData.get('case_id'))
    const listingOutcome = String(formData.get('listing_outcome') || 'awaiting_settlement')
    const outcome = String(formData.get('outcome') || '').trim()
    const internalNotes = String(formData.get('internal_notes') || '').trim()

    if (!Number.isFinite(caseId) || !outcome) {
      redirect(`/auctions/${auctionId}?resolutionError=1`)
    }

    const [auctionResult, caseResult] = await Promise.all([
      supabase.from('auction_listings').select('*').eq('id', auctionId).single(),
      supabase.from('auction_arbitration_cases').select('*').eq('id', caseId).single(),
    ])

    if (auctionResult.error || !auctionResult.data || caseResult.error || !caseResult.data) {
      redirect(`/auctions/${auctionId}?resolutionError=1`)
    }

    const now = new Date().toISOString()
    const nextStatus =
      listingOutcome === 'completed' || listingOutcome === 'cancelled'
        ? listingOutcome
        : 'awaiting_settlement'

    await supabase
      .from('auction_arbitration_cases')
      .update({
        status: 'resolved',
        outcome,
        internal_notes: internalNotes || null,
        resolved_at: now,
        updated_at: now,
      })
      .eq('id', caseId)

    await supabase
      .from('auction_listings')
      .update({
        status: nextStatus,
        dispute_resolved_at: now,
        settled_at: nextStatus === 'completed' ? now : auctionResult.data.settled_at,
        updated_at: now,
      })
      .eq('id', auctionId)

    await supabase.from('auction_events').insert({
      auction_id: auctionId,
      actor_user_id: user.id,
      event_type: 'self_cleared_arbitration_resolved',
      event_data: {
        caseId,
        nextStatus,
      },
    })

    const auction = auctionResult.data as AuctionListing
    const notifyIds = [auction.seller_user_id, auction.winner_user_id].filter(
      (value): value is string => !!value
    )

    for (const notifyId of notifyIds) {
      await createNotification(supabase, {
        userId: notifyId,
        actorUserId: user.id,
        type: 'auction_arbitration_resolved',
        title: 'Auction arbitration resolved',
        body: `The case was resolved and the auction moved to ${formatAuctionStatus(nextStatus)}.`,
        href: `/auctions/${auctionId}`,
        metadata: { auctionId, caseId, nextStatus },
      })
    }

    redirect(`/auctions/${auctionId}${getReturnQuery('arbitrationResolved')}`)
  }

  const bannerMap = {
    launched: resolvedSearchParams.launched === '1' ? 'Auction launched.' : null,
    bid: resolvedSearchParams.bid === '1' ? 'Bid placed successfully.' : null,
    reviewed: resolvedSearchParams.reviewed === '1' ? 'Auction close reviewed.' : null,
    expired: resolvedSearchParams.expired === '1' ? 'Auction closed without a winner.' : null,
    paymentRequested:
      resolvedSearchParams.paymentRequested === '1'
        ? 'Payment requested from winning bidder.'
        : null,
    paid: resolvedSearchParams.paid === '1' ? 'Payment marked as received.' : null,
    shipped: resolvedSearchParams.shipped === '1' ? 'Seller marked the deck as shipped.' : null,
    delivered: resolvedSearchParams.delivered === '1' ? 'Delivery confirmed.' : null,
    payout: resolvedSearchParams.payout === '1' ? 'Seller payout released.' : null,
    sellerAcknowledged:
      resolvedSearchParams.sellerAcknowledged === '1'
        ? 'Seller acknowledged the self-cleared settlement lane.'
        : null,
    winnerAcknowledged:
      resolvedSearchParams.winnerAcknowledged === '1'
        ? 'Winning bidder acknowledged the self-cleared settlement lane.'
        : null,
    buyerPaid:
      resolvedSearchParams.buyerPaid === '1'
        ? 'Buyer payment checkpoint recorded.'
        : null,
    sellerFulfilled:
      resolvedSearchParams.sellerFulfilled === '1'
        ? 'Seller fulfillment checkpoint recorded.'
        : null,
    buyerReceived:
      resolvedSearchParams.buyerReceived === '1'
        ? 'Buyer receipt checkpoint recorded and the auction was completed.'
        : null,
    arbitrationRequested:
      resolvedSearchParams.arbitrationRequested === '1'
        ? 'Arbitration case opened for this self-cleared auction.'
        : null,
    arbitrationResolved:
      resolvedSearchParams.arbitrationResolved === '1'
        ? 'Arbitration case resolved.'
        : null,
    arbitrationError:
      resolvedSearchParams.arbitrationError === '1'
        ? 'We could not open the arbitration case. Add a short statement and try again.'
        : null,
    resolutionError:
      resolvedSearchParams.resolutionError === '1'
        ? 'We could not save that arbitration resolution.'
        : null,
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
            {access.isAdmin && activeArbitrationCase ? (
              <Link href="/admin/arbitration" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-100 hover:bg-red-500/15">
                Open arbitration queue
              </Link>
            ) : null}
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            <div className="flex gap-5 rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="w-full max-w-[13rem] overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                <div className="aspect-[5/7]">
                  {auction.decks?.image_url ? (
                    <img src={auction.decks.image_url} alt={auction.decks.name ?? 'Auction deck'} className="h-full w-full object-cover object-top" />
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
                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium tracking-wide text-amber-300">
                    {formatAuctionStatus(auction.status)}
                  </div>
                  <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-white">
                    {formatAuctionSettlementMode(settlementMode)}
                  </div>
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
              {Object.values(bannerMap).filter(Boolean).map((message) => (
                <div key={message} className={`rounded-2xl border p-4 text-sm ${String(message).includes('could not') ? 'border-red-500/20 bg-red-500/10 text-red-100' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'}`}>
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
                      {auction.auction_type === 'no_reserve' ? 'No reserve' : reserveMet ? 'Reserve met' : `Reserve ${formatUsd(auction.reserve_price_usd)}`}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Settlement lane</div>
                    <div className="mt-2 text-sm font-medium text-white">{formatAuctionSettlementMode(settlementMode)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Starting bid</div>
                    <div className="mt-2 text-sm font-medium text-white">{formatUsd(auction.starting_bid_usd)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Seller eligibility</div>
                    <div className="mt-2 text-sm font-medium text-white">{sellerEligibility.eligible ? 'Trust gate met' : 'Would not pass current trust gate'}</div>
                  </div>
                </div>
              </div>

              {canBid ? (
                <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6">
                  <h2 className="text-2xl font-semibold">Place a bid</h2>
                  <p className="mt-2 text-sm text-amber-50/80">
                    Late bids extend the timer by 5 minutes. The winning bid still goes through manual confirmation before the settlement lane opens.
                  </p>
                  <form action={placeBidAction} className="mt-5 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm text-zinc-200">Your bid</label>
                      <input name="amount_usd" defaultValue={String(auctionNextMinimumBid(auction.current_bid_usd, auction.starting_bid_usd))} inputMode="decimal" className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white" />
                    </div>
                    <button className="w-full rounded-2xl bg-amber-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">Place bid</button>
                  </form>
                </div>
              ) : null}

              {canReviewClose ? (
                <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                  <h2 className="text-2xl font-semibold">Manual close review</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Review the finished bidding period and either confirm the winner into the next settlement stage or let the auction expire cleanly.
                  </p>
                  <form action={reviewCloseAction} className="mt-5">
                    <button className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">Review close outcome</button>
                  </form>
                </div>
              ) : null}

              {canRequestPayment ? <form action={requestPaymentAction}><button className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">Request winner payment</button></form> : null}
              {canMarkPaid ? <form action={markPaidAction}><button className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10">Mark payment received</button></form> : null}
              {canMarkShipped ? <form action={markShippedAction}><button className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10">Mark order shipped</button></form> : null}
              {canConfirmDelivered ? <form action={confirmDeliveredAction}><button className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10">Confirm delivery</button></form> : null}
              {canReleasePayout ? <form action={releasePayoutAction}><button className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">Release seller payout</button></form> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {settlementMode === 'self_cleared' ? (
          <div className="mb-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <h2 className="text-2xl font-semibold text-red-50">Self-cleared settlement</h2>
                <p className="mt-2 text-sm text-red-50/85">This auction closes directly between seller and buyer. DeckSwap records acknowledgements, milestones, and arbitration, but funds and inventory do not route through us.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-red-50/90">Last checkpoint: {getSettlementCheckpointLabel(auction)}</div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wide text-red-100/70">1. Acknowledgement</div>
                <div className="mt-2 text-sm text-white">Seller: {auction.seller_acknowledged_at ? formatAuctionTimestamp(auction.seller_acknowledged_at) : 'Pending'}</div>
                <div className="mt-1 text-sm text-white">Buyer: {auction.winner_acknowledged_at ? formatAuctionTimestamp(auction.winner_acknowledged_at) : 'Pending'}</div>
                <div className="mt-4 space-y-3">
                  {canSellerAcknowledgeSettlement ? <form action={sellerAcknowledgeSettlementAction}><button className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">Seller acknowledge lane</button></form> : null}
                  {canWinnerAcknowledgeSettlement ? <form action={winnerAcknowledgeSettlementAction}><button className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">Buyer acknowledge lane</button></form> : null}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wide text-red-100/70">2. Settlement</div>
                <div className="mt-2 text-sm text-white">Buyer payment: {auction.buyer_payment_marked_at ? formatAuctionTimestamp(auction.buyer_payment_marked_at) : 'Pending'}</div>
                <div className="mt-1 text-sm text-white">Seller fulfillment: {auction.seller_fulfillment_marked_at ? formatAuctionTimestamp(auction.seller_fulfillment_marked_at) : 'Pending'}</div>
                <div className="mt-4 space-y-3">
                  {canMarkBuyerPayment ? <form action={markBuyerPaymentAction}><button className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15">Mark buyer payment sent</button></form> : null}
                  {canMarkSellerFulfillment ? <form action={markSellerFulfillmentAction}><button className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15">Mark seller fulfillment</button></form> : null}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wide text-red-100/70">3. Close Or Escalate</div>
                <div className="mt-2 text-sm text-white">Buyer receipt: {auction.buyer_received_marked_at ? formatAuctionTimestamp(auction.buyer_received_marked_at) : 'Pending'}</div>
                <div className="mt-1 text-sm text-white">Arbitration: {activeArbitrationCase ? formatAuctionArbitrationStatus(activeArbitrationCase.status) : 'Not open'}</div>
                <div className="mt-4 space-y-3">
                  {canMarkBuyerReceipt ? <form action={markBuyerReceiptAction}><button className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">Buyer confirm receipt</button></form> : null}
                  {canRequestArbitration ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-medium text-white">Open arbitration</div>
                      <form action={requestArbitrationAction} className="mt-4 space-y-3">
                        <select name="issue_type" defaultValue="other" className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white">
                          <option value="non_payment">Non-payment</option>
                          <option value="non_delivery">Non-delivery</option>
                          <option value="item_not_as_described">Item not as described</option>
                          <option value="damaged">Damaged</option>
                          <option value="communication_breakdown">Communication breakdown</option>
                          <option value="other">Other</option>
                        </select>
                        <input name="requested_action" placeholder="Requested outcome or next step" className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white" />
                        <textarea name="claimant_statement" rows={4} placeholder="Describe what happened, the last agreed checkpoint, and why you need DeckSwap to arbitrate." className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white" />
                        <textarea name="evidence_summary" rows={3} placeholder="Optional: payment rail, tracking proof, screenshots, or inspection notes." className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white" />
                        <button className="w-full rounded-2xl border border-red-300/30 bg-red-400/20 px-4 py-3 text-sm font-medium text-white hover:bg-red-400/25">Open arbitration case</button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Bid history</h2>
              <div className="mt-5 space-y-3">
                {bids.length > 0 ? bids.map((bid) => (
                  <div key={bid.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-zinc-300">Bidder {bid.bidder_user_id === user?.id ? 'You' : bid.bidder_user_id.slice(0, 8)}</div>
                      <div className="text-sm font-medium text-amber-300">{formatUsd(bid.amount_usd)}</div>
                    </div>
                    <div className="mt-2 text-xs text-zinc-500">{formatAuctionTimestamp(bid.created_at)}</div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-zinc-400">No bids yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Activity timeline</h2>
              <div className="mt-5 space-y-3">
                {events.length > 0 ? events.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <div className="text-sm font-medium text-white">{formatEventLabel(event.event_type)}</div>
                    <div className="mt-2 text-xs text-zinc-500">{formatAuctionTimestamp(event.created_at)}</div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-zinc-400">Auction events will appear here as the listing moves through bidding and fulfillment.</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Arbitration timeline</h2>
              <p className="mt-2 text-sm text-zinc-400">Open only for self-cleared auctions. Cases capture the last checkpoint, claimant statement, and final admin outcome.</p>
              <div className="mt-5 space-y-3">
                {arbitrationCases.length > 0 ? arbitrationCases.map((caseItem) => (
                  <div key={caseItem.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-100">{formatAuctionArbitrationStatus(caseItem.status)}</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-200">{formatAuctionArbitrationIssueType(caseItem.issue_type)}</span>
                    </div>
                    <div className="mt-3 text-sm text-white">{caseItem.claimant_statement}</div>
                    {caseItem.evidence_summary?.trim() ? <div className="mt-3 text-xs text-zinc-400">Evidence: {caseItem.evidence_summary}</div> : null}
                    {caseItem.outcome?.trim() ? <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-3 text-sm text-emerald-100">Outcome: {caseItem.outcome}</div> : null}
                    <div className="mt-3 text-xs text-zinc-500">Opened {formatAuctionTimestamp(caseItem.created_at)}{caseItem.last_checkpoint ? ` · Last checkpoint ${caseItem.last_checkpoint}` : ''}</div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-zinc-400">No arbitration cases recorded for this auction.</div>
                )}
              </div>
            </div>

            {canResolveArbitration && activeArbitrationCase ? (
              <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
                <h2 className="text-2xl font-semibold text-red-50">Admin arbitration resolution</h2>
                <p className="mt-2 text-sm text-red-50/80">Close the case with a documented outcome and decide whether the auction returns to settlement, completes, or cancels.</p>
                <form action={resolveArbitrationAction} className="mt-5 space-y-4">
                  <input type="hidden" name="case_id" value={activeArbitrationCase.id} />
                  <select name="listing_outcome" defaultValue="awaiting_settlement" className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white">
                    <option value="awaiting_settlement">Return to awaiting settlement</option>
                    <option value="completed">Close as completed</option>
                    <option value="cancelled">Close as cancelled</option>
                  </select>
                  <textarea name="outcome" rows={3} placeholder="Summarize the ruling, who is expected to act next, and what evidence drove the decision." className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white" />
                  <textarea name="internal_notes" rows={3} placeholder="Optional internal notes for future trust or policy review." className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white" />
                  <button className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">Resolve arbitration case</button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  )
}
