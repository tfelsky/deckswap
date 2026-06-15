// PodMatch data access. Reads the user's existing decks + enriched deck_cards
// and persists computed scores into the deck_scores cache table.

import type { DeckScore, ScoreExplanation } from './scoring'
import type { RuleZeroProfile } from './rule-zero'
import type { SignalCard } from './signals'
import type { PodDeck } from './pods'

type SupabaseLike = any

export type PodmatchDeck = {
  id: number
  name: string
  commander: string | null
  format: string | null
  image_url: string | null
  proxy_count?: number | null
}

export type DeckScoreRow = {
  deck_id: number
  overall_power: number | null
  speed: number | null
  consistency: number | null
  interaction: number | null
  combo_density: number | null
  tutor_density: number | null
  salt: number | null
  budget_pressure: number | null
  casual_friction: number | null
  explanation: ScoreExplanation | null
  rule_zero: RuleZeroProfile | null
  calculated_at: string | null
}

const DECK_SELECT = 'id, name, commander, format, image_url'
const CARD_SELECT =
  'card_name, section, quantity, type_line, oracle_text, cmc, mana_cost, color_identity, price_usd, price_usd_foil, price_usd_etched, rarity'

/** True when the failure is "deck_scores table/columns are missing". */
export function isDeckScoresSchemaMissing(message?: string | null): boolean {
  if (!message) return false
  return (
    message.includes("relation \"public.deck_scores\"") ||
    message.includes("'public.deck_scores'") ||
    message.includes('deck_scores') &&
      (message.includes('does not exist') ||
        message.includes('Could not find') ||
        message.includes('schema cache'))
  )
}

export const DECK_SCORES_SETUP_MESSAGE =
  'PodMatch needs the deck_scores table. Run the latest Supabase migration ' +
  '(supabase/migrations/..._create_podmatch_deck_scores.sql), then try again.'

export async function getUserDecksWithScores(
  supabase: SupabaseLike,
  userId: string
): Promise<{ decks: PodmatchDeck[]; scores: Map<number, DeckScoreRow>; schemaMissing: boolean }> {
  const { data: deckData, error: deckError } = await supabase
    .from('decks')
    .select(DECK_SELECT)
    .eq('user_id', userId)
    .order('id', { ascending: false })

  if (deckError) throw new Error(deckError.message)

  const decks = (deckData ?? []) as PodmatchDeck[]
  const deckIds = decks.map((deck) => deck.id)

  const scores = new Map<number, DeckScoreRow>()
  let schemaMissing = false

  if (deckIds.length) {
    const { data: scoreData, error: scoreError } = await supabase
      .from('deck_scores')
      .select('*')
      .in('deck_id', deckIds)

    if (scoreError) {
      if (isDeckScoresSchemaMissing(scoreError.message)) {
        schemaMissing = true
      } else {
        throw new Error(scoreError.message)
      }
    } else {
      for (const row of (scoreData ?? []) as DeckScoreRow[]) {
        scores.set(row.deck_id, row)
      }
    }
  }

  return { decks, scores, schemaMissing }
}

export async function getDeckForScoring(
  supabase: SupabaseLike,
  deckId: number,
  userId: string
): Promise<{ deck: PodmatchDeck; cards: SignalCard[] } | null> {
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select(DECK_SELECT)
    .eq('id', deckId)
    .eq('user_id', userId)
    .maybeSingle()

  if (deckError) throw new Error(deckError.message)
  if (!deck) return null

  const { data: cards, error: cardsError } = await supabase
    .from('deck_cards')
    .select(CARD_SELECT)
    .eq('deck_id', deckId)

  if (cardsError) throw new Error(cardsError.message)

  return { deck: deck as PodmatchDeck, cards: (cards ?? []) as SignalCard[] }
}

export async function getDeckScore(
  supabase: SupabaseLike,
  deckId: number
): Promise<{ score: DeckScoreRow | null; schemaMissing: boolean }> {
  const { data, error } = await supabase
    .from('deck_scores')
    .select('*')
    .eq('deck_id', deckId)
    .maybeSingle()

  if (error) {
    if (isDeckScoresSchemaMissing(error.message)) {
      return { score: null, schemaMissing: true }
    }
    throw new Error(error.message)
  }

  return { score: (data as DeckScoreRow) ?? null, schemaMissing: false }
}

export async function persistDeckScore(
  supabase: SupabaseLike,
  deckId: number,
  score: DeckScore,
  ruleZero: RuleZeroProfile
): Promise<{ schemaMissing: boolean }> {
  const row = {
    deck_id: deckId,
    overall_power: score.overall_power,
    speed: score.speed,
    consistency: score.consistency,
    interaction: score.interaction,
    combo_density: score.combo_density,
    tutor_density: score.tutor_density,
    salt: score.salt,
    budget_pressure: score.budget_pressure,
    casual_friction: score.casual_friction,
    explanation: score.explanation,
    rule_zero: ruleZero,
    calculated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('deck_scores')
    .upsert(row, { onConflict: 'deck_id' })

  if (error) {
    if (isDeckScoresSchemaMissing(error.message)) {
      return { schemaMissing: true }
    }
    throw new Error(error.message)
  }

  return { schemaMissing: false }
}

/**
 * Load the chosen decks with their scores and an aggregated color identity,
 * ready for the pod generator. Decks the user does not own, or that have no
 * score yet, are reported back separately rather than silently dropped.
 */
export async function getDecksForPods(
  supabase: SupabaseLike,
  userId: string,
  deckIds: number[]
): Promise<{ decks: PodDeck[]; unscored: PodmatchDeck[]; schemaMissing: boolean }> {
  if (deckIds.length === 0) return { decks: [], unscored: [], schemaMissing: false }

  const { data: deckData, error: deckError } = await supabase
    .from('decks')
    .select(DECK_SELECT)
    .eq('user_id', userId)
    .in('id', deckIds)

  if (deckError) throw new Error(deckError.message)
  const decks = (deckData ?? []) as PodmatchDeck[]
  if (decks.length === 0) return { decks: [], unscored: [], schemaMissing: false }

  const ownedIds = decks.map((deck) => deck.id)

  // Scores.
  let scoreRows: DeckScoreRow[] = []
  let schemaMissing = false
  const { data: scoreData, error: scoreError } = await supabase
    .from('deck_scores')
    .select('*')
    .in('deck_id', ownedIds)
  if (scoreError) {
    if (isDeckScoresSchemaMissing(scoreError.message)) {
      schemaMissing = true
    } else {
      throw new Error(scoreError.message)
    }
  } else {
    scoreRows = (scoreData ?? []) as DeckScoreRow[]
  }
  const scoreById = new Map(scoreRows.map((row) => [row.deck_id, row]))

  // Color identity, aggregated per deck from its cards.
  const colorByDeck = new Map<number, Set<string>>()
  const { data: cardData } = await supabase
    .from('deck_cards')
    .select('deck_id, color_identity')
    .in('deck_id', ownedIds)
  for (const row of (cardData ?? []) as { deck_id: number; color_identity: string[] | null }[]) {
    const set = colorByDeck.get(row.deck_id) ?? new Set<string>()
    for (const color of row.color_identity ?? []) set.add(color)
    colorByDeck.set(row.deck_id, set)
  }

  const podDecks: PodDeck[] = []
  const unscored: PodmatchDeck[] = []

  for (const deck of decks) {
    const score = scoreById.get(deck.id)
    if (!score || score.overall_power == null) {
      unscored.push(deck)
      continue
    }
    podDecks.push({
      id: deck.id,
      name: deck.name,
      commander: deck.commander,
      owner: null,
      proxy_count: null,
      overall_power: score.overall_power ?? 0,
      speed: score.speed ?? 0,
      salt: score.salt ?? 0,
      combo_density: score.combo_density ?? 0,
      tutor_density: score.tutor_density ?? 0,
      budget_pressure: score.budget_pressure ?? 0,
      color_identity: Array.from(colorByDeck.get(deck.id) ?? []),
    })
  }

  return { decks: podDecks, unscored, schemaMissing }
}
