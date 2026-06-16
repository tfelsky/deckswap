import { describe, expect, it } from 'vitest'
import {
  generateWholesaleTurnoverProposals,
  type WholesaleInventoryLot,
} from '@/lib/wholesale-turnover'

const AS_OF = new Date('2026-06-15T12:00:00Z')

function lot(overrides: Partial<WholesaleInventoryLot>): WholesaleInventoryLot {
  return {
    id: 'lot',
    ownerId: 'owner',
    ownerName: 'Owner',
    title: 'Inventory lot',
    category: 'commander staples',
    quantity: 20,
    estimatedValueUsd: 300,
    acquiredAt: '2025-12-01T12:00:00Z',
    country: 'CA',
    wholesaleEnabled: true,
    ...overrides,
  }
}

describe('generateWholesaleTurnoverProposals', () => {
  it('creates balanced owner-to-owner wholesale proposals from aged inventory', () => {
    const proposals = generateWholesaleTurnoverProposals(
      [
        lot({
          id: 'a-1',
          ownerId: 'store-a',
          ownerName: 'Northside Games',
          title: 'Aged Commander staples',
          category: 'commander staples',
          wantedCategories: ['sealed product'],
          estimatedValueUsd: 450,
        }),
        lot({
          id: 'a-2',
          ownerId: 'store-a',
          ownerName: 'Northside Games',
          title: 'Slow tribal rares',
          category: 'tribal rares',
          wantedCategories: ['sealed product'],
          estimatedValueUsd: 280,
        }),
        lot({
          id: 'b-1',
          ownerId: 'store-b',
          ownerName: 'Prairie Cards',
          title: 'Older sealed bundles',
          category: 'sealed product',
          wantedCategories: ['commander staples', 'tribal rares'],
          estimatedValueUsd: 700,
        }),
      ],
      {
        asOf: AS_OF,
        minimumAgeDays: 90,
        targetBundleValueUsd: 800,
        maxCashEqualizationUsd: 100,
      }
    )

    expect(proposals).toHaveLength(1)
    expect(proposals[0].ownerAId).toBe('store-a')
    expect(proposals[0].ownerBId).toBe('store-b')
    expect(proposals[0].ownerALots.map((item) => item.id)).toEqual(['a-1', 'a-2'])
    expect(proposals[0].ownerBLots.map((item) => item.id)).toEqual(['b-1'])
    expect(proposals[0].valueGapUsd).toBe(30)
    expect(proposals[0].cashEqualizationUsd).toBe(30)
    expect(proposals[0].cashPaidByOwnerId).toBe('store-b')
    expect(proposals[0].turnoverScore).toBeGreaterThan(60)
    expect(proposals[0].reasons.join(' ')).toContain('owner-to-owner')
  })

  it('ignores fresh, disabled, same-owner, and blocked inventory', () => {
    const proposals = generateWholesaleTurnoverProposals(
      [
        lot({
          id: 'fresh-a',
          ownerId: 'store-a',
          acquiredAt: '2026-05-15T12:00:00Z',
          wantedCategories: ['sealed product'],
        }),
        lot({
          id: 'disabled-a',
          ownerId: 'store-a',
          wholesaleEnabled: false,
          wantedCategories: ['sealed product'],
        }),
        lot({
          id: 'same-owner-a',
          ownerId: 'store-a',
          wantedCategories: ['sealed product'],
        }),
        lot({
          id: 'same-owner-b',
          ownerId: 'store-a',
          category: 'sealed product',
          wantedCategories: ['commander staples'],
        }),
        lot({
          id: 'blocked-b',
          ownerId: 'store-b',
          ownerName: 'Blocked Store',
          category: 'sealed product',
          wantedCategories: ['commander staples'],
          blockedOwnerIds: ['store-a'],
        }),
      ],
      { asOf: AS_OF, minimumAgeDays: 90 }
    )

    expect(proposals).toEqual([])
  })

  it('ranks stronger demand and older stock before weaker turnover opportunities', () => {
    const proposals = generateWholesaleTurnoverProposals(
      [
        lot({
          id: 'a-old-demand',
          ownerId: 'store-a',
          ownerName: 'Northside Games',
          category: 'commander staples',
          acquiredAt: '2025-01-01T12:00:00Z',
          wantedCategories: ['sealed product'],
          estimatedValueUsd: 500,
        }),
        lot({
          id: 'b-demand',
          ownerId: 'store-b',
          ownerName: 'Prairie Cards',
          category: 'sealed product',
          acquiredAt: '2025-02-01T12:00:00Z',
          wantedCategories: ['commander staples'],
          estimatedValueUsd: 510,
        }),
        lot({
          id: 'c-open',
          ownerId: 'store-c',
          ownerName: 'Metro Cards',
          category: 'sealed product',
          acquiredAt: '2025-09-01T12:00:00Z',
          wantedCategories: [],
          estimatedValueUsd: 500,
        }),
      ],
      {
        asOf: AS_OF,
        minimumAgeDays: 90,
        targetBundleValueUsd: 550,
        proposalLimit: 3,
      }
    )

    expect(proposals.length).toBeGreaterThan(1)
    expect([proposals[0].ownerAId, proposals[0].ownerBId]).toEqual(['store-a', 'store-b'])
    expect(proposals[0].turnoverScore).toBeGreaterThan(proposals[1].turnoverScore)
  })

  it('rejects proposals when value gaps cannot clear through tolerance or cash equalization', () => {
    const proposals = generateWholesaleTurnoverProposals(
      [
        lot({
          id: 'a-premium',
          ownerId: 'store-a',
          category: 'commander staples',
          wantedCategories: ['sealed product'],
          estimatedValueUsd: 1200,
        }),
        lot({
          id: 'b-small',
          ownerId: 'store-b',
          category: 'sealed product',
          wantedCategories: ['commander staples'],
          estimatedValueUsd: 300,
        }),
      ],
      {
        asOf: AS_OF,
        minimumAgeDays: 90,
        maxValueGapPercent: 0.15,
        maxCashEqualizationUsd: 200,
      }
    )

    expect(proposals).toEqual([])
  })
})
