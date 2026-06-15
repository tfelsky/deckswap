// PodMatch deck scoring engine.
//
// Deterministic, explainable heuristics over the Scryfall data already stored
// on deck_cards. No randomness, no time, no network — the same deck always
// produces the same scores (PodMatch spec, Feature C acceptance criteria).
//
// Every sub-score is 0-10 and ships with human-readable "drivers" so a player
// can always answer "why did I get this score?".

import {
  averageManaValue,
  commanderManaValue,
  detectCardDraw,
  detectCedhSignals,
  detectCheapRocks,
  detectComboPieces,
  detectExtraTurns,
  detectFastMana,
  detectGameChangers,
  detectHeavyDiscard,
  detectInteraction,
  detectMassLandDenial,
  detectRamp,
  detectStax,
  detectTheft,
  detectTutors,
  highValueCards,
  scoringCards,
  totalDeckValue,
  type SignalCard,
} from './signals'

export type SignalCardInput = SignalCard

export type SubScoreKey =
  | 'speed'
  | 'consistency'
  | 'interaction'
  | 'combo_density'
  | 'tutor_density'
  | 'salt'
  | 'budget_pressure'
  | 'casual_friction'
  | 'overall_power'

export type ScoreExplanation = Record<SubScoreKey, { value: number; drivers: string[] }>

export type DeckScore = {
  overall_power: number
  speed: number
  consistency: number
  interaction: number
  combo_density: number
  tutor_density: number
  salt: number
  budget_pressure: number
  casual_friction: number
  explanation: ScoreExplanation
}

function clamp(value: number, min = 0, max = 10): number {
  return Math.min(max, Math.max(min, value))
}

/** Round to one decimal place so output is stable and comparable. */
function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function plural(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : plural ?? singular + 's'}`
}

export function scoreDeck(cards: SignalCardInput[]): DeckScore {
  const relevant = scoringCards(cards)

  const fastMana = detectFastMana(relevant)
  const cheapRocks = detectCheapRocks(relevant)
  const ramp = detectRamp(relevant)
  const tutors = detectTutors(relevant)
  const cardDraw = detectCardDraw(relevant)
  const combo = detectComboPieces(relevant)
  const cedhSignals = detectCedhSignals(relevant)
  const gameChangers = detectGameChangers(relevant)
  const { removal, counters, wipes, graveHate } = detectInteraction(relevant)
  const extraTurns = detectExtraTurns(relevant)
  const mld = detectMassLandDenial(relevant)
  const stax = detectStax(relevant)
  const theft = detectTheft(relevant)
  const heavyDiscard = detectHeavyDiscard(relevant)

  const avgMv = averageManaValue(relevant)
  const cmdMv = commanderManaValue(relevant)
  const deckValue = totalDeckValue(relevant)
  const pricey = highValueCards(relevant)

  // ---- Speed -------------------------------------------------------------
  const curveBonus =
    avgMv <= 0 ? 0 : avgMv <= 2 ? 3 : avgMv <= 2.5 ? 2 : avgMv <= 3 ? 1 : avgMv <= 3.5 ? 0 : -1
  const speedRaw =
    fastMana.length * 1.6 +
    cheapRocks.length * 0.7 +
    Math.min(ramp.length, 10) * 0.25 +
    curveBonus
  const speed = round1(clamp(speedRaw))
  const speedDrivers: string[] = []
  if (fastMana.length) speedDrivers.push(`${plural(fastMana.length, 'fast mana source')} (${fastMana.slice(0, 4).join(', ')})`)
  if (cheapRocks.length) speedDrivers.push(`${plural(cheapRocks.length, 'mana rock')} costing 2 or less`)
  if (ramp.length) speedDrivers.push(`${plural(ramp.length, 'ramp effect')}`)
  if (avgMv > 0) speedDrivers.push(`Average mana value is ${round1(avgMv)}`)
  if (cmdMv != null) speedDrivers.push(`Commander mana value is ${round1(cmdMv)}`)

  // ---- Tutor density -----------------------------------------------------
  const tutorDensity = round1(clamp(tutors.length * 1.1))
  const tutorDrivers: string[] = []
  if (tutors.length) tutorDrivers.push(`${plural(tutors.length, 'tutor')} (${tutors.slice(0, 4).join(', ')})`)
  else tutorDrivers.push('No tutors detected')

  // ---- Consistency -------------------------------------------------------
  const consistencyRaw =
    tutors.length * 0.9 +
    Math.min(cardDraw.length, 12) * 0.35 +
    (avgMv > 0 && avgMv <= 2.5 ? 2 : avgMv > 0 && avgMv <= 3 ? 1 : 0) +
    Math.min(ramp.length, 8) * 0.2
  const consistency = round1(clamp(consistencyRaw))
  const consistencyDrivers: string[] = []
  if (tutors.length) consistencyDrivers.push(`${plural(tutors.length, 'tutor')} improve redundancy`)
  if (cardDraw.length) consistencyDrivers.push(`${plural(cardDraw.length, 'card-advantage effect')}`)
  if (avgMv > 0) consistencyDrivers.push(`Average mana value is ${round1(avgMv)}`)
  if (ramp.length) consistencyDrivers.push(`${plural(ramp.length, 'ramp effect')} smooth the curve`)

  // ---- Interaction -------------------------------------------------------
  const interactionRaw =
    removal.length * 0.45 +
    counters.length * 0.7 +
    wipes.length * 1.1 +
    graveHate.length * 0.7
  const interaction = round1(clamp(interactionRaw))
  const interactionDrivers: string[] = []
  if (removal.length) interactionDrivers.push(`${plural(removal.length, 'spot-removal / burn spell')}`)
  if (counters.length) interactionDrivers.push(`${plural(counters.length, 'counterspell')}`)
  if (wipes.length) interactionDrivers.push(`${plural(wipes.length, 'board wipe')}`)
  if (graveHate.length) interactionDrivers.push(`${plural(graveHate.length, 'graveyard-hate effect')}`)
  if (!interactionDrivers.length) interactionDrivers.push('Little detected interaction')

  // ---- Combo density -----------------------------------------------------
  const comboRaw = combo.length * 1.7 + Math.min(cedhSignals.length, 6) * 0.3
  const comboDensity = round1(clamp(comboRaw))
  const comboDrivers: string[] = []
  if (combo.length) comboDrivers.push(`${plural(combo.length, 'known combo piece')} (${combo.slice(0, 4).join(', ')})`)
  else comboDrivers.push('No known combo pieces detected')

  // ---- Salt --------------------------------------------------------------
  const saltRaw =
    mld.length * 2.5 +
    extraTurns.length * 1.4 +
    stax.length * 0.8 +
    theft.length * 1.0 +
    heavyDiscard.length * 0.7
  const salt = round1(clamp(saltRaw))
  const saltDrivers: string[] = []
  if (mld.length) saltDrivers.push(`${plural(mld.length, 'mass land denial / prison piece')}`)
  if (extraTurns.length) saltDrivers.push(`${plural(extraTurns.length, 'extra-turn spell')}`)
  if (stax.length) saltDrivers.push(`${plural(stax.length, 'stax / tax effect')}`)
  if (theft.length) saltDrivers.push(`${plural(theft.length, 'theft effect')}`)
  if (heavyDiscard.length) saltDrivers.push(`${plural(heavyDiscard.length, 'heavy-discard effect')}`)
  if (!saltDrivers.length) saltDrivers.push('No high-salt play patterns detected')

  // ---- Budget pressure ---------------------------------------------------
  let budget: number
  if (deckValue <= 0) {
    budget = 0
  } else if (deckValue < 100) budget = 2
  else if (deckValue < 300) budget = 4
  else if (deckValue < 600) budget = 6
  else if (deckValue < 1000) budget = 7.5
  else if (deckValue < 2000) budget = 9
  else budget = 10
  budget = round1(clamp(budget + Math.min(pricey.length, 6) * 0.1))
  const budgetDrivers: string[] = []
  if (deckValue > 0) budgetDrivers.push(`Estimated deck value ~$${Math.round(deckValue).toLocaleString('en-US')}`)
  else budgetDrivers.push('No price data available for these cards')
  if (pricey.length) budgetDrivers.push(`${plural(pricey.length, 'card')} over $25 (${pricey.slice(0, 3).join(', ')})`)

  // ---- Overall power -----------------------------------------------------
  const powerBase =
    0.24 * speed +
    0.2 * consistency +
    0.16 * interaction +
    0.22 * comboDensity +
    0.18 * tutorDensity
  const gameChangerBump = Math.min(gameChangers.length, 8) * 0.25
  const cedhBump = cedhSignals.length >= 6 && avgMv > 0 && avgMv <= 2.4 ? 1 : 0
  const overall = round1(clamp(powerBase + gameChangerBump + cedhBump))
  const overallDrivers: string[] = []
  overallDrivers.push(`Blend of speed ${speed}, consistency ${consistency}, interaction ${interaction}, combo ${comboDensity}, tutors ${tutorDensity}`)
  if (gameChangers.length) overallDrivers.push(`${plural(gameChangers.length, 'Game Changer')} (${gameChangers.slice(0, 3).join(', ')})`)
  if (cedhBump) overallDrivers.push('Trips multiple cEDH heuristics (fast mana + low curve)')

  // ---- Casual friction ---------------------------------------------------
  const frictionRaw = 0.3 * comboDensity + 0.3 * salt + 0.2 * tutorDensity + 0.2 * speed
  const casualFriction = round1(clamp(frictionRaw))
  const frictionDrivers: string[] = []
  if (comboDensity >= 5) frictionDrivers.push('High combo density can end games abruptly')
  if (salt >= 5) frictionDrivers.push('Salt-inducing play patterns present')
  if (tutorDensity >= 5) frictionDrivers.push('High tutor density reduces variance')
  if (speed >= 7) frictionDrivers.push('Fast starts can outpace casual tables')
  if (!frictionDrivers.length) frictionDrivers.push('Low expected friction at a casual table')

  const explanation: ScoreExplanation = {
    overall_power: { value: overall, drivers: overallDrivers },
    speed: { value: speed, drivers: speedDrivers },
    consistency: { value: consistency, drivers: consistencyDrivers },
    interaction: { value: interaction, drivers: interactionDrivers },
    combo_density: { value: comboDensity, drivers: comboDrivers },
    tutor_density: { value: tutorDensity, drivers: tutorDrivers },
    salt: { value: salt, drivers: saltDrivers },
    budget_pressure: { value: budget, drivers: budgetDrivers },
    casual_friction: { value: casualFriction, drivers: frictionDrivers },
  }

  return {
    overall_power: overall,
    speed,
    consistency,
    interaction,
    combo_density: comboDensity,
    tutor_density: tutorDensity,
    salt,
    budget_pressure: budget,
    casual_friction: casualFriction,
    explanation,
  }
}

export const SUB_SCORE_LABELS: Record<Exclude<SubScoreKey, 'overall_power'>, string> = {
  speed: 'Speed',
  consistency: 'Consistency',
  interaction: 'Interaction',
  combo_density: 'Combo Density',
  tutor_density: 'Tutor Density',
  salt: 'Salt',
  budget_pressure: 'Budget Pressure',
  casual_friction: 'Casual Friction',
}
