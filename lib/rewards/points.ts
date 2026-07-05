// Mythivex Points (MP) — the "hard", USD-pegged reward currency.
//
// These are pure functions: they compute how many points an action mints and how
// a redemption resolves. The actual ledger writes happen through the
// award_reward_points / redeem_reward_points RPCs (see docs/sql/reward-points.sql);
// keeping the math here makes the economy unit-testable and easy to retune.

export type RewardReason =
  | 'singles_purchase'
  | 'singles_sale'
  | 'deck_purchase'
  | 'deck_sale'
  | 'ticket_purchase'
  | 'first_order_bonus'
  | 'redemption'
  | 'refund_adjustment'
  | 'manual_adjustment'

// Economy levers — the only numbers worth tuning. Change here, not at call sites.
export const REWARD_POINTS = {
  /** Buyer earn: MP per $1 of item value (subtotal excl. shipping/tax). */
  buyerPointsPerUsd: 1,
  /** Seller earn: MP per $1 of the platform/matching fee (funded from margin). */
  sellerPointsPerFeeUsd: 0.2,
  /**
   * Notional platform take on a sale. Singles/deck orders don't record an explicit
   * fee column, so seller rewards are sized off this assumed margin rather than the
   * gross sale price — keeps seller earn funded from margin, not revenue.
   */
  platformTakeRate: 0.1,
  /** Ticket earn: flat MP per seat plus MP per $1 of ticket cost. */
  ticketPointsPerSeat: 5,
  ticketPointsPerUsd: 1,
  /** One-time bonus on a member's first completed order. */
  firstOrderBonus: 100,
  /** Redemption peg: how many MP equal $1 of checkout credit. */
  redemptionPointsPerUsd: 100,
  /** Floor on a single redemption (500 MP = $5). */
  minRedemptionPoints: 500,
  /** A redemption can cover at most this fraction of an order total. */
  maxRedemptionFraction: 0.5,
} as const

function toWholePoints(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.floor(value)
}

function safeUsd(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.round(value * 100) / 100
}

/** MP a buyer earns on a completed purchase, from the discounted item subtotal. */
export function calculateBuyerPurchasePoints(discountedSubtotalUsd: number) {
  return toWholePoints(safeUsd(discountedSubtotalUsd) * REWARD_POINTS.buyerPointsPerUsd)
}

/** MP a seller earns on a completed sale, from the platform fee they were charged. */
export function calculateSellerSalePoints(platformFeeUsd: number) {
  return toWholePoints(safeUsd(platformFeeUsd) * REWARD_POINTS.sellerPointsPerFeeUsd)
}

/**
 * MP a seller earns on a completed sale where no explicit fee was recorded: derive
 * the notional fee from the sale value via the platform take rate, then reward off it.
 */
export function calculateSellerSalePointsFromSale(saleValueUsd: number) {
  return calculateSellerSalePoints(safeUsd(saleValueUsd) * REWARD_POINTS.platformTakeRate)
}

/** MP earned for buying draft/event tickets. */
export function calculateTicketPurchasePoints(args: { ticketCount: number; ticketCostUsd: number }) {
  const seats = Math.max(0, Math.floor(Number(args.ticketCount) || 0))
  const seatPoints = seats * REWARD_POINTS.ticketPointsPerSeat
  const valuePoints = toWholePoints(safeUsd(args.ticketCostUsd) * REWARD_POINTS.ticketPointsPerUsd)
  return seatPoints + valuePoints
}

/** Dollar value of a points balance at the current peg. */
export function pointsToUsd(points: number) {
  const safePoints = Math.max(0, Math.floor(Number(points) || 0))
  return Math.round((safePoints / REWARD_POINTS.redemptionPointsPerUsd) * 100) / 100
}

export type RedemptionResolution = {
  /** Points actually spent (a whole multiple of the peg, 0 if redemption is not possible). */
  pointsApplied: number
  /** USD credit applied to the order. */
  creditUsd: number
  /** Why the resolution landed where it did — useful for UI messaging. */
  reason: 'applied' | 'none_requested' | 'below_minimum' | 'insufficient_balance' | 'capped_by_order'
}

/**
 * Resolve a redemption request against the member's balance and the order total.
 * Honours the minimum redemption, the available balance, the per-order fraction
 * cap, and the whole-dollar peg (you can only spend points in $1 increments).
 */
export function resolveRedemption(args: {
  pointsRequested: number
  balance: number
  orderTotalUsd: number
}): RedemptionResolution {
  const requested = Math.max(0, Math.floor(Number(args.pointsRequested) || 0))
  const balance = Math.max(0, Math.floor(Number(args.balance) || 0))
  const orderTotal = safeUsd(args.orderTotalUsd)

  const none = (reason: RedemptionResolution['reason']): RedemptionResolution => ({
    pointsApplied: 0,
    creditUsd: 0,
    reason,
  })

  if (requested <= 0) return none('none_requested')

  // Ceiling from the per-order fraction cap, snapped down to whole-dollar points.
  const maxCreditUsd = Math.floor(orderTotal * REWARD_POINTS.maxRedemptionFraction)
  const maxPointsByOrder = maxCreditUsd * REWARD_POINTS.redemptionPointsPerUsd

  // Spend in whole-dollar increments only.
  const requestedWholeDollarPoints =
    Math.floor(requested / REWARD_POINTS.redemptionPointsPerUsd) * REWARD_POINTS.redemptionPointsPerUsd

  let pointsApplied = Math.min(requestedWholeDollarPoints, balance, maxPointsByOrder)
  pointsApplied =
    Math.floor(pointsApplied / REWARD_POINTS.redemptionPointsPerUsd) * REWARD_POINTS.redemptionPointsPerUsd

  if (pointsApplied < REWARD_POINTS.minRedemptionPoints) {
    if (maxPointsByOrder < REWARD_POINTS.minRedemptionPoints) return none('capped_by_order')
    if (balance < REWARD_POINTS.minRedemptionPoints) return none('insufficient_balance')
    return none('below_minimum')
  }

  return {
    pointsApplied,
    creditUsd: pointsToUsd(pointsApplied),
    reason: 'applied',
  }
}
