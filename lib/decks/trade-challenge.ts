export const TRADE_GOALS = [
  "lateral",
  "upgrade",
  "downgrade_cash",
  "sell_fast",
] as const

export type TradeGoal = (typeof TRADE_GOALS)[number]

export function normalizeTradeGoal(value?: string | null): TradeGoal | null {
  const candidate = value?.trim().toLowerCase()

  if (!candidate) return null

  return (TRADE_GOALS as readonly string[]).includes(candidate) ? (candidate as TradeGoal) : null
}

export function getTradeGoalLabel(value?: string | null) {
  switch (normalizeTradeGoal(value)) {
    case "lateral":
      return "Lateral swap"
    case "upgrade":
      return "Trading up"
    case "downgrade_cash":
      return "Trading down for cash"
    case "sell_fast":
      return "Move fast"
    default:
      return "Open to offers"
  }
}

export function getTradeGoalDescription(value?: string | null) {
  switch (normalizeTradeGoal(value)) {
    case "lateral":
      return "Looking for a value-close deck-for-deck exchange."
    case "upgrade":
      return "Willing to add value for a stronger or more premium deck."
    case "downgrade_cash":
      return "Open to taking a lower-value deck plus cash equalization."
    case "sell_fast":
      return "Prioritizing speed and clean movement over maximizing upside."
    default:
      return "Open to hearing trade ideas that fit the deck's value and play lane."
  }
}

export function buildTradeMatchesHref(deckId: number) {
  return `/trade-matches?targetDeckId=${deckId}`
}
