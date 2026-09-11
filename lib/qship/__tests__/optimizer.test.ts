import { describe, expect, it } from 'vitest'
import { maxCostBasisForFloor } from '../economics'
import {
  applyPoolFirst,
  buildBundle,
  buildBundles,
  findAlternates,
  strategyMix,
  validateBundle,
} from '../optimizer'
import { QSHIP_PLANS } from '../pricing'
import type { QshipScoredCandidate } from '../types'
import { scored } from './fixtures'

const standard = { plan: QSHIP_PLANS.standard, interval: 'monthly' as const, riskProfile: 'balanced' as const }

function universe(): QshipScoredCandidate[] {
  return [
    scored('p1', { price: 8, slots: ['play'], score: 90 }),
    scored('p2', { price: 6, slots: ['play'], score: 85 }),
    scored('p3', { price: 5, slots: ['play', 'hold'], score: 80 }),
    scored('p4', { price: 4, slots: ['play'], score: 70 }),
    scored('p5', { price: 3, slots: ['play'], score: 60 }),
    scored('p6', { price: 2.5, slots: ['play'], score: 55 }),
    scored('h1', { price: 9, slots: ['hold'], score: 75 }),
    scored('h2', { price: 7, slots: ['hold'], score: 72 }),
    scored('h3', { price: 6, slots: ['hold'], score: 65 }),
    scored('h4', { price: 4, slots: ['hold'], score: 58 }),
    scored('h5', { price: 3, slots: ['hold'], score: 50 }),
    scored('s1', { price: 6, slots: ['spec'], score: 68 }),
    scored('s2', { price: 5, slots: ['spec'], score: 62 }),
    scored('s3', { price: 4, slots: ['spec'], score: 57 }),
    scored('s4', { price: 3, slots: ['spec'], score: 52 }),
    scored('s5', { price: 2, slots: ['spec'], score: 45 }),
  ]
}

describe('strategyMix', () => {
  it('follows the risk dial for the balanced strategy', () => {
    expect(strategyMix('balanced', 'balanced')).toEqual({ play: 0.5, hold: 0.3, spec: 0.2 })
  })

  it('shifts weight to play for deck impact, spec first', () => {
    expect(strategyMix('balanced', 'deck_impact')).toEqual({ play: 0.7, hold: 0.3, spec: 0 })
    expect(strategyMix('player', 'deck_impact')).toEqual({ play: 0.9, hold: 0.1, spec: 0 })
  })

  it('shifts weight from play to hold for value', () => {
    expect(strategyMix('balanced', 'value')).toEqual({ play: 0.3, hold: 0.5, spec: 0.2 })
  })
})

describe('buildBundle', () => {
  it('packs a valid Standard box inside the value window and cost budget', () => {
    const bundle = buildBundle(universe(), 'balanced', standard)
    expect(bundle.violations).toEqual([])
    expect(bundle.marketValueUsd).toBeGreaterThanOrEqual(35)
    expect(bundle.marketValueUsd).toBeLessThanOrEqual(37.8)
    expect(bundle.cardCount).toBeGreaterThanOrEqual(4)
    expect(bundle.cardCount).toBeLessThanOrEqual(8)
    expect(bundle.costBasisUsd).toBeLessThanOrEqual(maxCostBasisForFloor(QSHIP_PLANS.standard, 'monthly'))
    expect(bundle.slotValueUsd.play).toBeGreaterThan(bundle.slotValueUsd.spec)
  })

  it('never repeats a card and keeps each item in a slot it qualifies for', () => {
    const bundle = buildBundle(universe(), 'deck_impact', standard)
    const ids = bundle.items.map((item) => item.candidate.card.oracleId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const item of bundle.items) expect(item.candidate.slots).toContain(item.slot)
  })

  it('swaps pricey Supply copies for pool copies to protect the contribution floor', () => {
    const cards = [
      ...universe(),
      scored('sup1', { price: 9, slots: ['play'], score: 99, channel: 'supply', costRatio: 0.98 }),
      scored('sup2', { price: 8, slots: ['hold'], score: 98, channel: 'supply', costRatio: 0.98 }),
      scored('sup3', { price: 6, slots: ['spec'], score: 97, channel: 'supply', costRatio: 0.98 }),
    ]
    const bundle = buildBundle(cards, 'balanced', standard)
    expect(bundle.valid).toBe(true)
    expect(bundle.costBasisUsd).toBeLessThanOrEqual(maxCostBasisForFloor(QSHIP_PLANS.standard, 'monthly'))
  })

  it('reports violations instead of shipping a short box', () => {
    const bundle = buildBundle(
      [scored('only', { price: 10, slots: ['hold'], score: 80 })],
      'balanced',
      standard
    )
    expect(bundle.valid).toBe(false)
    expect(bundle.violations.join(' ')).toMatch(/below the \$35 box value/)
  })

  it('respects the single-card cap', () => {
    const cards = [scored('big', { price: 30, slots: ['hold'], score: 100 }), ...universe()]
    const bundle = buildBundle(cards, 'balanced', standard)
    expect(bundle.items.some((item) => item.candidate.inventoryId === 'big')).toBe(false)
  })
})

describe('applyPoolFirst', () => {
  it('drops Supply copies a pool copy nearly matches, keeps clearly better ones', () => {
    const out = applyPoolFirst([
      scored('pool', { price: 5, slots: ['hold'], score: 80 }),
      scored('close', { price: 5, slots: ['hold'], score: 85, channel: 'supply' }),
      scored('better', { price: 5, slots: ['hold'], score: 95, channel: 'supply' }),
    ])
    expect(out.map((c) => c.inventoryId)).toEqual(['pool', 'better'])
  })
})

describe('buildBundles', () => {
  it('returns distinct bundles, valid ones first', () => {
    const bundles = buildBundles(universe(), standard)
    expect(bundles.length).toBeGreaterThanOrEqual(2)
    expect(bundles[0].valid).toBe(true)
    const keys = bundles.map((b) => b.items.map((i) => i.candidate.inventoryId).sort().join('|'))
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('validateBundle', () => {
  it('catches duplicates and wrong slots', () => {
    const card = scored('dup', { price: 18, slots: ['hold'], score: 50 })
    const violations = validateBundle(
      [
        { candidate: card, slot: 'hold' },
        { candidate: card, slot: 'spec' },
      ],
      standard
    )
    expect(violations.join(' ')).toMatch(/same card appears twice/)
    expect(violations.join(' ')).toMatch(/not eligible for the spec slot/)
  })
})

describe('findAlternates', () => {
  it('offers same-slot swaps within $2 that keep the box valid', () => {
    const cards = universe()
    const bundle = buildBundle(cards, 'balanced', standard)
    const target = bundle.items[0]
    const alternates = findAlternates(bundle, cards, target.candidate.inventoryId, standard)
    for (const alt of alternates) {
      expect(alt.slots).toContain(target.slot)
      expect(Math.abs(alt.marketPriceUsd - target.candidate.marketPriceUsd)).toBeLessThanOrEqual(2)
      const swapped = bundle.items.map((item) => (item === target ? { candidate: alt, slot: item.slot } : item))
      expect(validateBundle(swapped, standard)).toEqual([])
    }
  })
})
