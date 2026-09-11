import { describe, expect, it } from 'vitest'
import {
  buildNetworkLots,
  generateNetworkProposals,
  itemUnitValueUsd,
  orientProposal,
  primaryCardType,
  proposalsForUser,
  type NetworkInventoryItem,
  type TradeNetworkMembership,
} from '@/lib/trade-network'

const AS_OF = new Date('2026-07-01T12:00:00Z')

function membership(overrides: Partial<TradeNetworkMembership>): TradeNetworkMembership {
  return {
    user_id: 'user',
    enabled: true,
    display_name: 'Member',
    country: 'CA',
    min_item_value_usd: 50,
    minimum_age_days: 120,
    wanted_categories: [],
    blocked_user_ids: [],
    ...overrides,
  }
}

function item(overrides: Partial<NetworkInventoryItem>): NetworkInventoryItem {
  return {
    id: 1,
    user_id: 'user',
    card_name: 'Mana Crypt',
    quantity: 1,
    foil: false,
    set_name: 'Eternal Masters',
    rarity: 'mythic',
    type_line: 'Artifact',
    price_usd: 180,
    price_usd_foil: null,
    inventory_status: 'staged',
    imported_at: '2026-01-01T12:00:00Z',
    ...overrides,
  }
}

describe('primaryCardType', () => {
  it('extracts the primary type ignoring supertypes and subtypes', () => {
    expect(primaryCardType('Legendary Creature — Elder Dragon')).toBe('creature')
    expect(primaryCardType('Artifact')).toBe('artifact')
    expect(primaryCardType('Instant // Sorcery')).toBe('instant')
    expect(primaryCardType(null)).toBeNull()
  })
})

describe('itemUnitValueUsd', () => {
  it('prefers the foil price for foil items and falls back to nonfoil', () => {
    expect(itemUnitValueUsd(item({ foil: true, price_usd: 40, price_usd_foil: 90 }))).toBe(90)
    expect(itemUnitValueUsd(item({ foil: true, price_usd: 40, price_usd_foil: null }))).toBe(40)
    expect(itemUnitValueUsd(item({ price_usd: null }))).toBe(0)
  })
})

describe('buildNetworkLots', () => {
  it('applies per-member value and age thresholds and skips non-members', () => {
    const memberships = new Map([
      ['user-a', membership({ user_id: 'user-a', min_item_value_usd: 100 })],
      ['user-b', membership({ user_id: 'user-b', enabled: false })],
    ])

    const lots = buildNetworkLots(
      [
        item({ id: 1, user_id: 'user-a', price_usd: 180 }),
        // Below user-a's $100 high-end floor.
        item({ id: 2, user_id: 'user-a', price_usd: 60 }),
        // Too fresh: imported less than 120 days before AS_OF.
        item({ id: 3, user_id: 'user-a', price_usd: 250, imported_at: '2026-06-01T12:00:00Z' }),
        // Already sold — not matchable.
        item({ id: 4, user_id: 'user-a', price_usd: 300, inventory_status: 'completed' }),
        // Membership disabled.
        item({ id: 5, user_id: 'user-b', price_usd: 400 }),
        // Not a member at all.
        item({ id: 6, user_id: 'user-c', price_usd: 500 }),
      ],
      memberships,
      AS_OF
    )

    expect(lots.map((lot) => lot.id)).toEqual(['single-1'])
    expect(lots[0].ownerId).toBe('user-a')
    expect(lots[0].estimatedValueUsd).toBe(180)
    expect(lots[0].category).toBe('artifact')
  })

  it('multiplies unit value by quantity and tags foils', () => {
    const memberships = new Map([['user-a', membership({ user_id: 'user-a' })]])
    const lots = buildNetworkLots(
      [item({ id: 7, user_id: 'user-a', quantity: 3, foil: true, price_usd_foil: 120 })],
      memberships,
      AS_OF
    )

    expect(lots).toHaveLength(1)
    expect(lots[0].estimatedValueUsd).toBe(360)
    expect(lots[0].quantity).toBe(3)
    expect(lots[0].tags).toContain('foil')
    expect(lots[0].title).toContain('(foil)')
  })
})

describe('generateNetworkProposals + proposalsForUser', () => {
  it('matches two members with balanced aged high-end stock', () => {
    const memberships = new Map([
      ['user-a', membership({ user_id: 'user-a', display_name: 'Alice' })],
      ['user-b', membership({ user_id: 'user-b', display_name: 'Bruno' })],
      ['user-c', membership({ user_id: 'user-c', display_name: 'Cass' })],
    ])

    const lots = buildNetworkLots(
      [
        item({ id: 1, user_id: 'user-a', card_name: 'Mana Crypt', price_usd: 180 }),
        item({ id: 2, user_id: 'user-a', card_name: 'Mox Diamond', price_usd: 620 }),
        item({ id: 3, user_id: 'user-b', card_name: 'Gaea’s Cradle', price_usd: 790 }),
        // user-c only holds fresh stock, so they never enter the pool.
        item({
          id: 4,
          user_id: 'user-c',
          card_name: 'The One Ring',
          price_usd: 900,
          imported_at: '2026-06-20T12:00:00Z',
        }),
      ],
      memberships,
      AS_OF
    )

    const proposals = generateNetworkProposals(lots, { asOf: AS_OF })
    expect(proposals).toHaveLength(1)

    const mine = proposalsForUser(proposals, 'user-a')
    expect(mine).toHaveLength(1)
    expect(proposalsForUser(proposals, 'user-c')).toHaveLength(0)

    const oriented = orientProposal(mine[0], 'user-a')
    expect(oriented.counterpartyId).toBe('user-b')
    expect(oriented.counterpartyName).toBe('Bruno')
    expect(oriented.myValueUsd).toBe(800)
    expect(oriented.theirValueUsd).toBe(790)
    // user-b's bundle is worth less, so user-b pays the equalization.
    expect(oriented.iPayCashEqualization).toBe(false)
  })
})
