import type { ReputationSummary } from '@/lib/profiles'

export type AuctionStatus =
  | 'active'
  | 'pending_confirmation'
  | 'awaiting_payment'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'payout_released'
  | 'cancelled'
  | 'expired'

export type AuctionType = 'reserve' | 'no_reserve'

export const AUCTION_EXTENSION_WINDOW_MINUTES = 5
export const AUCTION_EXTENSION_MINUTES = 5

export function isAuctionSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.auction_listings'") ||
    message.includes('relation "public.auction_listings"') ||
    message.includes("relation 'public.auction_bids'") ||
    message.includes('relation "public.auction_bids"') ||
    message.includes("relation 'public.auction_events'") ||
    message.includes('relation "public.auction_events"') ||
    message.includes("Could not find the relation 'public.auction_listings'") ||
    message.includes("Could not find the relation 'public.auction_bids'") ||
    message.includes("Could not find the relation 'public.auction_events'")
  )
}

export function formatAuctionStatus(status?: string | null) {
  switch (status) {
    case 'active':
      return 'Live'
    case 'pending_confirmation':
      return 'Pending Confirmation'
    case 'awaiting_payment':
      return 'Awaiting Payment'
    case 'paid':
      return 'Paid'
    case 'shipped':
      return 'Shipped'
    case 'delivered':
      return 'Delivered'
    case 'payout_released':
      return 'Payout Released'
    case 'cancelled':
      return 'Cancelled'
    case 'expired':
      return 'Expired'
    default:
      return 'Unknown'
  }
}

export function formatAuctionType(type?: string | null) {
  return type === 'no_reserve' ? 'No Reserve' : 'Reserve'
}

export function formatAuctionTimestamp(value?: string | null) {
  if (!value) return 'Not set'

  return new Date(value).toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function auctionMinimumIncrement(currentBidUsd?: number | null) {
  const bid = Number(currentBidUsd ?? 0)
  if (bid < 50) return 5
  if (bid < 200) return 10
  if (bid < 500) return 15
  return 25
}

export function auctionNextMinimumBid(currentBidUsd?: number | null, startingBidUsd?: number | null) {
  const current = Number(currentBidUsd ?? 0)
  const starting = Math.max(1, Number(startingBidUsd ?? 1))

  if (current <= 0) {
    return starting
  }

  return current + auctionMinimumIncrement(current)
}

export function isAuctionReserveMet(
  auctionType?: string | null,
  reservePriceUsd?: number | null,
  currentBidUsd?: number | null
) {
  if (auctionType === 'no_reserve') return true
  return Number(currentBidUsd ?? 0) >= Number(reservePriceUsd ?? 0)
}

export function shouldExtendAuction(endAt?: string | null, now = new Date()) {
  if (!endAt) return false
  const end = new Date(endAt)
  const diffMs = end.getTime() - now.getTime()
  return diffMs > 0 && diffMs <= AUCTION_EXTENSION_WINDOW_MINUTES * 60 * 1000
}

export function extendedAuctionEndAt(endAt?: string | null, now = new Date()) {
  const base = endAt ? new Date(endAt) : now
  return new Date(base.getTime() + AUCTION_EXTENSION_MINUTES * 60 * 1000).toISOString()
}

export function getAuctionEligibility(summary?: Partial<ReputationSummary> | null) {
  const internalScore = Number(summary?.internal_validation_score ?? 0)
  const bannedStatus = summary?.banned_status ?? 'active'
  const completedTrades = Number(summary?.completed_trades_count ?? 0)
  const manuallyVerified = !!summary?.is_manually_verified
  const knownUser = !!summary?.is_known_user

  if (bannedStatus === 'restricted' || bannedStatus === 'banned') {
    return {
      eligible: false,
      reason: 'This account is currently restricted from seller-side auction activity.',
    }
  }

  if (manuallyVerified || knownUser || completedTrades >= 3 || internalScore >= 70) {
    return {
      eligible: true,
      reason: 'Seller trust threshold met for auction launch.',
    }
  }

  return {
    eligible: false,
    reason:
      'Auctions currently require a stronger trust record, such as manual verification, known-user status, at least 3 completed trades, or an internal validation score of 70+.',
  }
}
