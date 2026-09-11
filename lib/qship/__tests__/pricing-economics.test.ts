import { describe, expect, it } from 'vitest'
import {
  breakEvenAcquisitionRatio,
  computeBoxEconomics,
  maxCostBasisForFloor,
} from '../economics'
import {
  QSHIP_PLANS,
  availableShippingLevels,
  calculateLockCharge,
  getQshipPlan,
  quoteShipping,
  resolveFeeRate,
  resolveInsuranceUsd,
} from '../pricing'

const { starter, standard, collector } = QSHIP_PLANS

describe('fees', () => {
  it('slides 7% → 5% → 3% on monthly billing', () => {
    expect(resolveFeeRate(starter, 'monthly')).toBe(0.07)
    expect(resolveFeeRate(standard, 'monthly')).toBe(0.05)
    expect(resolveFeeRate(collector, 'monthly')).toBe(0.03)
  })

  it('takes a point off for annual prepay, floored at 2%', () => {
    expect(resolveFeeRate(starter, 'annual')).toBe(0.06)
    expect(resolveFeeRate(standard, 'annual')).toBe(0.04)
    expect(resolveFeeRate(collector, 'annual')).toBe(0.02)
    expect(resolveFeeRate({ ...collector, feeRate: 0.02 }, 'annual')).toBe(0.02)
  })

  it('resolves plans by key, case-insensitively', () => {
    expect(getQshipPlan('Standard')?.boxValueUsd).toBe(35)
    expect(getQshipPlan('nope')).toBeNull()
  })
})

describe('shipping levels', () => {
  it('ships small shipments by Economy PWE for $5', () => {
    const quote = quoteShipping({ level: 'pwe_untracked', declaredValueUsd: 20, itemCount: 4 })
    expect(quote).toMatchObject({ level: 'pwe_untracked', upgraded: false, totalUsd: 5, tracked: false })
  })

  it('moves Economy to Tracked when a shipment is over $30 or 10 cards', () => {
    expect(quoteShipping({ level: 'pwe_untracked', declaredValueUsd: 36, itemCount: 6 })).toMatchObject({
      level: 'tracked_padded_mailer',
      upgraded: true,
      totalUsd: 15,
    })
    expect(quoteShipping({ level: 'pwe_untracked', declaredValueUsd: 20, itemCount: 12 }).level).toBe(
      'tracked_padded_mailer'
    )
  })

  it('prices Tracked at $15 and adds insurance by value band', () => {
    expect(quoteShipping({ level: 'tracked_padded_mailer', declaredValueUsd: 200, itemCount: 20 }).totalUsd).toBe(15)
    expect(resolveInsuranceUsd(60)).toBe(3)
    expect(resolveInsuranceUsd(150)).toBe(6)
    expect(resolveInsuranceUsd(400)).toBe(8)
    expect(resolveInsuranceUsd(900)).toBe(10)
    expect(quoteShipping({ level: 'tracked_insured', declaredValueUsd: 150, itemCount: 12 })).toMatchObject({
      baseUsd: 15,
      insuranceUsd: 6,
      totalUsd: 21,
      insured: true,
    })
  })

  it('lists only the levels a shipment can use, cheapest first', () => {
    expect(availableShippingLevels({ declaredValueUsd: 25, itemCount: 5 }).map((q) => [q.level, q.totalUsd])).toEqual([
      ['pwe_untracked', 5],
      ['tracked_padded_mailer', 15],
      ['tracked_insured', 18],
    ])
    expect(availableShippingLevels({ declaredValueUsd: 140, itemCount: 18 }).map((q) => q.level)).toEqual([
      'tracked_padded_mailer',
      'tracked_insured',
    ])
  })
})

describe('calculateLockCharge', () => {
  it('charges box + fee for vault members, with shipping billed later', () => {
    const vault = calculateLockCharge({ plan: starter, interval: 'monthly', mode: 'vault_quarterly' })
    expect(vault.shipping).toBeNull()
    expect(vault.shippingUsd).toBe(0)
    expect(vault.totalUsd).toBe(26.75)
    expect(calculateLockCharge({ plan: standard, interval: 'monthly', mode: 'vault_quarterly' }).totalUsd).toBe(36.75)
    expect(calculateLockCharge({ plan: collector, interval: 'monthly', mode: 'vault_quarterly' }).totalUsd).toBe(51.5)
    expect(calculateLockCharge({ plan: standard, interval: 'annual', mode: 'vault_quarterly' }).totalUsd).toBe(36.4)
  })

  it('adds the chosen shipping level for monthly shippers', () => {
    const economy = calculateLockCharge({
      plan: starter,
      interval: 'monthly',
      mode: 'ship_monthly',
      shippingLevel: 'pwe_untracked',
    })
    expect(economy.shippingUsd).toBe(5)
    expect(economy.totalUsd).toBe(31.75)

    const upgraded = calculateLockCharge({
      plan: standard,
      interval: 'monthly',
      mode: 'ship_monthly',
      shippingLevel: 'pwe_untracked',
      marketValueUsd: 36.2,
      itemCount: 6,
    })
    expect(upgraded.shipping?.upgraded).toBe(true)
    expect(upgraded.totalUsd).toBe(51.75)
  })

  it('applies credit to the whole charge without going negative', () => {
    const charge = calculateLockCharge({
      plan: standard,
      interval: 'monthly',
      mode: 'ship_monthly',
      shippingLevel: 'tracked_padded_mailer',
      marketValueUsd: 36.2,
      itemCount: 6,
      availableCreditUsd: 12.5,
    })
    expect(charge.subtotalUsd).toBe(51.75)
    expect(charge.creditAppliedUsd).toBe(12.5)
    expect(charge.totalUsd).toBe(39.25)

    const covered = calculateLockCharge({
      plan: starter,
      interval: 'monthly',
      mode: 'vault_quarterly',
      availableCreditUsd: 100,
    })
    expect(covered.creditAppliedUsd).toBe(26.75)
    expect(covered.totalUsd).toBe(0)
  })
})

describe('computeBoxEconomics', () => {
  // The unit economics table in docs/ai-trader-spec.md.
  it.each([
    [starter, 15.5, 8.27],
    [standard, 21.7, 11.78],
    [collector, 31, 16.81],
    [starter, 17, 6.77],
    [standard, 23.8, 9.68],
    [collector, 34, 13.81],
  ])('contribution for %s at cost %d', (plan, cost, contribution) => {
    const out = computeBoxEconomics({
      plan,
      interval: 'monthly',
      mode: 'vault_quarterly',
      marketValueUsd: plan.boxValueUsd,
      costBasisUsd: cost,
      itemCount: plan.minCards,
    })
    expect(out.contributionUsd).toBe(contribution)
    expect(out.meetsValueGuarantee).toBe(true)
    expect(out.meetsContributionFloor).toBe(true)
  })

  it('passes monthly shipping through, costing only its card processing', () => {
    const base = {
      plan: standard,
      interval: 'monthly' as const,
      marketValueUsd: 35,
      costBasisUsd: 21.7,
      itemCount: 6,
    }
    const vault = computeBoxEconomics({ ...base, mode: 'vault_quarterly' })
    const monthly = computeBoxEconomics({ ...base, mode: 'ship_monthly', shippingLevel: 'tracked_insured' })
    expect(monthly.shippingUsd).toBe(18)
    expect(monthly.chargeUsd).toBe(vault.chargeUsd + 18)
    expect(vault.contributionUsd - monthly.contributionUsd).toBeGreaterThan(0)
    expect(vault.contributionUsd - monthly.contributionUsd).toBeLessThanOrEqual(0.55)
  })

  it('flags boxes below the value guarantee or the contribution floor', () => {
    const out = computeBoxEconomics({
      plan: standard,
      interval: 'monthly',
      mode: 'vault_quarterly',
      marketValueUsd: 34,
      costBasisUsd: 30,
      itemCount: 5,
    })
    expect(out.meetsValueGuarantee).toBe(false)
    expect(out.meetsContributionFloor).toBe(false)
  })
})

describe('cost budget', () => {
  it('matches the break-even ratios in the spec', () => {
    expect(Math.round(breakEvenAcquisitionRatio(starter, 'monthly') * 100)).toBe(95)
    expect(Math.round(breakEvenAcquisitionRatio(standard, 'monthly') * 100)).toBe(96)
    expect(Math.round(breakEvenAcquisitionRatio(collector, 'monthly') * 100)).toBe(96)
  })

  it('sets floors at 15% of the monthly charge and leaves room for them', () => {
    for (const plan of [starter, standard, collector]) {
      const charge = calculateLockCharge({ plan, interval: 'monthly', mode: 'vault_quarterly' }).totalUsd
      expect(plan.contributionFloorUsd / charge).toBeCloseTo(0.15, 1)
    }
    expect(maxCostBasisForFloor(standard, 'monthly')).toBe(27.98)
    const atBudget = computeBoxEconomics({
      plan: standard,
      interval: 'monthly',
      mode: 'vault_quarterly',
      marketValueUsd: 35,
      costBasisUsd: maxCostBasisForFloor(standard, 'monthly'),
      itemCount: 5,
    })
    expect(atBudget.contributionUsd).toBeCloseTo(standard.contributionFloorUsd, 2)
  })
})
