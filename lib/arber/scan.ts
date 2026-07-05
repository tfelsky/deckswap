// Arb'r — scan orchestrator. Wires the providers together:
//   eBay Best Offer listings -> Scryfall market price -> buylist estimate ->
//   arbitrage engine -> ranked opportunities.
//
// This is the only module that does I/O for a scan, keeping the engine and
// buylist heuristic pure and testable.

import { fetchScryfallCollection, type ScryfallCard } from '@/lib/scryfall/enrich'
import { searchBestOfferListings } from './ebay'
import { estimateBuylistQuote } from './buylist'
import { rankOpportunities, resolveArbitrageConfig } from './arbitrage'
import type {
  ArbitrageOpportunity,
  BuylistQuote,
  EbayListing,
  ScanInput,
  ScanResult,
} from './types'

function normalizeName(name: string) {
  return name.trim().toLowerCase()
}

function frontFaceName(name: string) {
  return normalizeName(name.split('//')[0] ?? name)
}

function marketPriceFor(card: ScryfallCard, foil: boolean): number | null {
  const usd = card.prices?.usd ? Number(card.prices.usd) : null
  const usdFoil = card.prices?.usd_foil ? Number(card.prices.usd_foil) : null
  const usdEtched = card.prices?.usd_etched ? Number(card.prices.usd_etched) : null
  const value = foil ? usdFoil ?? usdEtched ?? usd : usd ?? usdFoil
  return value != null && Number.isFinite(value) ? value : null
}

/**
 * Run a full arbitrage scan for a query. Always resolves (eBay provider falls
 * back to sample data), so callers get a usable result even without API keys.
 */
export async function runArbitrageScan(input: ScanInput): Promise<ScanResult> {
  const query = input.query.trim()
  const config = resolveArbitrageConfig(input.config)

  const search = await searchBestOfferListings({ query, limit: input.limit })
  const listings = search.listings

  // Only Best Offer listings with a parsed name are actionable for arbitrage.
  const named = listings.filter((l) => l.cardName && l.bestOfferEnabled)
  const uniqueNames = [
    ...new Set(named.map((l) => (l.cardName as string).trim()).filter(Boolean)),
  ]

  const notes: string[] = []
  if (search.note) notes.push(search.note)

  let byName = new Map<string, ScryfallCard>()
  if (uniqueNames.length > 0) {
    try {
      const cards = await fetchScryfallCollection(
        uniqueNames.map((name) => ({ name }))
      )
      for (const card of cards) {
        byName.set(normalizeName(card.name), card)
        byName.set(frontFaceName(card.name), card)
      }
    } catch (error) {
      notes.push(
        `Scryfall pricing lookup failed (${
          error instanceof Error ? error.message : 'unknown error'
        }).`
      )
    }
  }

  const pairs: Array<{ listing: EbayListing; quote: BuylistQuote }> = []
  const unpricedTitles: string[] = []

  for (const listing of named) {
    const name = listing.cardName as string
    const card =
      byName.get(normalizeName(name)) ?? byName.get(frontFaceName(name))

    const marketPrice = card ? marketPriceFor(card, listing.foil) : null
    const quote = estimateBuylistQuote({
      cardName: card?.name ?? name,
      marketPrice,
      foil: listing.foil,
    })

    if (!quote) {
      unpricedTitles.push(listing.title)
      continue
    }
    pairs.push({ listing, quote })
  }

  const evaluated: ArbitrageOpportunity[] = rankOpportunities(pairs, config)
  const opportunities = evaluated.filter((o) => o.profitable)

  return {
    query,
    config,
    opportunities,
    evaluated,
    listingsScanned: listings.length,
    usingSampleData: search.usingSampleData,
    unpricedTitles,
    notes,
  }
}
