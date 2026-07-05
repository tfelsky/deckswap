// Arb'r — buylist price estimation.
//
// Real MTG buylists (TCGplayer, Card Kingdom, SCG) have no easy public API,
// so v1 estimates the cash buylist payout as a configurable fraction of the
// Scryfall market price. Buylists pay a *higher* percentage on more valuable
// cards (a $0.50 common is near-worthless to a buylist, a $200 dual is highly
// liquid), so the ratio scales with price band.
//
// This is intentionally a single pluggable function: swapping in a live
// buylist feed later just means returning a BuylistQuote from real data
// instead of this heuristic, with no change to the arbitrage engine.

import type { BuylistQuote } from './types'

export type BuylistBand = {
  /** Inclusive lower bound on market price, in USD. */
  minPrice: number
  /** Buylist-to-market cash ratio applied within this band (0..1). */
  ratio: number
}

/**
 * Bands ordered high-to-low. The first band whose `minPrice` the market price
 * meets or exceeds wins. Tunable without touching the engine.
 */
export const DEFAULT_BUYLIST_BANDS: BuylistBand[] = [
  { minPrice: 100, ratio: 0.72 },
  { minPrice: 30, ratio: 0.68 },
  { minPrice: 10, ratio: 0.62 },
  { minPrice: 2, ratio: 0.55 },
  { minPrice: 0, ratio: 0.4 },
]

/**
 * Foil printings are less liquid for most buylists, so trim the ratio a touch.
 * Applied multiplicatively after the band ratio.
 */
const FOIL_RATIO_ADJUSTMENT = 0.9

export function resolveBuylistRatio(
  marketPrice: number,
  bands: BuylistBand[] = DEFAULT_BUYLIST_BANDS
): number {
  const safePrice = Number.isFinite(marketPrice) ? Math.max(0, marketPrice) : 0
  for (const band of bands) {
    if (safePrice >= band.minPrice) return band.ratio
  }
  // Bands always include a 0-floor, but stay defensive.
  return bands[bands.length - 1]?.ratio ?? 0
}

function roundUsd(value: number) {
  return Number(Math.max(0, value).toFixed(2))
}

/**
 * Estimate the cash a buylist would pay for one copy of a card given its
 * Scryfall market price. Returns null when there is no usable market price.
 */
export function estimateBuylistQuote(args: {
  cardName: string
  marketPrice: number | null
  foil: boolean
  bands?: BuylistBand[]
}): BuylistQuote | null {
  const { cardName, marketPrice, foil } = args
  if (marketPrice == null || !Number.isFinite(marketPrice) || marketPrice <= 0) {
    return null
  }

  const baseRatio = resolveBuylistRatio(marketPrice, args.bands)
  const ratio = foil ? baseRatio * FOIL_RATIO_ADJUSTMENT : baseRatio
  const cashPrice = roundUsd(marketPrice * ratio)

  return {
    cardName,
    marketPrice: roundUsd(marketPrice),
    cashPrice,
    ratio: Number(ratio.toFixed(3)),
    foil,
    source: `Heuristic (${Math.round(ratio * 100)}% of market)`,
  }
}
