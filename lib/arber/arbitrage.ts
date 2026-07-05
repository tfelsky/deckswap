// Arb'r — the arbitrage engine. Pure and deterministic: given a listing, a
// buylist quote, and config, it computes the full buy-low / sell-to-buylist
// economics. No I/O here so it can be unit-tested in isolation.

import {
  DEFAULT_ARBITRAGE_CONFIG,
  type ArbitrageConfig,
  type ArbitrageOpportunity,
  type BuylistQuote,
  type EbayListing,
} from './types'

function roundUsd(value: number) {
  return Number(value.toFixed(2))
}

export function resolveArbitrageConfig(
  partial?: Partial<ArbitrageConfig>
): ArbitrageConfig {
  return { ...DEFAULT_ARBITRAGE_CONFIG, ...(partial ?? {}) }
}

/**
 * Inbound shipping we assume we'll pay to acquire the card. Listings that
 * already expose a shipping charge use it; otherwise we fall back to the
 * configured assumption so estimates stay conservative.
 */
function inboundShipping(listing: EbayListing, config: ArbitrageConfig): number {
  if (listing.shippingCost != null && Number.isFinite(listing.shippingCost)) {
    return Math.max(0, listing.shippingCost)
  }
  return Math.max(0, config.assumedInboundShippingUsd)
}

/**
 * Compute the economics of buying one listing via Best Offer and selling the
 * copies into a buylist. Returns a fully-populated opportunity; callers decide
 * whether to surface it based on `profitable`.
 */
export function evaluateOpportunity(
  listing: EbayListing,
  quote: BuylistQuote,
  partialConfig?: Partial<ArbitrageConfig>
): ArbitrageOpportunity {
  const config = resolveArbitrageConfig(partialConfig)
  const quantity = Math.max(1, Math.floor(listing.quantity) || 1)

  const offerRatio = Math.min(1, Math.max(0, config.offerRatio))
  const suggestedOffer = roundUsd(listing.askingPrice * offerRatio)
  const shipping = inboundShipping(listing, config)
  const acquisitionCost = roundUsd(suggestedOffer + shipping)

  const buylistPayout = roundUsd(quote.cashPrice * quantity)
  const netSellback = roundUsd(buylistPayout - config.sellShippingUsd)

  const profit = roundUsd(netSellback - acquisitionCost)
  const marginPct =
    acquisitionCost > 0 ? Number((profit / acquisitionCost).toFixed(4)) : 0

  // Highest offer that still clears the minimum profit, given fixed shipping:
  //   netSellback - (offer + shipping) >= minProfit
  //   offer <= netSellback - shipping - minProfit
  const maxOfferRaw = netSellback - shipping - config.minProfitUsd
  const maxProfitableOffer = maxOfferRaw > 0 ? roundUsd(maxOfferRaw) : null

  const profitable =
    listing.bestOfferEnabled &&
    profit >= config.minProfitUsd &&
    marginPct >= config.minMarginPct

  return {
    listing,
    quote,
    suggestedOffer,
    acquisitionCost,
    buylistPayout,
    netSellback,
    profit,
    marginPct,
    maxProfitableOffer,
    profitable,
  }
}

/**
 * Evaluate a batch and return them sorted by margin (best first). Listings
 * without a quote are simply skipped — callers track unpriced titles upstream.
 */
export function rankOpportunities(
  pairs: Array<{ listing: EbayListing; quote: BuylistQuote }>,
  config?: Partial<ArbitrageConfig>
): ArbitrageOpportunity[] {
  return pairs
    .map(({ listing, quote }) => evaluateOpportunity(listing, quote, config))
    .sort((a, b) => b.marginPct - a.marginPct)
}
