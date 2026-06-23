import { describe, expect, it } from 'vitest'
import {
  ENGAGEMENT_RULES,
  engagementPointsFor,
  grantableEngagementPoints,
  remainingDailyAllowance,
  resolveEngagementTier,
  resolveEngagementTierProgress,
} from '@/lib/rewards/engagement'

describe('engagement earn rates', () => {
  it('exposes the per-action point values', () => {
    expect(engagementPointsFor('list_item')).toBe(10)
    expect(engagementPointsFor('cart_add')).toBe(1)
    expect(engagementPointsFor('profile_complete')).toBe(25)
  })
})

describe('daily caps', () => {
  it('treats uncapped actions as always grantable', () => {
    expect(remainingDailyAllowance('list_item', 999)).toBe(ENGAGEMENT_RULES.list_item.points)
    expect(grantableEngagementPoints('list_item', 999)).toBe(10)
  })

  it('clamps capped actions to the remaining daily allowance', () => {
    expect(remainingDailyAllowance('cart_add', 0)).toBe(20)
    expect(remainingDailyAllowance('cart_add', 19)).toBe(1)
    expect(remainingDailyAllowance('cart_add', 20)).toBe(0)
    expect(remainingDailyAllowance('cart_add', 25)).toBe(0)
  })

  it('grants at most one action worth, never more than the cap leaves', () => {
    expect(grantableEngagementPoints('cart_add', 0)).toBe(1)
    expect(grantableEngagementPoints('cart_add', 20)).toBe(0)
    expect(grantableEngagementPoints('cart_add_received', 39)).toBe(1)
  })
})

describe('tier ladder', () => {
  it('maps lifetime SP to the right tier', () => {
    expect(resolveEngagementTier(0).key).toBe('newcomer')
    expect(resolveEngagementTier(99).key).toBe('newcomer')
    expect(resolveEngagementTier(100).key).toBe('regular')
    expect(resolveEngagementTier(500).key).toBe('trusted')
    expect(resolveEngagementTier(2000).key).toBe('veteran')
    expect(resolveEngagementTier(5000).key).toBe('legend')
    expect(resolveEngagementTier(999999).key).toBe('legend')
  })

  it('reports progress toward the next tier', () => {
    const progress = resolveEngagementTierProgress(300)
    expect(progress.tier.key).toBe('regular')
    expect(progress.nextTier?.key).toBe('trusted')
    expect(progress.pointsToNextTier).toBe(200) // 500 - 300
    expect(progress.progress).toBeCloseTo((300 - 100) / (500 - 100), 5)
  })

  it('caps out at the top tier', () => {
    const progress = resolveEngagementTierProgress(6000)
    expect(progress.tier.key).toBe('legend')
    expect(progress.nextTier).toBeNull()
    expect(progress.pointsToNextTier).toBe(0)
    expect(progress.progress).toBe(1)
  })
})
