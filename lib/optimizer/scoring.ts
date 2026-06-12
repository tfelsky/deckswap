export type OptimizerBranchId =
  | 'spend_less'
  | 'style_upgrade'
  | 'value_retention'
  | 'power_path'
  | 'watchlist'

export type OptimizerDeck = {
  id: number
  name: string
  commander?: string | null
  image_url?: string | null
  price_total_usd_foil?: number | null
}

export type OptimizerCardRow = {
  id: number
  deck_id?: number | null
  card_name: string
  section: 'commander' | 'mainboard' | 'sideboard' | 'token' | string
  quantity: number
  set_code?: string | null
  set_name?: string | null
  collector_number?: string | null
  foil?: boolean | null
  image_url?: string | null
  price_usd?: number | null
  price_usd_foil?: number | null
  price_usd_etched?: number | null
  rarity?: string | null
  type_line?: string | null
  oracle_text?: string | null
  cmc?: number | null
  released_at?: string | null
  finishes?: string[] | null
}

export type OptimizerOpportunity = {
  id: string
  cardId: number
  cardName: string
  branchId: OptimizerBranchId
  title: string
  reason: string
  nextAction: string
  confidence: 'Low' | 'Medium' | 'High'
  score: number
  priceUsd: number | null
  comparisonPriceUsd: number | null
  savingsUsd: number | null
  quantity: number
  imageUrl: string | null
  setCode: string | null
  setName: string | null
  collectorNumber: string | null
  tags: string[]
  styleScore: number
  retentionScore: number
  enjoymentScore: number
}

export type OptimizerBranch = {
  id: OptimizerBranchId
  label: string
  shortLabel: string
  description: string
  opportunities: OptimizerOpportunity[]
}

export type DeckOptimization = {
  deck: OptimizerDeck
  summary: {
    totalEstimatedUsd: number
    optimizedPlayableUsd: number
    potentialSavingsUsd: number
    pricedCards: number
    totalCards: number
    topScore: number
    styleUpgradeCount: number
    watchlistCount: number
  }
  topOpportunities: OptimizerOpportunity[]
  branches: OptimizerBranch[]
  allOpportunities: OptimizerOpportunity[]
}

export const OPTIMIZER_BRANCHES: Record<OptimizerBranchId, Omit<OptimizerBranch, 'opportunities'>> = {
  spend_less: {
    id: 'spend_less',
    label: 'Spend Less',
    shortLabel: 'Budget',
    description: 'Same deck, more efficient print choices.',
  },
  style_upgrade: {
    id: 'style_upgrade',
    label: 'Style Upgrade',
    shortLabel: 'Style',
    description: 'Foils, frames, and collector versions with a reasonable premium.',
  },
  value_retention: {
    id: 'value_retention',
    label: 'Value Retention',
    shortLabel: 'Stability',
    description: 'Broad-demand cards and printings that look steadier for a collection.',
  },
  power_path: {
    id: 'power_path',
    label: 'Power Path',
    shortLabel: 'Power',
    description: 'Cards worth prioritizing because they do real work in the deck.',
  },
  watchlist: {
    id: 'watchlist',
    label: 'Watchlist',
    shortLabel: 'Wait',
    description: 'Good cards where timing or premium looks less attractive right now.',
  },
}

const BROAD_DEMAND_NAMES = new Set([
  'arcane signet',
  'birds of paradise',
  'bloodstained mire',
  'breeding pool',
  'command tower',
  'cyclonic rift',
  'deflecting swat',
  'demonic tutor',
  'esper sentinel',
  'fierce guardianship',
  'heroic intervention',
  'lightning greaves',
  'mana crypt',
  'mana drain',
  'mystic remora',
  'path to exile',
  'polluted delta',
  'rhystic study',
  'scalding tarn',
  'skullclamp',
  'smothering tithe',
  'sol ring',
  'steam vents',
  'stomping ground',
  'swiftfoot boots',
  'swords to plowshares',
  "teferi's protection",
  'thoughtseize',
  'vampiric tutor',
  'verdant catacombs',
  'watery grave',
  'windswept heath',
  'wooded foothills',
])

const POWER_SIGNAL_NAMES = new Set([
  'arcane signet',
  'cyclonic rift',
  'demonic tutor',
  'fierce guardianship',
  'heroic intervention',
  'lightning greaves',
  'path to exile',
  'rhystic study',
  'skullclamp',
  'smothering tithe',
  'sol ring',
  'swords to plowshares',
  "teferi's protection",
  'vampiric tutor',
])

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function roundCurrency(value: number) {
  return Number(Math.max(0, value).toFixed(2))
}

function normalizeName(value: string) {
  return value.trim().toLowerCase()
}

function numericPrice(value?: number | null) {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null
}

function currentUnitPrice(card: OptimizerCardRow) {
  const nonfoil = numericPrice(card.price_usd)
  const foil = numericPrice(card.price_usd_foil)
  const etched = numericPrice(card.price_usd_etched)

  if (card.foil) return foil ?? etched ?? nonfoil
  return nonfoil ?? foil ?? etched
}

function playableUnitPrice(card: OptimizerCardRow) {
  const candidates = [card.price_usd, card.price_usd_foil, card.price_usd_etched]
    .map(numericPrice)
    .filter((value): value is number => value != null)

  if (candidates.length === 0) return null
  return Math.min(...candidates)
}

function ageInYears(releasedAt?: string | null) {
  if (!releasedAt) return 0
  const timestamp = Date.parse(releasedAt)
  if (!Number.isFinite(timestamp)) return 0
  const ageMs = Date.now() - timestamp
  return Math.max(0, ageMs / (365.25 * 24 * 60 * 60 * 1000))
}

function rarityScore(card: OptimizerCardRow) {
  switch (card.rarity) {
    case 'mythic':
      return 24
    case 'rare':
      return 16
    case 'uncommon':
      return 7
    default:
      return 3
  }
}

function isLand(card: OptimizerCardRow) {
  return card.type_line?.toLowerCase().includes('land') ?? false
}

function isInteraction(card: OptimizerCardRow) {
  const oracle = card.oracle_text?.toLowerCase() ?? ''
  return (
    oracle.includes('counter target') ||
    oracle.includes('destroy target') ||
    oracle.includes('exile target') ||
    oracle.includes('prevent all damage') ||
    oracle.includes('hexproof') ||
    oracle.includes('indestructible')
  )
}

function isRamp(card: OptimizerCardRow) {
  const oracle = card.oracle_text?.toLowerCase() ?? ''
  const typeLine = card.type_line?.toLowerCase() ?? ''
  return (
    oracle.includes('add one mana') ||
    oracle.includes('add two mana') ||
    oracle.includes('search your library for a land') ||
    typeLine.includes('artifact') && oracle.includes('add ')
  )
}

function stapleScore(card: OptimizerCardRow) {
  const name = normalizeName(card.card_name)
  let score = BROAD_DEMAND_NAMES.has(name) ? 68 : 0

  if (isLand(card)) score += 12
  if (isInteraction(card)) score += 10
  if (isRamp(card)) score += 12
  if (Number(card.cmc ?? 99) <= 2 && (isInteraction(card) || isRamp(card))) score += 8

  return clamp(score)
}

function styleScore(card: OptimizerCardRow) {
  const nonfoil = numericPrice(card.price_usd)
  const foil = numericPrice(card.price_usd_foil)
  const finishes = card.finishes ?? []
  const setName = card.set_name?.toLowerCase() ?? ''
  let score = 20

  if (finishes.includes('foil')) score += 16
  if (card.foil) score += 12
  if (setName.includes('showcase') || setName.includes('retro') || setName.includes('special')) {
    score += 14
  }

  if (nonfoil && foil) {
    const premium = foil / nonfoil
    if (premium <= 1.25) score += 28
    else if (premium <= 1.5) score += 20
    else if (premium <= 2) score += 8
  }

  return clamp(score)
}

function retentionScore(card: OptimizerCardRow) {
  const price = currentUnitPrice(card) ?? 0
  const age = ageInYears(card.released_at)
  const score =
    stapleScore(card) * 0.55 +
    rarityScore(card) +
    Math.min(18, age * 1.6) +
    (price >= 10 ? 12 : price >= 4 ? 6 : 0)

  return clamp(score)
}

function enjoymentScore(card: OptimizerCardRow) {
  const name = normalizeName(card.card_name)
  let score = 35

  if (card.section === 'commander') score += 32
  if (POWER_SIGNAL_NAMES.has(name)) score += 22
  if (isInteraction(card) || isRamp(card)) score += 10
  if (Number(card.cmc ?? 99) <= 3) score += 6

  return clamp(score)
}

function inferredRoleAnchor(card: OptimizerCardRow) {
  const age = ageInYears(card.released_at)
  return (
    1.5 +
    rarityScore(card) * 0.2 +
    stapleScore(card) * 0.08 +
    Math.min(6, age * 0.45) +
    (isLand(card) ? 1.5 : 0)
  )
}

function confidenceFromScore(score: number): OptimizerOpportunity['confidence'] {
  if (score >= 76) return 'High'
  if (score >= 48) return 'Medium'
  return 'Low'
}

function baseOpportunity(
  card: OptimizerCardRow,
  branchId: OptimizerBranchId,
  title: string,
  reason: string,
  nextAction: string,
  score: number,
  comparisonPriceUsd: number | null = null,
  savingsUsd: number | null = null,
  tags: string[] = []
): OptimizerOpportunity {
  const titleKey = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return {
    id: `${branchId}-${card.id}-${titleKey}`,
    cardId: card.id,
    cardName: card.card_name,
    branchId,
    title,
    reason,
    nextAction,
    confidence: confidenceFromScore(score),
    score: Math.round(clamp(score)),
    priceUsd: currentUnitPrice(card),
    comparisonPriceUsd,
    savingsUsd,
    quantity: Number(card.quantity ?? 1),
    imageUrl: card.image_url ?? null,
    setCode: card.set_code ?? null,
    setName: card.set_name ?? null,
    collectorNumber: card.collector_number ?? null,
    tags,
    styleScore: Math.round(styleScore(card)),
    retentionScore: Math.round(retentionScore(card)),
    enjoymentScore: Math.round(enjoymentScore(card)),
  }
}

function buildOpportunitiesForCard(card: OptimizerCardRow): OptimizerOpportunity[] {
  const opportunities: OptimizerOpportunity[] = []
  const current = currentUnitPrice(card)
  const playable = playableUnitPrice(card)
  const nonfoil = numericPrice(card.price_usd)
  const foil = numericPrice(card.price_usd_foil)
  const quantity = Number(card.quantity ?? 1)
  const staple = stapleScore(card)
  const style = styleScore(card)
  const retention = retentionScore(card)
  const enjoyment = enjoymentScore(card)

  if (current && playable && current > playable * 1.08) {
    const savings = roundCurrency((current - playable) * quantity)
    opportunities.push(
      baseOpportunity(
        card,
        'spend_less',
        'Cheaper playable printing',
        `This deck copy prices above the lowest available finish we can see, with about $${savings.toFixed(2)} in deck-level savings.`,
        'Use the marketplace buttons to compare the lowest playable printing before buying.',
        clamp(48 + savings * 5 + (current > 12 ? 10 : 0)),
        playable,
        savings,
        ['same card', 'lower cost']
      )
    )
  }

  if (!card.foil && nonfoil && foil && foil > nonfoil) {
    const premium = foil / nonfoil
    const delta = foil - nonfoil

    if (premium <= 1.55 || delta <= 6) {
      opportunities.push(
        baseOpportunity(
          card,
          'style_upgrade',
          'Low-premium style upgrade',
          `The foil gap is about ${premium.toFixed(1)}x the nonfoil price, which is modest for a deck-visible upgrade.`,
          'Compare foil and nonfoil listings; this is a style buy, not a promise of resale value.',
          clamp(42 + style * 0.45 + retention * 0.15 - Math.max(0, premium - 1.2) * 18),
          foil,
          null,
          ['foil option', 'style']
        )
      )
    }
  }

  if (current) {
    const anchor = inferredRoleAnchor(card)
    const gap = anchor > 0 ? (anchor - current) / anchor : 0

    if (gap > 0.18 || current <= 2.5) {
      opportunities.push(
        baseOpportunity(
          card,
          'spend_less',
          current <= 2.5 ? 'Budget pickup window' : 'Below role benchmark',
          current <= 2.5
            ? 'The card is inexpensive enough that shipping, condition, and seller consolidation may matter more than tiny price changes.'
            : 'Current visible pricing is below our role benchmark until deeper historical feeds are connected.',
          'Bundle this with nearby buys instead of chasing a single lowest listing.',
          clamp(34 + gap * 60 + enjoyment * 0.18),
          roundCurrency(anchor),
          null,
          ['timing', 'budget']
        )
      )
    }
  }

  if (staple >= 50 || retention >= 62) {
    opportunities.push(
      baseOpportunity(
        card,
        'value_retention',
        'Broad-demand deck staple',
        'This card shows repeatable deck utility, which makes the printing choice more important than a one-off novelty buy.',
        'Favor clean condition, recognizable printings, and sellers with enough inventory to complete the order.',
        clamp(36 + retention * 0.55 + staple * 0.22),
        null,
        null,
        ['staple', 'collection fit']
      )
    )
  }

  if (enjoyment >= 58) {
    opportunities.push(
      baseOpportunity(
        card,
        'power_path',
        card.section === 'commander' ? 'Commander-facing upgrade' : 'High-impact deck piece',
        card.section === 'commander'
          ? 'Commander printings carry more table identity, so art and finish choices matter more here.'
          : 'This card is likely to affect actual games, so it belongs near the front of the upgrade path.',
        'Pick the version you will enjoy seeing repeatedly, then sanity-check price across marketplaces.',
        clamp(30 + enjoyment * 0.58 + style * 0.12),
        null,
        null,
        ['gameplay', 'deck fit']
      )
    )
  }

  if (current && ((foil && nonfoil && foil / nonfoil > 2.4) || current >= 35)) {
    opportunities.push(
      baseOpportunity(
        card,
        'watchlist',
        'Waitlist the premium',
        'The visible price or premium gap is high enough that this is better treated as a watch item before buying.',
        'Add it to the watchlist branch and revisit after more price-history data is available.',
        clamp(38 + Math.min(35, current) + (foil && nonfoil ? Math.min(20, foil / nonfoil * 4) : 0)),
        nonfoil,
        null,
        ['watch', 'premium risk']
      )
    )
  }

  return opportunities
}

function selectTopOpportunities(opportunities: OptimizerOpportunity[]) {
  const sorted = [...opportunities].sort((a, b) => b.score - a.score)
  const selected: OptimizerOpportunity[] = []
  const usedCards = new Set<number>()
  const branchCounts = new Map<OptimizerBranchId, number>()

  for (const opportunity of sorted) {
    if (selected.length >= 5) break
    if (usedCards.has(opportunity.cardId)) continue
    if ((branchCounts.get(opportunity.branchId) ?? 0) >= 2) continue

    selected.push(opportunity)
    usedCards.add(opportunity.cardId)
    branchCounts.set(opportunity.branchId, (branchCounts.get(opportunity.branchId) ?? 0) + 1)
  }

  if (selected.length < 5) {
    for (const opportunity of sorted) {
      if (selected.length >= 5) break
      if (selected.some((item) => item.id === opportunity.id)) continue
      selected.push(opportunity)
    }
  }

  return selected
}

export function buildDeckOptimization(deck: OptimizerDeck, cards: OptimizerCardRow[]): DeckOptimization {
  const playableCards = cards.filter((card) => card.section !== 'token')
  const allOpportunities = playableCards.flatMap(buildOpportunitiesForCard)
  const topOpportunities = selectTopOpportunities(allOpportunities)
  const branchList = Object.values(OPTIMIZER_BRANCHES).map((branch) => ({
    ...branch,
    opportunities: allOpportunities
      .filter((opportunity) => opportunity.branchId === branch.id)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5),
  }))

  const totalEstimatedUsd = playableCards.reduce((sum, card) => {
    const price = currentUnitPrice(card)
    return sum + (price ? price * Number(card.quantity ?? 1) : 0)
  }, 0)
  const optimizedPlayableUsd = playableCards.reduce((sum, card) => {
    const price = playableUnitPrice(card) ?? currentUnitPrice(card)
    return sum + (price ? price * Number(card.quantity ?? 1) : 0)
  }, 0)
  const pricedCards = playableCards.filter((card) => currentUnitPrice(card) != null).length
  const totalCards = playableCards.reduce((sum, card) => sum + Number(card.quantity ?? 0), 0)

  return {
    deck,
    summary: {
      totalEstimatedUsd: roundCurrency(totalEstimatedUsd),
      optimizedPlayableUsd: roundCurrency(optimizedPlayableUsd),
      potentialSavingsUsd: roundCurrency(Math.max(0, totalEstimatedUsd - optimizedPlayableUsd)),
      pricedCards,
      totalCards,
      topScore: topOpportunities[0]?.score ?? 0,
      styleUpgradeCount: allOpportunities.filter((item) => item.branchId === 'style_upgrade').length,
      watchlistCount: allOpportunities.filter((item) => item.branchId === 'watchlist').length,
    },
    topOpportunities,
    branches: branchList,
    allOpportunities,
  }
}
