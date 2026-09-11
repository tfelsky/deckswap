// QShip — shared types for the AI-curated monthly singles subscription.
//
// The flow: score every printing we can source (house pool or QShip Supply
// sellers) for desirability, weight it by how well it fits a member's decks
// and taste, then pack a box that hits the plan's market value inside the
// cost budget that keeps the box above its contribution floor.
//
// Everything here is plain data so the scoring, optimizer, pricing, and
// economics modules stay pure and deterministically testable.

import type { CardCondition } from '@/lib/decks/conditions'

export type QshipPlanKey = 'starter' | 'standard' | 'collector'
export type QshipBillingInterval = 'monthly' | 'annual'
export type QshipFulfillmentMode = 'vault_quarterly' | 'ship_monthly'
/** Mirrors the singles shipping lanes, plus an insured tracked option. */
export type QshipShippingLevel = 'pwe_untracked' | 'tracked_padded_mailer' | 'tracked_insured'
export type QshipRiskProfile = 'player' | 'balanced' | 'speculator'
export type QshipSlot = 'play' | 'hold' | 'spec'
export type QshipSourceChannel = 'pool' | 'supply'
export type QshipFinishPreference = 'nonfoil' | 'foil' | 'etched' | 'any'

export type QshipPlan = {
  key: QshipPlanKey
  label: string
  /** Market value of cards the member receives each month, in USD. */
  boxValueUsd: number
  /** Monthly-billing fee rate (0..1). Annual prepay takes a point off. */
  feeRate: number
  minCards: number
  maxCards: number
  /** Largest share of the box value any single card may take (0..1). */
  maxSingleCardShare: number
  /** Minimum contribution per box, in USD. Drives the optimizer's cost budget. */
  contributionFloorUsd: number
}

export type MarketSignalKind =
  | 'momentum'
  | 'reprint_risk'
  | 'new_synergy'
  | 'meta_rise'
  | 'rotation'
  | 'spike'

export type MarketSignal = {
  kind: MarketSignalKind
  /** Signed strength, roughly -1..1. Negative momentum means falling. */
  strength: number
  detail: string
  sourceUrl?: string | null
}

/** Price points for the same printing and finish N days ago, in USD. */
export type PriceHistory = {
  d7?: number | null
  d30?: number | null
  d90?: number | null
}

export type EdhrecStats = {
  commanderName?: string | null
  inclusionPercent?: number | null
  deckCount?: number | null
  rank?: number | null
}

/** Everything we know about one printing, independent of who holds it. */
export type QshipCardFacts = {
  scryfallId: string
  oracleId: string
  cardName: string
  setCode?: string | null
  setName?: string | null
  releasedAt?: string | null
  rarity?: string | null
  foil: boolean
  finishes?: string[] | null
  oracleText?: string | null
  typeLine?: string | null
  keywords?: string[] | null
  cmc?: number | null
  colorIdentity: string[]
  artistName?: string | null
  frameEffects?: string[] | null
  fullArt?: boolean | null
  borderColor?: string | null
  reserved?: boolean | null
  /** How many distinct printings of this oracle card exist. */
  printingCount?: number | null
  /** Market price for this printing and finish, in USD. */
  priceUsd: number | null
  priceHistory?: PriceHistory | null
  /** Real buylist cash price when a feed provides one, in USD. */
  buylistUsd?: number | null
  edhrec?: EdhrecStats | null
  /** Share of top cEDH decklists running the card, 0..100. */
  cedhSharePercent?: number | null
  /** Internal demand (watchlists, searches, clicks) normalized to 0..100. */
  internalDemand?: number | null
  signals?: MarketSignal[] | null
}

/** A copy QShip can put in a box: hub stock or a Supply seller's listing. */
export type QshipInventoryCandidate = {
  inventoryId: string
  channel: QshipSourceChannel
  /** What QShip pays (or paid) for the copy, in USD. */
  costBasisUsd: number
  condition: CardCondition
  language: string
  card: QshipCardFacts
}

export type QshipFocusDeck = {
  deckId: number
  name: string
  commanderName: string | null
  colorIdentity: string[]
  /** oracle ids already in the deck. */
  cardOracleIds: string[]
  /**
   * EDHREC recommendations for the deck's commander that the deck is missing,
   * keyed by oracle id, valued by inclusion percent for that commander.
   */
  gapInclusion: Record<string, number>
}

export type QshipPreferences = {
  finishPref: QshipFinishPreference
  /** Scryfall frame effects / treatments the member likes, e.g. 'showcase'. */
  framePrefs: string[]
  favoriteArtists: string[]
  blockedOracleIds: string[]
  blockedSetCodes: string[]
  blockedArtists: string[]
  minCondition: CardCondition
  language: string
}

export type QshipMemberProfile = {
  userId: string
  planKey: QshipPlanKey
  riskProfile: QshipRiskProfile
  focusDecks: QshipFocusDeck[]
  /** oracle ids in the member's collection, decks, or vault. */
  ownedOracleIds: string[]
  preferences: QshipPreferences
}

export type ScoreComponents = {
  demand: number
  market: number
  scarcity: number
  collector: number
  risk: number
}

export type QshipExclusionReason =
  | 'blocked_card'
  | 'blocked_set'
  | 'blocked_artist'
  | 'below_min_condition'
  | 'language'
  | 'finish'
  | 'unpriced'
  | 'bulk_price'
  | 'recent_spike'
  | 'already_owned'

export type QshipScoredCandidate = QshipInventoryCandidate & {
  marketPriceUsd: number
  components: ScoreComponents
  /** 0..100 Desirability Index. */
  desirability: number
  /** Per-member multiplier, 0.5..1.5. */
  fit: number
  /** desirability × fit. */
  score: number
  slots: QshipSlot[]
  targetDeckId: number | null
  targetDeckName: string | null
  /** Inclusion percent for the target deck's commander, when a deck gap. */
  targetInclusionPercent: number | null
  pros: string[]
  cons: string[]
}

export type QshipExcludedCandidate = {
  candidate: QshipInventoryCandidate
  reasons: QshipExclusionReason[]
}

export type QshipBundleStrategy = 'balanced' | 'deck_impact' | 'value'

export type QshipBundleItem = {
  candidate: QshipScoredCandidate
  slot: QshipSlot
}

export type QshipBundle = {
  strategy: QshipBundleStrategy
  items: QshipBundleItem[]
  marketValueUsd: number
  costBasisUsd: number
  slotValueUsd: Record<QshipSlot, number>
  cardCount: number
  totalScore: number
  violations: string[]
  valid: boolean
}
