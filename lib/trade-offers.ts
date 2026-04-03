export type TradeOfferStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'

export type TradeOfferRow = {
  id: number
  offered_by_user_id: string
  requested_user_id: string
  offered_deck_id: number
  requested_deck_id: number
  cash_equalization_usd?: number | null
  status: TradeOfferStatus
  message?: string | null
  accepted_trade_transaction_id?: number | null
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
