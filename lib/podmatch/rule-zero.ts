// PodMatch Rule-Zero profile (spec Feature D).
//
// A concise, shareable pre-game disclosure derived from the deck score and
// the underlying cards. Everything here is plain data ready to render on the
// deck page or the printable rule-zero sheet.

import type { DeckScore } from './scoring'
import {
  detectComboPieces,
  detectExtraTurns,
  detectMassLandDenial,
  detectStax,
  detectTutors,
  scoringCards,
  totalDeckValue,
  type SignalCard,
} from './signals'

export type Band = 'None' | 'Low' | 'Medium' | 'High' | 'Very high'

export type RuleZeroProfile = {
  deck_name: string
  commander: string | null
  estimated_power: number
  speed_band: string
  tutor_band: Band
  salt_band: Band
  combo: { present: boolean; count: number; pieces: string[] }
  estimated_value_usd: number
  proxy_use: string
  flags: string[]
  notes: string
}

function band(score: number): Band {
  if (score <= 0.5) return 'None'
  if (score < 3.5) return 'Low'
  if (score < 6.5) return 'Medium'
  if (score < 8.5) return 'High'
  return 'Very high'
}

function speedBand(speed: number): string {
  if (speed < 3) return 'Slow'
  if (speed < 5.5) return 'Medium'
  if (speed < 7.5) return 'Medium-fast'
  return 'Fast'
}

export function buildRuleZeroProfile(
  deck: { name: string; commander: string | null; proxy_count?: number | null },
  score: DeckScore,
  cards: SignalCard[]
): RuleZeroProfile {
  const relevant = scoringCards(cards)

  const combos = detectComboPieces(relevant)
  const tutors = detectTutors(relevant)
  const stax = detectStax(relevant)
  const mld = detectMassLandDenial(relevant)
  const extraTurns = detectExtraTurns(relevant)
  const value = totalDeckValue(relevant)

  const flags: string[] = []
  if (combos.length) flags.push(`Combo: ${combos.length} known infinite/two-card line${combos.length === 1 ? '' : 's'}`)
  if (stax.length) flags.push(`Stax/prison: ${stax.length} tax or lock piece${stax.length === 1 ? '' : 's'}`)
  if (extraTurns.length) flags.push(`Extra turns: ${extraTurns.length}`)
  if (mld.length) flags.push(`Mass land destruction: ${mld.length}`)
  if (value >= 1000) flags.push(`High budget: estimated ~$${Math.round(value).toLocaleString('en-US')}`)
  if ((deck.proxy_count ?? 0) > 0) flags.push(`Proxies declared: ${deck.proxy_count}`)

  const noteParts: string[] = []
  if (tutors.length) noteParts.push(`${tutors.length} tutor${tutors.length === 1 ? '' : 's'}`)
  if (combos.length) noteParts.push('a compact combo finish')
  if (mld.length) noteParts.push('mass land denial')
  if (extraTurns.length) noteParts.push('extra-turn effects')
  const notes = noteParts.length
    ? `Contains ${noteParts.join(', ')}. Discuss before the game so the table can rule-zero.`
    : 'No major rule-zero-sensitive patterns detected. Play it as a fair, casual deck.'

  return {
    deck_name: deck.name,
    commander: deck.commander ?? null,
    estimated_power: score.overall_power,
    speed_band: speedBand(score.speed),
    tutor_band: band(score.tutor_density),
    salt_band: band(score.salt),
    combo: { present: combos.length > 0, count: combos.length, pieces: combos },
    estimated_value_usd: Math.round(value),
    proxy_use: (deck.proxy_count ?? 0) > 0 ? `${deck.proxy_count} declared` : 'None declared',
    flags,
    notes,
  }
}
