// Queue My Order: the buyer pays for singles now and the seller holds them in a
// "mail slot" instead of shipping. Every later queued order from the same seller
// drops into the same slot, and the whole slot ships once — one envelope, one
// combined shipping charge — when the buyer releases it or the paid-up hold ends.
//
// The buyer rents the slot from the seller in whole weeks. These numbers are
// mirrored in supabase/migrations/20260910120000_singles_mail_slots.sql, which is
// the source of truth: the checkout and slot RPCs re-derive every charge, so the
// helpers here drive quotes and display only.

import {
  resolveSinglesShipping,
  roundUsd,
  type SinglesPricingBreakdown,
} from '@/lib/singles/pricing'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

export const MAIL_SLOT = {
  rentPerWeekUsd: 1,
  /**
   * Longest a slot can be held, counted from when it opened. 13 weeks keeps the
   * shipment well inside the ~120-day card-network chargeback window, so a buyer
   * whose cards never arrive can still dispute the charge.
   */
  maxHoldWeeks: 13,
  holdWeekOptions: [1, 2, 4, 8, 13],
  defaultHoldWeeks: 4,
} as const

export type MailSlotStatus = 'open' | 'ready_to_ship' | 'shipped' | 'delivered'

/** `open` splits in two for display: still holding, or the paid hold has lapsed. */
export type MailSlotPhase = 'holding' | 'hold_ended' | Exclude<MailSlotStatus, 'open'>

export type SinglesMailSlotRow = {
  id: number
  buyer_user_id: string
  seller_user_id: string
  status: MailSlotStatus
  opened_at: string
  held_until: string
  max_hold_until: string
  weeks_purchased?: number | null
  rent_paid_usd?: number | null
  release_reason?: 'buyer_request' | 'hold_expired' | null
  released_at?: string | null
  shipping_method?: string | null
  shipping_amount_usd?: number | null
  tracking_code?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type SinglesMailSlotChargeRow = {
  id: number
  mail_slot_id: number
  order_id?: number | null
  kind: 'rent' | 'shipping'
  weeks?: number | null
  amount_usd: number
  created_at?: string | null
}

/** The slice of an order the slot's shipping math needs. */
export type MailSlotOrderLike = {
  item_subtotal_usd?: number | null
  item_count?: number | null
}

type SlotHoldWindow = Pick<SinglesMailSlotRow, 'held_until' | 'max_hold_until'>

/** An open slot as checkout sees it: the hold window plus what's already inside. */
export type CheckoutMailSlot = Pick<
  SinglesMailSlotRow,
  'id' | 'seller_user_id' | 'held_until' | 'max_hold_until'
> & {
  orders: MailSlotOrderLike[]
}

export function isMailSlotsSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    /(relation|table) ['"]public\.singles_mail_slot/.test(message) ||
    /Could not find the function public\.\w*mail_slot/.test(message) ||
    message.includes('mail_slot_id does not exist') ||
    message.includes('p_queue_in_mail_slot')
  )
}

export function normalizeHoldWeeks(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

export function calculateMailSlotRentUsd(weeks: number) {
  return roundUsd(normalizeHoldWeeks(weeks) * MAIL_SLOT.rentPerWeekUsd)
}

/**
 * Whole weeks of rent a slot can still take before hitting its cap. Extensions
 * stack on whichever is later — the paid-through date or now — so a lapsed hold
 * restarts from today rather than back-filling weeks nobody used.
 */
export function remainingHoldWeeks(slot: SlotHoldWindow, now = new Date()) {
  const base = Math.max(Date.parse(slot.held_until), now.getTime())
  return Math.max(0, Math.floor((Date.parse(slot.max_hold_until) - base) / WEEK_MS))
}

/** Hold lengths to offer: a new slot needs at least a week; an open slot can be joined as-is (0). */
export function holdWeekChoices(slot?: SlotHoldWindow | null, now = new Date()): number[] {
  if (!slot) return [...MAIL_SLOT.holdWeekOptions]

  const remaining = remainingHoldWeeks(slot, now)
  const choices: number[] = [0, ...MAIL_SLOT.holdWeekOptions.filter((weeks) => weeks <= remaining)]
  if (remaining > 0 && !choices.includes(remaining)) choices.push(remaining)
  return choices
}

export function projectHeldUntil(
  slot: SlotHoldWindow | null | undefined,
  weeks: number,
  now = new Date()
) {
  const safeWeeks = normalizeHoldWeeks(weeks)
  if (slot && safeWeeks === 0) return new Date(slot.held_until)

  const base = slot ? Math.max(Date.parse(slot.held_until), now.getTime()) : now.getTime()
  return new Date(base + safeWeeks * WEEK_MS)
}

export function resolveMailSlotPhase(
  slot: Pick<SinglesMailSlotRow, 'status' | 'held_until'>,
  now = new Date()
): MailSlotPhase {
  if (slot.status !== 'open') return slot.status
  return Date.parse(slot.held_until) > now.getTime() ? 'holding' : 'hold_ended'
}

export function formatMailSlotPhase(phase: MailSlotPhase) {
  switch (phase) {
    case 'holding':
      return 'Holding'
    case 'hold_ended':
      return 'Hold ended'
    case 'ready_to_ship':
      return 'Ready to ship'
    case 'shipped':
      return 'Shipped'
    case 'delivered':
      return 'Delivered'
  }
}

export function daysUntil(value: string, now = new Date()) {
  return Math.max(0, Math.ceil((Date.parse(value) - now.getTime()) / DAY_MS))
}

export function formatMailSlotDate(value?: string | Date | null) {
  if (!value) return 'Not set'

  return new Date(value).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** One combined shipment for everything in the slot, on checkout's own thresholds. */
export function calculateMailSlotShipping(orders: MailSlotOrderLike[]) {
  const subtotal = roundUsd(
    orders.reduce((sum, order) => sum + Number(order.item_subtotal_usd ?? 0), 0)
  )
  const itemCount = orders.reduce((sum, order) => sum + Number(order.item_count ?? 0), 0)

  return { subtotal, itemCount, ...resolveSinglesShipping({ subtotal, itemCount }) }
}

/**
 * What queuing saves versus shipping every order on its own. Goes negative when
 * it doesn't pay — one small order held for weeks costs more than it saves — and
 * the UI says so rather than hiding it. Pass the slot's charged shipping once it
 * has been released; until then the combined shipment is estimated.
 */
export function estimateMailSlotSavings(args: {
  orders: MailSlotOrderLike[]
  rentPaidUsd: number
  combinedShippingUsd?: number | null
}) {
  const separateShippingUsd = roundUsd(
    args.orders.reduce(
      (sum, order) =>
        sum +
        resolveSinglesShipping({
          subtotal: Number(order.item_subtotal_usd ?? 0),
          itemCount: Number(order.item_count ?? 0),
        }).amount,
      0
    )
  )
  const combinedShippingUsd = roundUsd(
    args.combinedShippingUsd ??
      (args.orders.length > 0 ? calculateMailSlotShipping(args.orders).amount : 0)
  )
  const rentPaidUsd = roundUsd(args.rentPaidUsd)

  return {
    separateShippingUsd,
    combinedShippingUsd,
    rentPaidUsd,
    netSavingsUsd: Number((separateShippingUsd - combinedShippingUsd - rentPaidUsd).toFixed(2)),
  }
}

export type QueuedCheckoutQuote = {
  mode: 'open_slot' | 'join_slot'
  holdWeeks: number
  rentUsd: number
  heldUntil: Date
  /** The order's own shipping, which the slot replaces with one combined charge later. */
  deferredShippingUsd: number
  grandTotal: number
}

/**
 * Price a queued checkout the way create_singles_checkout will: drop the order's
 * own shipping and add rent for any weeks bought now. A new slot takes
 * 1..maxHoldWeeks; joining an open one can add 0..remaining.
 */
export function quoteQueuedCheckout(args: {
  pricing: SinglesPricingBreakdown
  slot?: SlotHoldWindow | null
  holdWeeks: number
  now?: Date
}): QueuedCheckoutQuote {
  const now = args.now ?? new Date()
  const maxWeeks = args.slot ? remainingHoldWeeks(args.slot, now) : MAIL_SLOT.maxHoldWeeks
  const minWeeks = args.slot ? 0 : 1
  const holdWeeks = Math.min(maxWeeks, Math.max(minWeeks, normalizeHoldWeeks(args.holdWeeks)))
  const rentUsd = calculateMailSlotRentUsd(holdWeeks)

  return {
    mode: args.slot ? 'join_slot' : 'open_slot',
    holdWeeks,
    rentUsd,
    heldUntil: projectHeldUntil(args.slot, holdWeeks, now),
    deferredShippingUsd: args.pricing.shippingAmount,
    grandTotal: roundUsd(args.pricing.discountedSubtotal + args.pricing.taxAmount + rentUsd),
  }
}
