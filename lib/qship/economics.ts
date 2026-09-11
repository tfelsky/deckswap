// QShip — per-box P&L. Pure: given the plan, how the box ships, and what the
// cards cost us, compute contribution and whether the box keeps its two
// promises (market value >= box value, contribution >= floor).
//
// Shipping is a pass-through: the member pays the carrier rate (and
// insurance) for the level they chose, so it only costs us the card
// processing on top of it.

import { roundUsd } from '@/lib/singles/pricing'
import { BOX_VALUE_TOLERANCE, calculateLockCharge, resolveFeeRate } from './pricing'
import type {
  QshipBillingInterval,
  QshipFulfillmentMode,
  QshipPlan,
  QshipShippingLevel,
} from './types'

export const PAYMENT_PROCESSING_RATE = 0.029
export const PAYMENT_PROCESSING_FIXED_USD = 0.3
export const PICK_PACK_USD = 1.5
export const LLM_AND_DATA_USD = 0.4

export function paymentProcessingUsd(chargeUsd: number) {
  return roundUsd(chargeUsd * PAYMENT_PROCESSING_RATE + PAYMENT_PROCESSING_FIXED_USD)
}

export type QshipBoxEconomics = {
  chargeUsd: number
  feeUsd: number
  shippingLevel: QshipShippingLevel | null
  shippingUsd: number
  marketValueUsd: number
  costBasisUsd: number
  paymentProcessingUsd: number
  /** What we pay the carrier and insurer; equals shippingUsd. */
  shippingCostUsd: number
  handlingUsd: number
  contributionUsd: number
  /** Contribution as a share of the charge (0..1). */
  contributionPct: number
  /** Cost basis as a share of market value (0..1). */
  acquisitionRatio: number
  /** Market value as a share of box value (>= 1 keeps the guarantee). */
  valueRatio: number
  meetsValueGuarantee: boolean
  withinValueTolerance: boolean
  meetsContributionFloor: boolean
}

export function computeBoxEconomics(args: {
  plan: QshipPlan
  interval: QshipBillingInterval
  mode: QshipFulfillmentMode
  shippingLevel?: QshipShippingLevel
  marketValueUsd: number
  costBasisUsd: number
  itemCount: number
}): QshipBoxEconomics {
  const { plan, marketValueUsd, costBasisUsd } = args
  const charge = calculateLockCharge({
    plan,
    interval: args.interval,
    mode: args.mode,
    shippingLevel: args.shippingLevel,
    marketValueUsd,
    itemCount: args.itemCount,
  })
  const chargeUsd = charge.subtotalUsd
  const processing = paymentProcessingUsd(chargeUsd)
  const shippingCostUsd = charge.shippingUsd
  const handlingUsd = roundUsd(PICK_PACK_USD + LLM_AND_DATA_USD)
  const contributionUsd = Number(
    (chargeUsd - costBasisUsd - processing - shippingCostUsd - handlingUsd).toFixed(2)
  )

  return {
    chargeUsd,
    feeUsd: charge.feeUsd,
    shippingLevel: charge.shipping?.level ?? null,
    shippingUsd: charge.shippingUsd,
    marketValueUsd: roundUsd(marketValueUsd),
    costBasisUsd: roundUsd(costBasisUsd),
    paymentProcessingUsd: processing,
    shippingCostUsd,
    handlingUsd,
    contributionUsd,
    contributionPct: chargeUsd > 0 ? Number((contributionUsd / chargeUsd).toFixed(4)) : 0,
    acquisitionRatio:
      marketValueUsd > 0 ? Number((costBasisUsd / marketValueUsd).toFixed(4)) : 0,
    valueRatio:
      plan.boxValueUsd > 0 ? Number((marketValueUsd / plan.boxValueUsd).toFixed(4)) : 0,
    meetsValueGuarantee: marketValueUsd >= plan.boxValueUsd,
    withinValueTolerance: marketValueUsd <= plan.boxValueUsd * (1 + BOX_VALUE_TOLERANCE) + 1e-9,
    meetsContributionFloor: contributionUsd >= plan.contributionFloorUsd,
  }
}

function fixedCostsUsd(chargeUsd: number) {
  return paymentProcessingUsd(chargeUsd) + PICK_PACK_USD + LLM_AND_DATA_USD
}

/**
 * The most QShip can spend acquiring a box's cards and still clear the plan's
 * contribution floor. Computed before shipping, which passes through.
 */
export function maxCostBasisForFloor(plan: QshipPlan, interval: QshipBillingInterval): number {
  const chargeUsd = roundUsd(plan.boxValueUsd * (1 + resolveFeeRate(plan, interval)))
  return Number(Math.max(0, chargeUsd - fixedCostsUsd(chargeUsd) - plan.contributionFloorUsd).toFixed(2))
}

/** Acquisition ratio at which a box of exactly box value breaks even. */
export function breakEvenAcquisitionRatio(plan: QshipPlan, interval: QshipBillingInterval) {
  const chargeUsd = roundUsd(plan.boxValueUsd * (1 + resolveFeeRate(plan, interval)))
  return Number(((chargeUsd - fixedCostsUsd(chargeUsd)) / plan.boxValueUsd).toFixed(4))
}
