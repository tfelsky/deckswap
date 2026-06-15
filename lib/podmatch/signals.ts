// PodMatch scoring signals.
//
// These are the deterministic, explainable building blocks the scoring engine
// (lib/podmatch/scoring.ts) consumes. Wherever the existing Commander bracket
// engine already maintains a curated list (Game Changers, extra turns, mass
// land denial, cEDH signals) we reuse it directly so there is a single source
// of truth. The remaining categories from the PodMatch spec (tutors, fast
// mana, ramp, interaction, combo pieces) are detected with a mix of small
// curated staple lists plus oracle-text heuristics so scores degrade
// gracefully on cards we have not hand-listed.

import {
  CEDH_SIGNAL_SET,
  EXTRA_TURN_NAMES,
  GAME_CHANGER_NAMES,
  MASS_LAND_DENIAL_NAMES,
} from '@/lib/commander/brackets'

export type SignalCard = {
  card_name: string
  section: 'commander' | 'mainboard' | 'sideboard' | 'token' | string
  quantity: number
  type_line?: string | null
  oracle_text?: string | null
  cmc?: number | null
  mana_cost?: string | null
  color_identity?: string[] | null
  price_usd?: number | string | null
  price_usd_foil?: number | string | null
  rarity?: string | null
}

function norm(name: string) {
  return name.trim().toLowerCase()
}

function lc(text?: string | null) {
  return (text ?? '').toLowerCase()
}

export function isLand(card: SignalCard) {
  return lc(card.type_line).includes('land')
}

export function isBasicLand(card: SignalCard) {
  return lc(card.type_line).includes('basic') && isLand(card)
}

/**
 * Cards that actually contribute to deck identity for scoring purposes:
 * the commander(s) plus the mainboard. Tokens and sideboard/maybeboard are
 * excluded, matching getCommanderBracketSummary().
 */
export function scoringCards(cards: SignalCard[]) {
  return cards.filter(
    (card) => card.section !== 'token' && card.section !== 'sideboard'
  )
}

// ---------------------------------------------------------------------------
// Curated staple lists. Kept intentionally small — oracle-text heuristics do
// most of the work; these catch high-signal cards whose text is ambiguous.
// ---------------------------------------------------------------------------

const FAST_MANA = new Set(
  [
    'Sol Ring',
    'Mana Crypt',
    'Mana Vault',
    'Chrome Mox',
    'Mox Diamond',
    'Mox Opal',
    'Mox Amber',
    'Jeweled Lotus',
    'Lotus Petal',
    'Lotus Bloom',
    'Black Lotus',
    'Grim Monolith',
    'Basalt Monolith',
    "Lion's Eye Diamond",
    'Dark Ritual',
    'Cabal Ritual',
    'Jeska’s Will',
    "Jeska's Will",
    'Simian Spirit Guide',
    'Elvish Spirit Guide',
  ].map(norm)
)

const TUTOR_STAPLES = new Set(
  [
    'Demonic Tutor',
    'Vampiric Tutor',
    'Imperial Seal',
    'Mystical Tutor',
    'Enlightened Tutor',
    'Worldly Tutor',
    'Sylvan Tutor',
    'Gamble',
    'Diabolic Intent',
    'Grim Tutor',
    'Wishclaw Talisman',
    'Tainted Pact',
    'Demonic Consultation',
    'Finale of Devastation',
    'Chord of Calling',
    'Green Sun’s Zenith',
    "Green Sun's Zenith",
    'Eladamri’s Call',
    "Eladamri's Call",
    'Idyllic Tutor',
    'Solve the Equation',
    'Fabricate',
    'Whir of Invention',
    'Tinker',
    'Survival of the Fittest',
    'Natural Order',
  ].map(norm)
)

const COMBO_PIECES = new Set(
  [
    "Thassa's Oracle",
    'Demonic Consultation',
    'Tainted Pact',
    'Laboratory Maniac',
    'Jace, Wielder of Mysteries',
    'Isochron Scepter',
    'Dramatic Reversal',
    'Kiki-Jiki, Mirror Breaker',
    'Splinter Twin',
    'Dualcaster Mage',
    'Deceiver Exarch',
    'Pestermite',
    'Devoted Druid',
    'Vizier of Remedies',
    'Heliod, Sun-Crowned',
    'Walking Ballista',
    'Mikaeus, the Unhallowed',
    'Triskelion',
    'Underworld Breach',
    'Lion’s Eye Diamond',
    "Lion's Eye Diamond",
    'Ad Nauseam',
    'Aetherflux Reservoir',
    'Bolas’s Citadel',
    "Bolas's Citadel",
    'Food Chain',
    'Eternal Scourge',
    'Squee, the Immortal',
    'Protean Hulk',
    'Najeela, the Blade-Blossom',
    'Helm of the Host',
    'Worldgorger Dragon',
    'Animate Dead',
    'Sanguine Bond',
    'Exquisite Blood',
    'Mind Over Matter',
    'Temur Sabertooth',
  ].map(norm)
)

const THEFT_STAPLES = new Set(
  [
    'Expropriate',
    'Insurrection',
    'Blatant Thievery',
    'Mass Manipulation',
    'Aminatou, the Fateshifter',
  ].map(norm)
)

// ---------------------------------------------------------------------------
// Oracle-text heuristics.
// ---------------------------------------------------------------------------

const TUTOR_TEXT = /search your library for (?:a|an|up to|two|three|that)/i
// Land fetch (fetchlands / ramp) should not count as a consistency tutor.
const LAND_FETCH_TEXT = /search your library for (?:a|up to (?:one|two|three)|two|three)?\s*(?:basic )?(?:land|plains|island|swamp|mountain|forest)/i

const RAMP_LAND_TEXT = /search your library for .*\bland\b/i
const ADD_MANA_TEXT = /add (?:\{|one|two|three|that much)/i

const REMOVAL_TEXT = /(destroy target|exile target (?:creature|permanent|artifact|enchantment|player|nonland)|deals? \d+ damage to (?:target|any))/i
const COUNTER_TEXT = /counter target (?:spell|ability)/i
const BOARD_WIPE_TEXT = /(destroy all|exile all|each (?:creature|player sacrifices)|all creatures get -)/i
const GRAVE_HATE_TEXT = /(exile (?:all cards from|target player's graveyard)|graveyards?\b.*exile|cards? in (?:all|each) graveyard)/i

const HEAVY_DISCARD_TEXT = /(each (?:opponent|player) discards|target player discards (?:their hand|\d))/i
const THEFT_TEXT = /gain control of (?:target|all|each|enchanted)/i
const STAX_TEXT = /(spells? cost \{?\d|players can't|don't untap|skip (?:your|their) (?:untap|draw)|can't (?:untap|cast|search))/i

// ---------------------------------------------------------------------------
// Detectors. Each returns the matched card names so the engine can build
// human-readable "drivers". A card counted once regardless of quantity (a
// singleton-format deck rarely runs duplicates, and multiples shouldn't
// over-weight a signal).
// ---------------------------------------------------------------------------

function collectByName(cards: SignalCard[], set: Set<string>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const card of cards) {
    const key = norm(card.card_name)
    if (set.has(key) && !seen.has(key)) {
      seen.add(key)
      out.push(card.card_name)
    }
  }
  return out
}

function collectByText(
  cards: SignalCard[],
  match: (card: SignalCard) => boolean
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const card of cards) {
    const key = norm(card.card_name)
    if (seen.has(key)) continue
    if (match(card)) {
      seen.add(key)
      out.push(card.card_name)
    }
  }
  return out
}

function union(...lists: string[][]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const list of lists) {
    for (const name of list) {
      const key = norm(name)
      if (!seen.has(key)) {
        seen.add(key)
        out.push(name)
      }
    }
  }
  return out
}

export function detectTutors(cards: SignalCard[]): string[] {
  const text = collectByText(cards, (card) => {
    const oracle = lc(card.oracle_text)
    if (!TUTOR_TEXT.test(oracle)) return false
    // Exclude pure land-fetch ramp; those are counted as ramp instead.
    if (LAND_FETCH_TEXT.test(oracle) && !/search your library for (?:a card|two cards|any)/i.test(oracle)) {
      return false
    }
    return true
  })
  return union(collectByName(cards, TUTOR_STAPLES), text)
}

export function detectFastMana(cards: SignalCard[]): string[] {
  return collectByName(cards, FAST_MANA)
}

export function detectCheapRocks(cards: SignalCard[]): string[] {
  return collectByText(cards, (card) => {
    const type = lc(card.type_line)
    if (!type.includes('artifact')) return false
    if (typeof card.cmc !== 'number' || card.cmc > 2) return false
    return ADD_MANA_TEXT.test(lc(card.oracle_text))
  })
}

export function detectRamp(cards: SignalCard[]): string[] {
  return collectByText(cards, (card) => {
    if (isLand(card)) return false
    const oracle = lc(card.oracle_text)
    return RAMP_LAND_TEXT.test(oracle) || ADD_MANA_TEXT.test(oracle)
  })
}

export function detectInteraction(cards: SignalCard[]): {
  removal: string[]
  counters: string[]
  wipes: string[]
  graveHate: string[]
} {
  return {
    removal: collectByText(cards, (card) => REMOVAL_TEXT.test(lc(card.oracle_text))),
    counters: collectByText(cards, (card) => COUNTER_TEXT.test(lc(card.oracle_text))),
    wipes: collectByText(cards, (card) => BOARD_WIPE_TEXT.test(lc(card.oracle_text))),
    graveHate: collectByText(cards, (card) => GRAVE_HATE_TEXT.test(lc(card.oracle_text))),
  }
}

export function detectComboPieces(cards: SignalCard[]): string[] {
  return collectByName(cards, COMBO_PIECES)
}

export function detectExtraTurns(cards: SignalCard[]): string[] {
  return collectByName(cards, EXTRA_TURN_NAMES)
}

export function detectMassLandDenial(cards: SignalCard[]): string[] {
  return collectByName(cards, MASS_LAND_DENIAL_NAMES)
}

export function detectStax(cards: SignalCard[]): string[] {
  return collectByText(cards, (card) => STAX_TEXT.test(lc(card.oracle_text)))
}

export function detectTheft(cards: SignalCard[]): string[] {
  return union(
    collectByName(cards, THEFT_STAPLES),
    collectByText(cards, (card) => THEFT_TEXT.test(lc(card.oracle_text)))
  )
}

export function detectHeavyDiscard(cards: SignalCard[]): string[] {
  return collectByText(cards, (card) => HEAVY_DISCARD_TEXT.test(lc(card.oracle_text)))
}

export function detectGameChangers(cards: SignalCard[]): string[] {
  const set = new Set(GAME_CHANGER_NAMES.map(norm))
  return collectByName(cards, set)
}

export function detectCedhSignals(cards: SignalCard[]): string[] {
  return collectByName(cards, CEDH_SIGNAL_SET)
}

// Card draw / advantage, used for the consistency score.
const CARD_DRAW_TEXT = /(draw (?:a card|two|three|\d+ cards|cards equal)|whenever .* draw)/i
export function detectCardDraw(cards: SignalCard[]): string[] {
  return collectByText(cards, (card) => CARD_DRAW_TEXT.test(lc(card.oracle_text)))
}

// ---------------------------------------------------------------------------
// Numeric helpers.
// ---------------------------------------------------------------------------

export function priceOf(card: SignalCard): number {
  const usd = typeof card.price_usd === 'string' ? Number(card.price_usd) : card.price_usd
  const foil =
    typeof card.price_usd_foil === 'string' ? Number(card.price_usd_foil) : card.price_usd_foil
  const value = usd ?? foil ?? 0
  return Number.isFinite(value) ? (value as number) : 0
}

export function totalDeckValue(cards: SignalCard[]): number {
  return scoringCards(cards).reduce(
    (sum, card) => sum + priceOf(card) * Math.max(1, card.quantity || 1),
    0
  )
}

export function highValueCards(cards: SignalCard[], threshold = 25): string[] {
  return scoringCards(cards)
    .filter((card) => priceOf(card) >= threshold)
    .map((card) => card.card_name)
}

/** Average mana value of nonland cards (the curve that matters for speed). */
export function averageManaValue(cards: SignalCard[]): number {
  const nonland = scoringCards(cards).filter(
    (card) => !isLand(card) && typeof card.cmc === 'number'
  )
  if (nonland.length === 0) return 0
  const total = nonland.reduce((sum, card) => sum + Number(card.cmc), 0)
  return total / nonland.length
}

export function commanderManaValue(cards: SignalCard[]): number | null {
  const commanders = cards.filter((card) => card.section === 'commander')
  if (commanders.length === 0) return null
  const withCmc = commanders.filter((card) => typeof card.cmc === 'number')
  if (withCmc.length === 0) return null
  return withCmc.reduce((sum, card) => sum + Number(card.cmc), 0) / withCmc.length
}
