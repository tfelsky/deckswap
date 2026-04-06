import type { ReputationSummary } from '@/lib/profiles'

export type AuctionStatus =
  | 'active'
  | 'pending_confirmation'
  | 'awaiting_payment'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'payout_released'
  | 'awaiting_settlement'
  | 'under_arbitration'
  | 'completed'
  | 'cancelled'
  | 'expired'

export type AuctionType = 'reserve' | 'no_reserve'
export type AuctionSettlementMode = 'managed' | 'self_cleared'
export type AuctionArbitrationStatus = 'open' | 'in_review' | 'resolved' | 'closed'
export type AuctionArbitrationIssueType =
  | 'non_payment'
  | 'non_delivery'
  | 'item_not_as_described'
  | 'damaged'
  | 'communication_breakdown'
  | 'other'

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
    message.includes("relation 'public.auction_arbitration_cases'") ||
    message.includes('relation "public.auction_arbitration_cases"') ||
    message.includes("Could not find the relation 'public.auction_listings'") ||
    message.includes("Could not find the relation 'public.auction_bids'") ||
    message.includes("Could not find the relation 'public.auction_events'") ||
    message.includes("Could not find the relation 'public.auction_arbitration_cases'") ||
    message.includes("Could not find the 'settlement_mode' column of 'auction_listings'") ||
    message.includes("Could not find the 'winner_acknowledged_at' column of 'auction_listings'") ||
    message.includes("Could not find the 'seller_acknowledged_at' column of 'auction_listings'") ||
    message.includes("Could not find the 'buyer_payment_marked_at' column of 'auction_listings'") ||
    message.includes("Could not find the 'seller_fulfillment_marked_at' column of 'auction_listings'") ||
    message.includes("Could not find the 'buyer_received_marked_at' column of 'auction_listings'") ||
    message.includes("Could not find the 'settled_at' column of 'auction_listings'") ||
    message.includes("Could not find the 'dispute_opened_at' column of 'auction_listings'") ||
    message.includes("Could not find the 'dispute_resolved_at' column of 'auction_listings'") ||
    message.includes("Could not find the 'dispute_summary' column of 'auction_listings'")
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
    case 'awaiting_settlement':
      return 'Awaiting Settlement'
    case 'under_arbitration':
      return 'Under Arbitration'
    case 'completed':
      return 'Completed'
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

export function formatAuctionSettlementMode(mode?: string | null) {
  return mode === 'self_cleared' ? 'Self-Cleared' : 'Managed'
}

export function formatAuctionArbitrationStatus(status?: string | null) {
  switch (status) {
    case 'in_review':
      return 'In Review'
    case 'resolved':
      return 'Resolved'
    case 'closed':
      return 'Closed'
    default:
      return 'Open'
  }
}

export function formatAuctionArbitrationIssueType(issueType?: string | null) {
  switch (issueType) {
    case 'non_payment':
      return 'Non-payment'
    case 'non_delivery':
      return 'Non-delivery'
    case 'item_not_as_described':
      return 'Item Not As Described'
    case 'damaged':
      return 'Damaged In Transit'
    case 'communication_breakdown':
      return 'Communication Breakdown'
    default:
      return 'Other'
  }
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
