import { fetchScryfallCollection, type ScryfallCard } from '@/lib/scryfall/enrich'

export type PriceEstimateInputCard = {
  name: string
  quantity: number
  foil?: boolean
}

export type DeckPriceEstimate = {
  totalUsd: number
  pricedCount: number
  unmatchedNames: string[]
}

function normalizeName(name: string) {
  return name.trim().toLowerCase()
}

function frontFaceName(name: string) {
  return normalizeName(name.split('//')[0] ?? name)
}

function unitPriceUsd(card: ScryfallCard, foil: boolean) {
  const usd = card.prices?.usd ? Number(card.prices.usd) : null
  const usdFoil = card.prices?.usd_foil ? Number(card.prices.usd_foil) : null
  return (foil ? usdFoil ?? usd : usd) ?? null
}

export async function estimateDeckPricesByName(
  cards: PriceEstimateInputCard[]
): Promise<DeckPriceEstimate> {
  const uniqueNames = [...new Set(cards.map((card) => card.name.trim()).filter(Boolean))]

  if (uniqueNames.length === 0) {
    return { totalUsd: 0, pricedCount: 0, unmatchedNames: [] }
  }

  const scryfallCards = await fetchScryfallCollection(
    uniqueNames.map((name) => ({ name }))
  )

  const byName = new Map<string, ScryfallCard>()
  for (const card of scryfallCards) {
    byName.set(normalizeName(card.name), card)
    byName.set(frontFaceName(card.name), card)
  }

  let totalUsd = 0
  let pricedCount = 0
  const unmatched = new Set<string>()

  for (const card of cards) {
    const match =
      byName.get(normalizeName(card.name)) ?? byName.get(frontFaceName(card.name))

    if (!match) {
      unmatched.add(card.name.trim())
      continue
    }

    const unit = unitPriceUsd(match, card.foil ?? false)
    if (unit == null) {
      unmatched.add(card.name.trim())
      continue
    }

    totalUsd += unit * Math.max(1, Number(card.quantity) || 1)
    pricedCount += 1
  }

  return {
    totalUsd: Number(totalUsd.toFixed(2)),
    pricedCount,
    unmatchedNames: [...unmatched],
  }
}
