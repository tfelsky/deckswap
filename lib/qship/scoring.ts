// QShip — Desirability Index and member fit. Pure and deterministic.
//
// desirability = 0.35·Demand + 0.25·Market + 0.20·Scarcity + 0.10·Collector − 0.10·Risk
// (the weights from the Desirability Index upgrade path), rescaled to 0..100.
// Fit is a 0.5..1.5 multiplier for deck gaps and taste. Every scored copy
// also carries the slots it may fill in a box and the exclusion reasons when
// it may not be boxed at all.

import { CARD_CONDITIONS, type CardCondition } from '@/lib/decks/conditions'
import { computeCardValueSignals, type ValueSignal } from '@/lib/singles/value-signals'
import type {
  MarketSignal,
  QshipCardFacts,
  QshipExcludedCandidate,
  QshipExclusionReason,
  QshipFocusDeck,
  QshipInventoryCandidate,
  QshipMemberProfile,
  QshipScoredCandidate,
  QshipSlot,
  ScoreComponents,
} from './types'

export const DESIRABILITY_WEIGHTS = {
  demand: 0.35,
  market: 0.25,
  scarcity: 0.2,
  collector: 0.1,
  risk: -0.1,
} as const

// Highest raw value the weighted sum can reach (all positives at 100, risk 0).
const DESIRABILITY_MAX_RAW = 90

/** Cards under this are bulk; shipping and handling eat the value. */
export const MIN_BOXABLE_PRICE_USD = 1
/** A 7-day move above this is a spike we refuse to chase. */
export const SPIKE_EXCLUSION_7D = 0.5

const HOLD_MIN_DEMAND = 55
const HOLD_MAX_RISK = 30
const HOLD_MAX_ABS_MOMENTUM_30D = 0.25
const SPEC_MAX_RISK = 60
const SPEC_MOMENTUM_30D_RANGE: [number, number] = [0.05, 0.4]

const EDHREC_INCLUSION_SATURATION = 50
const EDHREC_DECK_COUNT_SATURATION = 200_000
const CEDH_SHARE_SATURATION = 30

// 8th Edition introduced the modern frame; see value-signals.ts.
const OLD_FRAME_ERA_END = Date.parse('2003-07-28')
const HIGH_SUPPLY_ERA_START = Date.parse('2019-10-01')

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function round2(value: number) {
  return Number(value.toFixed(2))
}

function parseDateMs(value?: string | null) {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalize(value?: string | null) {
  return String(value ?? '').trim().toLowerCase()
}

/** Fractional change from a past price to now; null when either is unknown. */
export function momentum(current: number | null | undefined, past: number | null | undefined) {
  if (current == null || past == null || !Number.isFinite(current) || !Number.isFinite(past)) {
    return null
  }
  if (past <= 0) return null
  return (current - past) / past
}

function hasSignal(signals: MarketSignal[] | null | undefined, kind: MarketSignal['kind']) {
  return (signals ?? []).some((signal) => signal.kind === kind)
}

function signalStrength(signals: MarketSignal[] | null | undefined, kind: MarketSignal['kind']) {
  return (signals ?? [])
    .filter((signal) => signal.kind === kind)
    .reduce((sum, signal) => sum + signal.strength, 0)
}

function findValueSignal(signals: ValueSignal[], kind: ValueSignal['kind']) {
  return signals.find((signal) => signal.kind === kind) ?? null
}

function derivedFrameTags(card: QshipCardFacts) {
  const tags = new Set((card.frameEffects ?? []).map(normalize))
  if (card.fullArt) tags.add('full_art')
  if (normalize(card.borderColor) === 'borderless') tags.add('borderless')
  const releasedMs = parseDateMs(card.releasedAt)
  if (releasedMs !== null && releasedMs < OLD_FRAME_ERA_END) tags.add('old_border')
  return tags
}

type Desirability = {
  components: ScoreComponents
  desirability: number
  pros: string[]
  cons: string[]
  momentum7d: number | null
  momentum30d: number | null
}

export function computeDesirability(
  card: QshipCardFacts,
  condition: CardCondition = 'near_mint',
  language = 'en'
): Desirability {
  const price = card.priceUsd
  const history = card.priceHistory ?? {}
  const m7 = momentum(price, history.d7)
  const m30 = momentum(price, history.d30)
  const m90 = momentum(price, history.d90)
  const valueSignals = computeCardValueSignals({
    cardName: card.cardName,
    setCode: card.setCode,
    setName: card.setName,
    releasedAt: card.releasedAt,
    rarity: card.rarity,
    foil: card.foil,
    finishes: card.finishes,
    oracleText: card.oracleText,
    typeLine: card.typeLine,
    keywords: card.keywords,
    cmc: card.cmc,
    condition,
    language,
    priceUsd: card.foil ? null : price,
    priceUsdFoil: card.foil ? price : null,
    commanderData: card.edhrec
      ? {
          commanderName: card.edhrec.commanderName,
          inclusionPercent: card.edhrec.inclusionPercent,
          edhrecRank: card.edhrec.rank,
          commanderDeckCount: card.edhrec.deckCount,
        }
      : null,
  })
  const setSignal = findValueSignal(valueSignals.signals, 'set')
  const earlyFoil = findValueSignal(valueSignals.signals, 'early_foil')
  const playable = findValueSignal(valueSignals.signals, 'playable')
  const staple = findValueSignal(valueSignals.signals, 'commander_staple')

  // Demand: how many real decks want the card.
  const breadth = Math.max(
    clamp(((card.cedhSharePercent ?? 0) / CEDH_SHARE_SATURATION) * 100),
    clamp(card.internalDemand ?? 0)
  )
  const inclusion = card.edhrec?.inclusionPercent
  const deckCount = card.edhrec?.deckCount
  let demand: number
  if (inclusion != null || deckCount != null) {
    const inclusionScore = clamp(((inclusion ?? 0) / EDHREC_INCLUSION_SATURATION) * 100)
    const deckScore =
      deckCount && deckCount > 1
        ? clamp((Math.log10(deckCount) / Math.log10(EDHREC_DECK_COUNT_SATURATION)) * 100)
        : 0
    demand = 0.45 * inclusionScore + 0.3 * deckScore + 0.25 * breadth
  } else {
    // No EDHREC data cached yet: lean on card-text heuristics.
    const textDemand = Math.max(
      playable ? (playable.strength === 'strong' ? 45 : 30) : 15,
      staple ? 30 : 15
    )
    demand = 0.75 * textDemand + 0.25 * breadth
  }

  // Market: momentum plus liquidity (a tight retail–buylist spread sells fast).
  let market = 50
  if (m30 !== null) market += clamp(m30, -0.5, 0.5) * 60
  if (m90 !== null) market += clamp(m90, -0.5, 0.5) * 20
  if (card.buylistUsd != null && price != null && price > 0) {
    market += (clamp(card.buylistUsd / price, 0.4, 0.8) - 0.6) * 50
  }
  market += clamp(signalStrength(card.signals, 'momentum'), -1, 1) * 10

  // Scarcity: fixed supply and how often the card gets reprinted.
  let scarcity = 40
  if (setSignal) scarcity += setSignal.strength === 'strong' ? 40 : 20
  if (card.reserved) scarcity += 20
  if (card.printingCount != null) {
    if (card.printingCount <= 1) scarcity += 15
    else if (card.printingCount >= 5) scarcity -= 15
  }
  const releasedMs = parseDateMs(card.releasedAt)
  if (releasedMs !== null && releasedMs >= HIGH_SUPPLY_ERA_START) scarcity -= 10

  // Collector: premium finishes and frames.
  let collector = 30
  if (earlyFoil) collector += earlyFoil.strength === 'strong' ? 40 : 20
  const frameTags = derivedFrameTags(card)
  if (['showcase', 'extendedart', 'etched', 'full_art', 'borderless'].some((tag) => frameTags.has(tag))) {
    collector += 15
  }
  if (setSignal) collector += 10

  // Risk: things that make the price fall or the card hard to resell.
  let risk = 0
  if (hasSignal(card.signals, 'reprint_risk')) risk += 60
  if (hasSignal(card.signals, 'spike')) risk += 20
  if (hasSignal(card.signals, 'rotation')) risk += 10
  if (m7 !== null && m7 > 0.25) risk += 20
  if (card.printingCount != null && card.printingCount >= 5) risk += 15
  if (earlyFoil?.strength === 'strong') risk += 10
  if (price != null && price < 2) risk += 15

  const components: ScoreComponents = {
    demand: round2(clamp(demand)),
    market: round2(clamp(market)),
    scarcity: round2(clamp(scarcity)),
    collector: round2(clamp(collector)),
    risk: round2(clamp(risk)),
  }
  const raw =
    DESIRABILITY_WEIGHTS.demand * components.demand +
    DESIRABILITY_WEIGHTS.market * components.market +
    DESIRABILITY_WEIGHTS.scarcity * components.scarcity +
    DESIRABILITY_WEIGHTS.collector * components.collector +
    DESIRABILITY_WEIGHTS.risk * components.risk

  const pros = valueSignals.signals.map((signal) => `${signal.label}: ${signal.detail}`)
  for (const signal of card.signals ?? []) {
    if (signal.kind === 'new_synergy' || signal.kind === 'meta_rise') pros.push(signal.detail)
  }
  const cons = valueSignals.cons.map((con) => `${con.label}: ${con.detail}`)
  for (const signal of card.signals ?? []) {
    if (signal.kind === 'reprint_risk' || signal.kind === 'spike' || signal.kind === 'rotation') {
      cons.push(signal.detail)
    }
  }

  return {
    components,
    desirability: round2(clamp((raw / DESIRABILITY_MAX_RAW) * 100)),
    pros,
    cons,
    momentum7d: m7,
    momentum30d: m30,
  }
}

function conditionRank(condition: CardCondition) {
  return CARD_CONDITIONS.indexOf(condition)
}

function isSubsetOf(identity: string[], deckIdentity: string[]) {
  const deck = new Set(deckIdentity.map((color) => color.toUpperCase()))
  return identity.every((color) => deck.has(color.toUpperCase()))
}

/** The focus deck this card would upgrade most, by commander inclusion. */
export function findDeckGap(card: QshipCardFacts, decks: QshipFocusDeck[]) {
  let best: { deck: QshipFocusDeck; inclusion: number } | null = null
  for (const deck of decks) {
    const inclusion = deck.gapInclusion[card.oracleId]
    if (inclusion == null) continue
    if (deck.cardOracleIds.includes(card.oracleId)) continue
    if (!isSubsetOf(card.colorIdentity, deck.colorIdentity)) continue
    if (!best || inclusion > best.inclusion) best = { deck, inclusion }
  }
  return best
}

export function computeFit(
  card: QshipCardFacts,
  member: QshipMemberProfile,
  deckGap: ReturnType<typeof findDeckGap>
) {
  const prefs = member.preferences
  let fit = 1
  if (deckGap) fit += 0.1 + 0.3 * Math.min(1, deckGap.inclusion / EDHREC_INCLUSION_SATURATION)
  if (card.artistName && prefs.favoriteArtists.map(normalize).includes(normalize(card.artistName))) {
    fit += 0.1
  }
  const frameTags = derivedFrameTags(card)
  if (prefs.framePrefs.some((pref) => frameTags.has(normalize(pref)))) fit += 0.05
  if (prefs.finishPref === 'foil') fit += card.foil ? 0.1 : -0.1
  if (prefs.finishPref === 'etched') {
    fit += (card.finishes ?? []).includes('etched') && card.foil ? 0.1 : -0.05
  }
  return round2(clamp(fit, 0.5, 1.5))
}

function exclusionReasons(
  candidate: QshipInventoryCandidate,
  member: QshipMemberProfile,
  deckGap: ReturnType<typeof findDeckGap>,
  momentum7d: number | null
): QshipExclusionReason[] {
  const { card } = candidate
  const prefs = member.preferences
  const reasons: QshipExclusionReason[] = []

  if (prefs.blockedOracleIds.includes(card.oracleId)) reasons.push('blocked_card')
  if (card.setCode && prefs.blockedSetCodes.map(normalize).includes(normalize(card.setCode))) {
    reasons.push('blocked_set')
  }
  if (card.artistName && prefs.blockedArtists.map(normalize).includes(normalize(card.artistName))) {
    reasons.push('blocked_artist')
  }
  if (conditionRank(candidate.condition) < conditionRank(prefs.minCondition)) {
    reasons.push('below_min_condition')
  }
  if (normalize(candidate.language || 'en') !== normalize(prefs.language || 'en')) {
    reasons.push('language')
  }
  if (prefs.finishPref === 'nonfoil' && card.foil) reasons.push('finish')
  if (card.priceUsd == null || !Number.isFinite(card.priceUsd)) reasons.push('unpriced')
  else if (card.priceUsd < MIN_BOXABLE_PRICE_USD) reasons.push('bulk_price')
  if (momentum7d !== null && momentum7d > SPIKE_EXCLUSION_7D) reasons.push('recent_spike')
  if (member.ownedOracleIds.includes(card.oracleId) && !deckGap) reasons.push('already_owned')

  return reasons
}

function eligibleSlots(
  card: QshipCardFacts,
  components: ScoreComponents,
  deckGap: ReturnType<typeof findDeckGap>,
  momentum30d: number | null
): QshipSlot[] {
  const slots: QshipSlot[] = []
  const reprintRisk = hasSignal(card.signals, 'reprint_risk')

  // Play picks are for the member's table; value risk doesn't disqualify them.
  if (deckGap) slots.push('play')

  if (
    !reprintRisk &&
    components.demand >= HOLD_MIN_DEMAND &&
    components.risk <= HOLD_MAX_RISK &&
    (momentum30d === null || Math.abs(momentum30d) <= HOLD_MAX_ABS_MOMENTUM_30D)
  ) {
    slots.push('hold')
  }

  const catalyst =
    hasSignal(card.signals, 'new_synergy') ||
    hasSignal(card.signals, 'meta_rise') ||
    signalStrength(card.signals, 'momentum') > 0 ||
    (momentum30d !== null &&
      momentum30d >= SPEC_MOMENTUM_30D_RANGE[0] &&
      momentum30d <= SPEC_MOMENTUM_30D_RANGE[1])
  if (!reprintRisk && components.risk <= SPEC_MAX_RISK && catalyst) slots.push('spec')

  return slots
}

export function scoreCandidate(
  candidate: QshipInventoryCandidate,
  member: QshipMemberProfile
): QshipScoredCandidate | QshipExcludedCandidate {
  const { card } = candidate
  const deckGap = findDeckGap(card, member.focusDecks)
  const desirability = computeDesirability(card, candidate.condition, candidate.language)
  const reasons = exclusionReasons(candidate, member, deckGap, desirability.momentum7d)
  if (reasons.length > 0) return { candidate, reasons }

  const fit = computeFit(card, member, deckGap)
  const pros = [...desirability.pros]
  if (deckGap) {
    const commander = deckGap.deck.commanderName
    pros.unshift(
      commander
        ? `Fills a gap in ${deckGap.deck.name}: ${deckGap.inclusion}% of ${commander} decks run it.`
        : `Fills a gap in ${deckGap.deck.name}.`
    )
  }

  return {
    ...candidate,
    marketPriceUsd: round2(card.priceUsd as number),
    components: desirability.components,
    desirability: desirability.desirability,
    fit,
    score: round2(desirability.desirability * fit),
    slots: eligibleSlots(card, desirability.components, deckGap, desirability.momentum30d),
    targetDeckId: deckGap?.deck.deckId ?? null,
    targetDeckName: deckGap?.deck.name ?? null,
    targetInclusionPercent: deckGap?.inclusion ?? null,
    pros,
    cons: desirability.cons,
  }
}

export function isExcluded(
  result: QshipScoredCandidate | QshipExcludedCandidate
): result is QshipExcludedCandidate {
  return 'reasons' in result
}

/** Score every copy for one member, best first. */
export function scoreCandidates(candidates: QshipInventoryCandidate[], member: QshipMemberProfile) {
  const scored: QshipScoredCandidate[] = []
  const excluded: QshipExcludedCandidate[] = []
  for (const candidate of candidates) {
    const result = scoreCandidate(candidate, member)
    if (isExcluded(result)) excluded.push(result)
    else scored.push(result)
  }
  scored.sort((a, b) => b.score - a.score)
  return { scored, excluded }
}
