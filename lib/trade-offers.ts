export type TradeOfferStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'countered'

export type TradeOfferRow = {
  id: number
  offered_by_user_id: string
  requested_user_id: string
  offered_deck_id: number
  requested_deck_id: number
  cash_equalization_usd?: number | null
  status: TradeOfferStatus
  message?: string | null
  parent_offer_id?: number | null
  superseded_by_offer_id?: number | null
  accepted_trade_transaction_id?: number | null
  last_action_by_user_id?: string | null
  offered_by_viewed_at?: string | null
  requested_user_viewed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export function isTradeOffersSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.trade_offers'") ||
    message.includes('relation "public.trade_offers"') ||
    message.includes("Could not find the relation 'public.trade_offers'")
  )
}

export function formatTradeOfferStatus(status: TradeOfferStatus | string | null | undefined) {
  const normalized = (status ?? 'pending').replace(/_/g, ' ')
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function formatTradeOfferTimestamp(value?: string | null) {
  if (!value) return 'Recently'

  return new Date(value).toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function isUnreadTradeOffer(offer: TradeOfferRow, userId: string) {
  if (offer.offered_by_user_id === userId) {
    return offer.last_action_by_user_id !== userId && !offer.offered_by_viewed_at
  }
  if (offer.requested_user_id === userId) {
    return offer.last_action_by_user_id !== userId && !offer.requested_user_viewed_at
  }
  return false
}
