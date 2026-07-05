import { describe, expect, it } from 'vitest'
import {
  evaluateOpportunity,
  rankOpportunities,
  resolveArbitrageConfig,
} from '../arbitrage'
import { DEFAULT_ARBITRAGE_CONFIG, type BuylistQuote, type EbayListing } from '../types'

function listing(partial: Partial<EbayListing> = {}): EbayListing {
  return {
    id: 'l1',
    title: 'Test Card MTG NM',
    askingPrice: 40,
    bestOfferEnabled: true,
    condition: 'near_mint',
    shippingCost: 0,
    quantity: 1,
    cardName: 'Test Card',
    setHint: null,
    foil: false,
    url: 'https://ebay.com/itm/l1',
    imageUrl: null,
    seller: 'seller',
    ...partial,
  }
}

function quote(partial: Partial<BuylistQuote> = {}): BuylistQuote {
  return {
    cardName: 'Test Card',
    marketPrice: 50,
    cashPrice: 34,
    ratio: 0.68,
    foil: false,
    source: 'Heuristic (68% of market)',
    ...partial,
  }
}

describe('evaluateOpportunity', () => {
  it('computes a profitable buy-low / sell-to-buylist deal', () => {
    // Offer 80% of $40 = $32, +$0 shipping = $32 cost.
    // Buylist pays $34, -$1 sell shipping = $33 net. Profit $1.
    // That misses the $3 floor; bump the buylist to make it clear the bar.
    const out = evaluateOpportunity(
      listing({ askingPrice: 40 }),
      quote({ cashPrice: 42 })
    )
    expect(out.suggestedOffer).toBe(32)
    expect(out.acquisitionCost).toBe(32)
    expect(out.buylistPayout).toBe(42)
    expect(out.netSellback).toBe(41)
    expect(out.profit).toBe(9)
    expect(out.marginPct).toBeCloseTo(9 / 32, 4)
    expect(out.profitable).toBe(true)
  })

  it('is never profitable when Best Offer is disabled', () => {
    const out = evaluateOpportunity(
      listing({ bestOfferEnabled: false, askingPrice: 10 }),
      quote({ cashPrice: 100 })
    )
    expect(out.profitable).toBe(false)
  })

  it('respects the minimum profit floor', () => {
    // $1 profit deal should not be marked profitable with a $3 floor.
    const out = evaluateOpportunity(
      listing({ askingPrice: 40 }),
      quote({ cashPrice: 34 })
    )
    expect(out.profit).toBe(1)
    expect(out.profitable).toBe(false)
  })

  it('respects the minimum margin floor even with absolute profit', () => {
    // Big absolute profit but thin margin relative to a pricey acquisition.
    const out = evaluateOpportunity(
      listing({ askingPrice: 1000 }),
      quote({ cashPrice: 805 }),
      { minMarginPct: 0.2, minProfitUsd: 3 }
    )
    // Offer 800, cost 800; net 804; profit 4 => margin 0.005 < 0.2.
    expect(out.profit).toBeGreaterThan(3)
    expect(out.marginPct).toBeLessThan(0.2)
    expect(out.profitable).toBe(false)
  })

  it('uses listing shipping when present and the fallback otherwise', () => {
    const withShip = evaluateOpportunity(
      listing({ askingPrice: 20, shippingCost: 5 }),
      quote({ cashPrice: 30 })
    )
    expect(withShip.acquisitionCost).toBe(21) // 16 offer + 5 shipping

    const noShip = evaluateOpportunity(
      listing({ askingPrice: 20, shippingCost: null }),
      quote({ cashPrice: 30 }),
      { assumedInboundShippingUsd: 2 }
    )
    expect(noShip.acquisitionCost).toBe(18) // 16 offer + 2 assumed
  })

  it('multiplies payout by listing quantity', () => {
    const out = evaluateOpportunity(
      listing({ askingPrice: 40, quantity: 3 }),
      quote({ cashPrice: 20 })
    )
    expect(out.buylistPayout).toBe(60)
  })

  it('reports a max profitable offer as the negotiating ceiling', () => {
    const out = evaluateOpportunity(
      listing({ askingPrice: 40, shippingCost: 0 }),
      quote({ cashPrice: 42 })
    )
    // netSellback 41 - shipping 0 - minProfit 3 = 38.
    expect(out.maxProfitableOffer).toBe(38)
  })

  it('returns null max offer when no offer can clear the floor', () => {
    const out = evaluateOpportunity(
      listing({ askingPrice: 40 }),
      quote({ cashPrice: 2 })
    )
    expect(out.maxProfitableOffer).toBeNull()
  })
})

describe('rankOpportunities', () => {
  it('sorts by margin, best first', () => {
    const ranked = rankOpportunities([
      { listing: listing({ id: 'a', askingPrice: 40 }), quote: quote({ cashPrice: 36 }) },
      { listing: listing({ id: 'b', askingPrice: 40 }), quote: quote({ cashPrice: 60 }) },
      { listing: listing({ id: 'c', askingPrice: 40 }), quote: quote({ cashPrice: 45 }) },
    ])
    expect(ranked.map((o) => o.listing.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('resolveArbitrageConfig', () => {
  it('merges partial overrides onto defaults', () => {
    const cfg = resolveArbitrageConfig({ offerRatio: 0.5 })
    expect(cfg.offerRatio).toBe(0.5)
    expect(cfg.minProfitUsd).toBe(DEFAULT_ARBITRAGE_CONFIG.minProfitUsd)
  })
})
