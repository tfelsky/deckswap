export type SinglesOrderStatus =
  | 'awaiting_shipment'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'

export type SinglesOrderRow = {
  id: number
  buyer_user_id: string
  seller_user_id: string
  status: SinglesOrderStatus
  currency?: string | null
  item_subtotal_usd?: number | null
  discount_tier_key?: string | null
  discount_tier_label?: string | null
  discount_amount_usd?: number | null
  discounted_subtotal_usd?: number | null
  shipping_amount_usd?: number | null
  tax_amount_usd?: number | null
  grand_total_usd?: number | null
  item_count?: number | null
  pricing_snapshot?: Record<string, unknown> | null
  cart_snapshot?: unknown[] | null
  checkout_confirmed_at?: string | null
  payment_confirmed_at?: string | null
  tracking_code?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  completed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type SinglesOrderItemRow = {
  id: number
  order_id: number
  single_inventory_item_id: number
  seller_user_id: string
  quantity: number
  unit_price_usd: number
  line_subtotal_usd: number
  card_name: string
  set_name?: string | null
  set_code?: string | null
  collector_number?: string | null
  foil?: boolean | null
  condition?: string | null
  language?: string | null
  image_url?: string | null
  pricing_snapshot?: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
}

export function isSinglesOrdersSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.singles_orders'") ||
    message.includes('relation "public.singles_orders"') ||
    message.includes("relation 'public.singles_order_items'") ||
    message.includes('relation "public.singles_order_items"') ||
    message.includes("Could not find the relation 'public.singles_orders'") ||
    message.includes("Could not find the relation 'public.singles_order_items'") ||
    message.includes("Could not find the function public.create_singles_checkout") ||
    message.includes('function public.create_singles_checkout')
  )
}

export function formatSinglesOrderStatus(status?: string | null) {
  const normalized = String(status ?? 'awaiting_shipment').replace(/_/g, ' ')
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function formatSinglesTimelineTimestamp(value?: string | null) {
  if (!value) return 'Not recorded'

  return new Date(value).toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
