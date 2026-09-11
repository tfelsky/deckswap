// QShip — plan catalogue, fee tiers, shipping levels, and what a member is
// charged at lock.
//
// Members pay the box value plus a small visible fee that slides from 7%
// (Starter) to 3% (Collector); annual prepay takes a point off, floored at
// 2%. Shipping is always extra and the member picks the level: Economy PWE
// (small shipments only), Tracked, or Tracked + insured. Monthly shippers pay
// it with each box; vault members pay when a vault shipment goes out.

import {
  PWE_SHIPPING_RATE_USD,
  TRACKED_MAILER_RATE_USD,
  resolveSinglesShipping,
  roundUsd,
} from '@/lib/singles/pricing'
import type {
  QshipBillingInterval,
  QshipFulfillmentMode,
  QshipPlan,
  QshipPlanKey,
  QshipShippingLevel,
} from './types'

// Contribution floors are 15% of the monthly (pre-shipping) charge.
export const QSHIP_PLANS: Record<QshipPlanKey, QshipPlan> = {
  starter: {
    key: 'starter',
    label: 'Starter',
    boxValueUsd: 25,
    feeRate: 0.07,
    minCards: 3,
    maxCards: 6,
    maxSingleCardShare: 0.6,
    contributionFloorUsd: 4,
  },
  standard: {
    key: 'standard',
    label: 'Standard',
    boxValueUsd: 35,
    feeRate: 0.05,
    minCards: 4,
    maxCards: 8,
    maxSingleCardShare: 0.6,
    contributionFloorUsd: 5.5,
  },
  collector: {
    key: 'collector',
    label: 'Collector',
    boxValueUsd: 50,
    feeRate: 0.03,
    minCards: 4,
    maxCards: 10,
    maxSingleCardShare: 0.7,
    contributionFloorUsd: 7.75,
  },
}

export const QSHIP_PLAN_KEYS = Object.keys(QSHIP_PLANS) as QshipPlanKey[]

const ANNUAL_FEE_DISCOUNT = 0.01
const FEE_RATE_FLOOR = 0.02

/** Box market value may land up to this far above the plan's box value. */
export const BOX_VALUE_TOLERANCE = 0.08

export function getQshipPlan(key: string | null | undefined): QshipPlan | null {
  const normalized = String(key ?? '').trim().toLowerCase()
  return (QSHIP_PLANS as Record<string, QshipPlan>)[normalized] ?? null
}

export function resolveFeeRate(plan: QshipPlan, interval: QshipBillingInterval): number {
  const rate = interval === 'annual' ? plan.feeRate - ANNUAL_FEE_DISCOUNT : plan.feeRate
  return Number(Math.max(FEE_RATE_FLOOR, rate).toFixed(4))
}

export function resolveFeeUsd(plan: QshipPlan, interval: QshipBillingInterval): number {
  return roundUsd(plan.boxValueUsd * resolveFeeRate(plan, interval))
}

// ---------- shipping ----------

export const QSHIP_SHIPPING_LEVELS: Record<
  QshipShippingLevel,
  { key: QshipShippingLevel; label: string; description: string; tracked: boolean; insured: boolean }
> = {
  pwe_untracked: {
    key: 'pwe_untracked',
    label: 'Economy (PWE)',
    description: 'Plain white envelope, no tracking. Only for up to 10 cards worth $30 or less.',
    tracked: false,
    insured: false,
  },
  tracked_padded_mailer: {
    key: 'tracked_padded_mailer',
    label: 'Tracked',
    description: 'Padded mailer with tracking.',
    tracked: true,
    insured: false,
  },
  tracked_insured: {
    key: 'tracked_insured',
    label: 'Tracked + insured',
    description: 'Padded mailer with tracking, insured for the declared value.',
    tracked: true,
    insured: true,
  },
}

export const QSHIP_SHIPPING_LEVEL_KEYS = Object.keys(QSHIP_SHIPPING_LEVELS) as QshipShippingLevel[]
export const DEFAULT_SHIPPING_LEVEL: QshipShippingLevel = 'tracked_padded_mailer'

// Insurance by declared value, from the value bands in docs/pricing-roadmap-draft.md.
const INSURANCE_BANDS: Array<{ maxValueUsd: number; feeUsd: number }> = [
  { maxValueUsd: 100, feeUsd: 3 },
  { maxValueUsd: 300, feeUsd: 6 },
  { maxValueUsd: 500, feeUsd: 8 },
  { maxValueUsd: Number.POSITIVE_INFINITY, feeUsd: 10 },
]

export function resolveInsuranceUsd(declaredValueUsd: number) {
  const value = Math.max(0, declaredValueUsd)
  return INSURANCE_BANDS.find((band) => value <= band.maxValueUsd)?.feeUsd ?? 0
}

/** Economy uses the marketplace PWE lane: up to 10 cards, $30 or less. */
export function isPweEligible(args: { declaredValueUsd: number; itemCount: number }) {
  return (
    resolveSinglesShipping({ subtotal: args.declaredValueUsd, itemCount: args.itemCount }).method ===
    'pwe_untracked'
  )
}

export type QshipShippingQuote = {
  requestedLevel: QshipShippingLevel
  /** The level actually used; Economy moves to Tracked when it isn't allowed. */
  level: QshipShippingLevel
  upgraded: boolean
  label: string
  baseUsd: number
  insuranceUsd: number
  totalUsd: number
  tracked: boolean
  insured: boolean
}

export function quoteShipping(args: {
  level: QshipShippingLevel
  declaredValueUsd: number
  itemCount: number
}): QshipShippingQuote {
  const pweAllowed = isPweEligible(args)
  const level: QshipShippingLevel =
    args.level === 'pwe_untracked' && !pweAllowed ? 'tracked_padded_mailer' : args.level
  const meta = QSHIP_SHIPPING_LEVELS[level]
  const baseUsd = level === 'pwe_untracked' ? PWE_SHIPPING_RATE_USD : TRACKED_MAILER_RATE_USD
  const insuranceUsd = meta.insured ? resolveInsuranceUsd(args.declaredValueUsd) : 0

  return {
    requestedLevel: args.level,
    level,
    upgraded: level !== args.level,
    label: meta.label,
    baseUsd,
    insuranceUsd,
    totalUsd: roundUsd(baseUsd + insuranceUsd),
    tracked: meta.tracked,
    insured: meta.insured,
  }
}

/** Levels a shipment can use, cheapest first, for the level picker. */
export function availableShippingLevels(args: { declaredValueUsd: number; itemCount: number }) {
  return QSHIP_SHIPPING_LEVEL_KEYS.map((level) => quoteShipping({ ...args, level }))
    .filter((quote) => !quote.upgraded)
    .sort((a, b) => a.totalUsd - b.totalUsd)
}

// ---------- charge at lock ----------

export type QshipLockCharge = {
  boxValueUsd: number
  feeRate: number
  feeUsd: number
  /** Present for monthly shippers; vault shipments are charged when they go out. */
  shipping: QshipShippingQuote | null
  shippingUsd: number
  subtotalUsd: number
  creditAppliedUsd: number
  totalUsd: number
}

/**
 * What the member's card is charged when a box locks. When the box hasn't
 * been drafted yet (plan pages, previews) the plan's box value stands in for
 * market value and the plan's max card count for item count.
 */
export function calculateLockCharge(args: {
  plan: QshipPlan
  interval: QshipBillingInterval
  mode: QshipFulfillmentMode
  shippingLevel?: QshipShippingLevel
  marketValueUsd?: number
  itemCount?: number
  availableCreditUsd?: number
}): QshipLockCharge {
  const { plan, interval, mode } = args
  const feeRate = resolveFeeRate(plan, interval)
  const feeUsd = roundUsd(plan.boxValueUsd * feeRate)
  const shipping =
    mode === 'ship_monthly'
      ? quoteShipping({
          level: args.shippingLevel ?? DEFAULT_SHIPPING_LEVEL,
          declaredValueUsd: args.marketValueUsd ?? plan.boxValueUsd,
          itemCount: args.itemCount ?? plan.maxCards,
        })
      : null
  const shippingUsd = shipping?.totalUsd ?? 0
  const subtotalUsd = roundUsd(plan.boxValueUsd + feeUsd + shippingUsd)
  const creditAppliedUsd = roundUsd(Math.min(subtotalUsd, Math.max(0, args.availableCreditUsd ?? 0)))

  return {
    boxValueUsd: plan.boxValueUsd,
    feeRate,
    feeUsd,
    shipping,
    shippingUsd,
    subtotalUsd,
    creditAppliedUsd,
    totalUsd: roundUsd(subtotalUsd - creditAppliedUsd),
  }
}
