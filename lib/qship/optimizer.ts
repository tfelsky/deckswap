// QShip — packs scored candidates into boxes. Pure and deterministic.
//
// A box has two budgets: its market value must land in
// [box value, box value × 1.08], and what QShip pays for the cards must stay
// under the cost budget that keeps the box above its contribution floor.
// Slots (play / hold / spec) split the value by the member's risk dial.
// Several strategies produce distinct bundles for the curation step to
// choose between; each is validated with the same rules Claude's pick is.

import { maxCostBasisForFloor } from './economics'
import { BOX_VALUE_TOLERANCE } from './pricing'
import { MIN_BOXABLE_PRICE_USD } from './scoring'
import type {
  QshipBillingInterval,
  QshipBundle,
  QshipBundleItem,
  QshipBundleStrategy,
  QshipPlan,
  QshipRiskProfile,
  QshipScoredCandidate,
  QshipSlot,
} from './types'

export const QSHIP_SLOTS: QshipSlot[] = ['play', 'hold', 'spec']

export const SLOT_MIX: Record<QshipRiskProfile, Record<QshipSlot, number>> = {
  player: { play: 0.7, hold: 0.25, spec: 0.05 },
  balanced: { play: 0.5, hold: 0.3, spec: 0.2 },
  speculator: { play: 0.25, hold: 0.35, spec: 0.4 },
}

const STRATEGY_SHIFT = 0.2
/** Starter boxes use a Supply card only when no pool card is this close. */
const STARTER_POOL_FIRST_MARGIN = 0.9
/** How far over its share one slot may run before we move on. */
const SLOT_OVERSHOOT = 1.25
const ALTERNATE_PRICE_DELTA_USD = 2

export type BundleOptions = {
  plan: QshipPlan
  interval: QshipBillingInterval
  riskProfile: QshipRiskProfile
}

function round2(value: number) {
  return Number(value.toFixed(2))
}

/** Slot mix for a strategy, shifting weight toward what it optimizes for. */
export function strategyMix(
  riskProfile: QshipRiskProfile,
  strategy: QshipBundleStrategy
): Record<QshipSlot, number> {
  const mix = { ...SLOT_MIX[riskProfile] }
  if (strategy === 'deck_impact') {
    let shift = Math.min(STRATEGY_SHIFT, 1 - mix.play)
    const fromSpec = Math.min(shift, mix.spec)
    mix.spec -= fromSpec
    shift -= fromSpec
    mix.hold -= Math.min(shift, mix.hold)
    mix.play = 1 - mix.hold - mix.spec
  } else if (strategy === 'value') {
    const shift = Math.min(STRATEGY_SHIFT, mix.play)
    mix.play -= shift
    mix.hold += shift
  }
  return {
    play: round2(mix.play),
    hold: round2(mix.hold),
    spec: round2(mix.spec),
  }
}

function rankFor(strategy: QshipBundleStrategy) {
  // The value strategy ignores taste and deck fit; the others use the full score.
  return (candidate: QshipScoredCandidate) =>
    strategy === 'value' ? candidate.desirability : candidate.score
}

/**
 * Starter margins are thin, so a Supply copy is dropped from a slot whenever
 * a pool copy for that slot scores within 10% of it.
 */
export function applyPoolFirst(candidates: QshipScoredCandidate[]) {
  const bestPoolBySlot = new Map<QshipSlot, number>()
  for (const candidate of candidates) {
    if (candidate.channel !== 'pool') continue
    for (const slot of candidate.slots) {
      bestPoolBySlot.set(slot, Math.max(bestPoolBySlot.get(slot) ?? 0, candidate.score))
    }
  }
  return candidates
    .map((candidate) => {
      if (candidate.channel !== 'supply') return candidate
      const slots = candidate.slots.filter(
        (slot) => (bestPoolBySlot.get(slot) ?? 0) < candidate.score * STARTER_POOL_FIRST_MARGIN
      )
      return { ...candidate, slots }
    })
    .filter((candidate) => candidate.slots.length > 0)
}

function summarize(
  strategy: QshipBundleStrategy,
  items: QshipBundleItem[],
  options: BundleOptions
): QshipBundle {
  const slotValueUsd: Record<QshipSlot, number> = { play: 0, hold: 0, spec: 0 }
  for (const item of items) slotValueUsd[item.slot] += item.candidate.marketPriceUsd
  const violations = validateBundle(items, options)
  return {
    strategy,
    items,
    marketValueUsd: round2(items.reduce((sum, item) => sum + item.candidate.marketPriceUsd, 0)),
    costBasisUsd: round2(items.reduce((sum, item) => sum + item.candidate.costBasisUsd, 0)),
    slotValueUsd: {
      play: round2(slotValueUsd.play),
      hold: round2(slotValueUsd.hold),
      spec: round2(slotValueUsd.spec),
    },
    cardCount: items.length,
    totalScore: round2(items.reduce((sum, item) => sum + item.candidate.score, 0)),
    violations,
    valid: violations.length === 0,
  }
}

/** Every rule a box must satisfy, whoever picked it. Empty means valid. */
export function validateBundle(
  items: Array<Pick<QshipBundleItem, 'candidate' | 'slot'>>,
  options: Pick<BundleOptions, 'plan' | 'interval'>
): string[] {
  const { plan } = options
  const violations: string[] = []
  const value = items.reduce((sum, item) => sum + item.candidate.marketPriceUsd, 0)
  const cost = items.reduce((sum, item) => sum + item.candidate.costBasisUsd, 0)
  const maxValue = plan.boxValueUsd * (1 + BOX_VALUE_TOLERANCE)
  const maxSingle = plan.boxValueUsd * plan.maxSingleCardShare
  const maxCost = maxCostBasisForFloor(plan, options.interval)

  if (value < plan.boxValueUsd) {
    violations.push(`Market value $${value.toFixed(2)} is below the $${plan.boxValueUsd} box value.`)
  }
  if (value > maxValue + 1e-9) {
    violations.push(`Market value $${value.toFixed(2)} is over the $${maxValue.toFixed(2)} ceiling.`)
  }
  if (items.length < plan.minCards) violations.push(`Only ${items.length} cards; ${plan.label} needs ${plan.minCards}.`)
  if (items.length > plan.maxCards) violations.push(`${items.length} cards; ${plan.label} allows ${plan.maxCards}.`)
  for (const item of items) {
    if (item.candidate.marketPriceUsd > maxSingle + 1e-9) {
      violations.push(`${item.candidate.card.cardName} is over the ${Math.round(plan.maxSingleCardShare * 100)}% single-card cap.`)
    }
    if (!item.candidate.slots.includes(item.slot)) {
      violations.push(`${item.candidate.card.cardName} is not eligible for the ${item.slot} slot.`)
    }
  }
  const oracleIds = items.map((item) => item.candidate.card.oracleId)
  if (new Set(oracleIds).size !== oracleIds.length) violations.push('The same card appears twice.')
  const inventoryIds = items.map((item) => item.candidate.inventoryId)
  if (new Set(inventoryIds).size !== inventoryIds.length) violations.push('The same copy is used twice.')
  if (cost > maxCost + 1e-9) {
    violations.push(`Cost basis $${cost.toFixed(2)} is over the $${maxCost.toFixed(2)} budget for the contribution floor.`)
  }
  return violations
}

export function buildBundle(
  scored: QshipScoredCandidate[],
  strategy: QshipBundleStrategy,
  options: BundleOptions
): QshipBundle {
  const { plan } = options
  const rank = rankFor(strategy)
  const mix = strategyMix(options.riskProfile, strategy)
  const maxValue = plan.boxValueUsd * (1 + BOX_VALUE_TOLERANCE)
  const maxSingle = plan.boxValueUsd * plan.maxSingleCardShare

  let pool = scored.filter(
    (candidate) => candidate.slots.length > 0 && candidate.marketPriceUsd <= maxSingle
  )
  if (plan.key === 'starter') pool = applyPoolFirst(pool)
  const ranked = [...pool].sort((a, b) => rank(b) - rank(a))

  const items: QshipBundleItem[] = []
  const usedOracle = new Set<string>()
  let total = 0

  const roomFor = () => {
    // Keep enough headroom that the minimum card count stays reachable.
    const stillNeeded = Math.max(0, plan.minCards - items.length - 1)
    return maxValue - total - stillNeeded * MIN_BOXABLE_PRICE_USD
  }
  const canAdd = (candidate: QshipScoredCandidate) =>
    !usedOracle.has(candidate.card.oracleId) &&
    items.length < plan.maxCards &&
    candidate.marketPriceUsd <= roomFor() + 1e-9
  const add = (candidate: QshipScoredCandidate, slot: QshipSlot) => {
    items.push({ candidate, slot })
    usedOracle.add(candidate.card.oracleId)
    total += candidate.marketPriceUsd
  }

  // Pass 1: fill each slot toward its share, biggest share first.
  const slotOrder = [...QSHIP_SLOTS].sort((a, b) => mix[b] - mix[a])
  for (const slot of slotOrder) {
    const budget = mix[slot] * plan.boxValueUsd
    if (budget <= 0) continue
    let slotValue = 0
    for (const candidate of ranked) {
      if (slotValue >= budget) break
      if (!candidate.slots.includes(slot) || !canAdd(candidate)) continue
      if (slotValue + candidate.marketPriceUsd > budget * SLOT_OVERSHOOT + 1) continue
      add(candidate, slot)
      slotValue += candidate.marketPriceUsd
    }
  }

  // Pass 2: close the gap to box value with the best card that fits.
  while (total < plan.boxValueUsd && items.length < plan.maxCards) {
    const gap = plan.boxValueUsd - total
    const fits = ranked.filter(canAdd)
    if (fits.length === 0) break
    const closer = fits.find((candidate) => candidate.marketPriceUsd >= gap)
    const pick = closer ?? fits[0]
    const slotTotals = slotValues(items)
    const slot =
      pick.slots.find((s) => slotTotals[s] < mix[s] * plan.boxValueUsd) ?? pick.slots[0]
    add(pick, slot)
  }

  repairCost(items, ranked, options)
  return summarize(strategy, items, options)
}

function slotValues(items: QshipBundleItem[]) {
  const values: Record<QshipSlot, number> = { play: 0, hold: 0, spec: 0 }
  for (const item of items) values[item.slot] += item.candidate.marketPriceUsd
  return values
}

/**
 * Swap the costliest-to-acquire copies for cheaper ones in the same slot
 * until the box fits its cost budget, never breaking the value window.
 */
function repairCost(
  items: QshipBundleItem[],
  ranked: QshipScoredCandidate[],
  options: BundleOptions
) {
  const { plan } = options
  const maxCost = maxCostBasisForFloor(plan, options.interval)
  const maxValue = plan.boxValueUsd * (1 + BOX_VALUE_TOLERANCE)

  for (let guard = 0; guard < items.length * 3; guard += 1) {
    const cost = items.reduce((sum, item) => sum + item.candidate.costBasisUsd, 0)
    if (cost <= maxCost + 1e-9) return
    const value = items.reduce((sum, item) => sum + item.candidate.marketPriceUsd, 0)

    const byRatio = [...items].sort(
      (a, b) =>
        b.candidate.costBasisUsd / b.candidate.marketPriceUsd -
        a.candidate.costBasisUsd / a.candidate.marketPriceUsd
    )
    let swapped = false
    for (const worst of byRatio) {
      const used = new Set(items.filter((item) => item !== worst).map((item) => item.candidate.card.oracleId))
      const replacement = ranked.find((candidate) => {
        if (used.has(candidate.card.oracleId) || !candidate.slots.includes(worst.slot)) return false
        if (candidate.costBasisUsd >= worst.candidate.costBasisUsd) return false
        const nextValue = value - worst.candidate.marketPriceUsd + candidate.marketPriceUsd
        return nextValue >= plan.boxValueUsd && nextValue <= maxValue + 1e-9
      })
      if (replacement) {
        worst.candidate = replacement
        swapped = true
        break
      }
    }
    if (!swapped) return
  }
}

function bundleKey(bundle: QshipBundle) {
  return bundle.items
    .map((item) => item.candidate.inventoryId)
    .sort()
    .join('|')
}

/** Distinct bundles for curation to choose from, valid and highest-scoring first. */
export function buildBundles(
  scored: QshipScoredCandidate[],
  options: BundleOptions,
  strategies: QshipBundleStrategy[] = ['balanced', 'deck_impact', 'value']
): QshipBundle[] {
  const seen = new Set<string>()
  const bundles: QshipBundle[] = []
  for (const strategy of strategies) {
    const bundle = buildBundle(scored, strategy, options)
    const key = bundleKey(bundle)
    if (bundle.items.length === 0 || seen.has(key)) continue
    seen.add(key)
    bundles.push(bundle)
  }
  return bundles.sort((a, b) => Number(b.valid) - Number(a.valid) || b.totalScore - a.totalScore)
}

/**
 * Same-slot swaps the member can pick on the reveal page: within ±$2 of the
 * card they replace, and the box stays valid after the swap.
 */
export function findAlternates(
  bundle: QshipBundle,
  scored: QshipScoredCandidate[],
  inventoryId: string,
  options: BundleOptions,
  limit = 3
): QshipScoredCandidate[] {
  const target = bundle.items.find((item) => item.candidate.inventoryId === inventoryId)
  if (!target) return []
  const used = new Set(bundle.items.map((item) => item.candidate.card.oracleId))

  return scored
    .filter(
      (candidate) =>
        !used.has(candidate.card.oracleId) &&
        candidate.slots.includes(target.slot) &&
        Math.abs(candidate.marketPriceUsd - target.candidate.marketPriceUsd) <= ALTERNATE_PRICE_DELTA_USD
    )
    .filter((candidate) => {
      const swapped = bundle.items.map((item) =>
        item === target ? { candidate, slot: target.slot } : item
      )
      return validateBundle(swapped, options).length === 0
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
