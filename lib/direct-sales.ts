export type DirectSaleOrderType = 'buy_now' | 'guaranteed_offer'

export type DirectSaleOrderStatus =
  | 'checkout_open'
  | 'awaiting_shipment'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'

export type DirectSaleOrderRow = {
  id: number
  deck_id: number
  seller_user_id: string
  buyer_user_id?: string | null
  order_type: DirectSaleOrderType
  status: DirectSaleOrderStatus
  price_usd: number
  currency?: string | null
  shipping_label_addon_usd?: number | null
  label_box_requested?: boolean | null
  notes?: string | null
  checkout_confirmed_at?: string | null
  payment_confirmed_at?: string | null
  tracking_code?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export const DIRECT_SALE_BOX_KIT_PRICE = 20

export function isDirectSalesSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.direct_sale_orders'") ||
    message.includes('relation "public.direct_sale_orders"') ||
    message.includes("Could not find the relation 'public.direct_sale_orders'") ||
    message.includes("Could not find the 'shipping_label_addon_usd' column of 'direct_sale_orders'") ||
    message.includes("Could not find the 'label_box_requested' column of 'direct_sale_orders'") ||
    message.includes("Could not find the 'checkout_confirmed_at' column of 'direct_sale_orders'") ||
    message.includes("Could not find the 'payment_confirmed_at' column of 'direct_sale_orders'") ||
    message.includes("Could not find the 'tracking_code' column of 'direct_sale_orders'") ||
    message.includes("Could not find the 'shipped_at' column of 'direct_sale_orders'") ||
    message.includes("Could not find the 'delivered_at' column of 'direct_sale_orders'")
  )
}

export function formatDirectSaleOrderType(type?: string | null) {
  return type === 'guaranteed_offer' ? 'Guaranteed Offer' : 'Buy It Now'
}

export function formatDirectSaleOrderStatus(status?: string | null) {
  const normalized = (status ?? 'checkout_open').replace(/_/g, ' ')
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function isDirectSaleOrderActive(status?: string | null) {
  return (
    status === 'checkout_open' ||
    status === 'awaiting_shipment' ||
    status === 'shipped' ||
    status === 'delivered'
  )
}
