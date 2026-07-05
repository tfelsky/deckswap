// Arb'r — shared types for the eBay-to-buylist arbitrage finder.
//
// The flow: pull MTG single listings from eBay that accept "Best Offer",
// enrich each with Scryfall market data, estimate what an MTG buylist would
// pay for the same card, then compute whether buying low (via a Best Offer)
// and selling into a buylist clears a configurable profit threshold.
//
// Everything here is plain data so the arbitrage engine (arbitrage.ts) stays
// pure and deterministically testable, independent of where the listings or
// buylist quotes actually come from.

export type CardCondition =
  | 'near_mint'
  | 'lightly_played'
  | 'moderately_played'
  | 'heavily_played'
  | 'damaged'
  | 'unknown'

/** A single eBay listing that accepts Best Offer, as returned by a provider. */
export type EbayListing = {
  /** Stable id from the source (eBay item id, or a synthetic id for samples). */
  id: string
  title: string
  /** Listed Buy It Now / asking price in USD. */
  askingPrice: number
  /** Whether the seller accepts Best Offer. Arb'r only acts on `true`. */
  bestOfferEnabled: boolean
  condition: CardCondition
  /** Shipping charged to the buyer in USD, if known (0 = free shipping). */
  shippingCost: number | null
  /** Quantity available in the listing (defaults to 1). */
  quantity: number
  /** Best-effort parsed card name for Scryfall matching. */
  cardName: string | null
  /** Best-effort parsed set code/name, when the title exposes one. */
  setHint: string | null
  /** Whether the listing looks like a foil/etched printing. */
  foil: boolean
  url: string
  imageUrl: string | null
  /** Source seller handle, when available. */
  seller: string | null
}

/** What a buylist is estimated to pay for one copy of a card, in cash. */
export type BuylistQuote = {
  cardName: string
  /** Scryfall market price the quote was derived from, in USD. */
  marketPrice: number
  /** Estimated cash buylist payout per copy, in USD. */
  cashPrice: number
  /** The buylist-to-market ratio applied (0..1). */
  ratio: number
  foil: boolean
  /** Human label for where the quote came from, e.g. "Heuristic (65% market)". */
  source: string
}

/** Knobs that shape the arbitrage math. All have sane defaults. */
export type ArbitrageConfig = {
  /**
   * Fraction of the asking price we assume a Best Offer will land at.
   * 0.8 => assume the seller accepts ~80% of their asking price.
   */
  offerRatio: number
  /** Minimum profit in USD for an opportunity to be considered worthwhile. */
  minProfitUsd: number
  /** Minimum margin (profit / acquisition cost) to surface, e.g. 0.25 = 25%. */
  minMarginPct: number
  /** Estimated cost to ship the card to the buylist, in USD. */
  sellShippingUsd: number
  /**
   * Inbound shipping assumption when a listing doesn't expose one, in USD.
   * Used as a fallback cost so estimates stay conservative.
   */
  assumedInboundShippingUsd: number
}

export const DEFAULT_ARBITRAGE_CONFIG: ArbitrageConfig = {
  offerRatio: 0.8,
  minProfitUsd: 3,
  minMarginPct: 0.2,
  sellShippingUsd: 1,
  assumedInboundShippingUsd: 1,
}

/** A computed buy-low / sell-to-buylist opportunity for one listing. */
export type ArbitrageOpportunity = {
  listing: EbayListing
  quote: BuylistQuote
  /** Offer we suggest sending on eBay (per the offer ratio), in USD. */
  suggestedOffer: number
  /** Suggested offer + inbound shipping, in USD. */
  acquisitionCost: number
  /** Gross buylist payout for the listing's quantity, in USD. */
  buylistPayout: number
  /** Payout minus outbound shipping to the buylist, in USD. */
  netSellback: number
  /** netSellback - acquisitionCost, in USD. Can be negative. */
  profit: number
  /** profit / acquisitionCost. Can be negative. */
  marginPct: number
  /**
   * Highest offer at which the deal still clears `minProfitUsd` — the
   * negotiating ceiling. Null when even a $0 offer can't clear the bar.
   */
  maxProfitableOffer: number | null
  /** True when profit >= minProfit AND margin >= minMargin. */
  profitable: boolean
}

export type ScanInput = {
  /** Free-text query, e.g. "mtg dual land" or a specific card name. */
  query: string
  config?: Partial<ArbitrageConfig>
  /** Cap on how many eBay listings to pull before filtering. */
  limit?: number
}

export type ScanResult = {
  query: string
  config: ArbitrageConfig
  /** Opportunities that cleared the thresholds, best margin first. */
  opportunities: ArbitrageOpportunity[]
  /** Everything evaluated (including unprofitable), best margin first. */
  evaluated: ArbitrageOpportunity[]
  /** How many raw listings the eBay provider returned. */
  listingsScanned: number
  /** True when eBay creds were absent/failed and sample data was used. */
  usingSampleData: boolean
  /** Names we couldn't match to Scryfall (and therefore couldn't price). */
  unpricedTitles: string[]
  notes: string[]
}
