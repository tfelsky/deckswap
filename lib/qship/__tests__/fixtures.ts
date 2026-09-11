import type {
  QshipCardFacts,
  QshipFocusDeck,
  QshipInventoryCandidate,
  QshipMemberProfile,
  QshipScoredCandidate,
  QshipSlot,
} from '../types'

export function card(partial: Partial<QshipCardFacts> = {}): QshipCardFacts {
  const oracleId = partial.oracleId ?? 'oracle-x'
  return {
    scryfallId: `scry-${oracleId}`,
    oracleId,
    cardName: `Card ${oracleId}`,
    setCode: 'cmm',
    setName: 'Commander Masters',
    releasedAt: '2023-08-04',
    rarity: 'rare',
    foil: false,
    finishes: ['nonfoil'],
    oracleText: 'Tap: Add one mana of any color.',
    typeLine: 'Artifact',
    keywords: [],
    cmc: 2,
    colorIdentity: [],
    artistName: 'Test Artist',
    priceUsd: 5,
    priceHistory: { d7: 5, d30: 5, d90: 5 },
    edhrec: { commanderName: 'Test Commander', inclusionPercent: 40, deckCount: 50_000 },
    signals: [],
    ...partial,
  }
}

export function candidate(
  inventoryId: string,
  cardPartial: Partial<QshipCardFacts> = {},
  partial: Partial<QshipInventoryCandidate> = {}
): QshipInventoryCandidate {
  const facts = card({ oracleId: `oracle-${inventoryId}`, ...cardPartial })
  return {
    inventoryId,
    channel: 'pool',
    costBasisUsd: Number(((facts.priceUsd ?? 0) * 0.62).toFixed(2)),
    condition: 'near_mint',
    language: 'en',
    card: facts,
    ...partial,
  }
}

export const deck: QshipFocusDeck = {
  deckId: 7,
  name: 'Golgari Graveyard',
  commanderName: 'Test Commander',
  colorIdentity: ['B', 'G'],
  cardOracleIds: ['oracle-in-deck'],
  gapInclusion: { 'oracle-gap': 42, 'oracle-gap-red': 50 },
}

export function member(partial: Partial<QshipMemberProfile> = {}): QshipMemberProfile {
  return {
    userId: 'user-1',
    planKey: 'standard',
    riskProfile: 'balanced',
    focusDecks: [deck],
    ownedOracleIds: [],
    ...partial,
    preferences: {
      finishPref: 'any',
      framePrefs: [],
      favoriteArtists: [],
      blockedOracleIds: [],
      blockedSetCodes: [],
      blockedArtists: [],
      minCondition: 'light_play',
      language: 'en',
      ...(partial.preferences ?? {}),
    },
  }
}

/** A pre-scored candidate for optimizer tests, bypassing the scoring model. */
export function scored(
  inventoryId: string,
  args: {
    price: number
    slots: QshipSlot[]
    score?: number
    desirability?: number
    channel?: 'pool' | 'supply'
    costRatio?: number
  }
): QshipScoredCandidate {
  const base = candidate(inventoryId, { priceUsd: args.price })
  const score = args.score ?? 50
  return {
    ...base,
    channel: args.channel ?? 'pool',
    costBasisUsd: Number((args.price * (args.costRatio ?? 0.62)).toFixed(2)),
    marketPriceUsd: args.price,
    components: { demand: 50, market: 50, scarcity: 50, collector: 50, risk: 0 },
    desirability: args.desirability ?? score,
    fit: 1,
    score,
    slots: args.slots,
    targetDeckId: args.slots.includes('play') ? 7 : null,
    targetDeckName: args.slots.includes('play') ? 'Golgari Graveyard' : null,
    targetInclusionPercent: args.slots.includes('play') ? 40 : null,
    pros: [],
    cons: [],
  }
}
