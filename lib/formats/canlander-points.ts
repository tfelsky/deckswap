// Canadian Highlander points list.
//
// SNAPSHOT of the official list at canadianhighlander.ca — values written
// 2026-06-12 from a best-effort reference and should be reviewed against the
// current official list periodically. Updating points is a one-file edit:
// change the map below, nothing else.
//
// Card names are stored lowercase; lookups also match the front face of
// split / double-faced names ("Name // Other").

export const CANLANDER_MAX_POINTS = 10

export const CANLANDER_POINTS: Record<string, number> = {
  'black lotus': 7,
  'ancestral recall': 7,
  'time vault': 7,
  'time walk': 6,
  'flash': 5,
  'demonic tutor': 4,
  'sol ring': 4,
  'mana crypt': 4,
  "thassa's oracle": 4,
  'tinker': 4,
  'vampiric tutor': 3,
  'mox emerald': 3,
  'mox jet': 3,
  'mox pearl': 3,
  'mox ruby': 3,
  'mox sapphire': 3,
  'mystical tutor': 2,
  'imperial seal': 2,
  'enlightened tutor': 1,
  'worldly tutor': 1,
  'personal tutor': 1,
  'merchant scroll': 1,
  'spellseeker': 1,
  'intuition': 1,
  'gifts ungiven': 1,
  'natural order': 1,
  'survival of the fittest': 1,
  'green sun\'s zenith': 1,
  'summoner\'s pact': 1,
  'crop rotation': 1,
  'balance': 1,
  'mind twist': 1,
  'strip mine': 1,
  'library of alexandria': 1,
  'true-name nemesis': 1,
  'oko, thief of crowns': 1,
  'treasure cruise': 1,
  'dig through time': 1,
}

export type CanlanderPointsBreakdownEntry = {
  cardName: string
  quantity: number
  points: number
}

function lookupPoints(cardName: string) {
  const normalized = cardName.trim().toLowerCase()
  const direct = CANLANDER_POINTS[normalized]
  if (direct != null) return direct

  const frontFace = normalized.split('//')[0]?.trim()
  if (frontFace && frontFace !== normalized) {
    return CANLANDER_POINTS[frontFace] ?? null
  }

  return null
}

export function calculateCanlanderPoints(
  cards: Array<{ cardName: string; quantity: number }>
): { total: number; breakdown: CanlanderPointsBreakdownEntry[] } {
  let total = 0
  const breakdown: CanlanderPointsBreakdownEntry[] = []

  for (const card of cards) {
    const points = lookupPoints(card.cardName)
    if (points == null || points <= 0) continue

    const quantity = Math.max(1, Number(card.quantity) || 1)
    total += points * quantity
    breakdown.push({ cardName: card.cardName.trim(), quantity, points })
  }

  return { total, breakdown }
}
