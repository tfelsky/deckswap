import { colorIdentityCode } from '@/lib/decks/color-identity'

type ColorIdentityCode = string

export type TradeMatchDeck = {
  id: number
  user_id: string
  name: string
  commander?: string | null
  format?: string | null
  price_total_usd_foil?: number | null
  image_url?: string | null
  color_identity?: string[] | null
  bracket?: number | null
  bracketLabel?: string | null
  owner_display_name?: string | null
  owner_location_country?: string | null
  owner_can_ship_international?: boolean | null
  owner_completed_trades_count?: number | null
}

export type TradeMatchResult = {
  score: number
  reasons: string[]
  valueGapUsd: number
  valueGapPercent: number
  myColorCode: ColorIdentityCode
  otherColorCode: ColorIdentityCode
  sameFormat: boolean
}

function normalizeCurrencyValue(value?: number | null) {
  return Math.max(0, Number(value ?? 0))
}

function normalizedCountry(value?: string | null) {
  return value?.trim().toLowerCase() || null
}

function colorOverlapScore(myCode: string, otherCode: string) {
  if (myCode === otherCode) {
    return { score: 24, reason: 'Same color identity keeps the matchup close to your current taste.' }
  }

  const mySet = new Set(myCode.split(''))
  const otherSet = new Set(otherCode.split(''))
  let overlap = 0

  for (const symbol of mySet) {
    if (otherSet.has(symbol)) overlap += 1
  }

  if (overlap >= 3) {
    return { score: 16, reason: 'Strong color overlap makes this a natural fit.' }
  }
  if (overlap >= 2) {
    return { score: 10, reason: 'Some shared colors give this match a familiar feel.' }
  }
  if (overlap >= 1) {
    return { score: 5, reason: 'At least one shared color keeps the deck direction adjacent.' }
  }

  return { score: 0, reason: 'Color identity is doing less work for this match.' }
}

function valueScore(myValue: number, otherValue: number) {
  const gap = Math.abs(myValue - otherValue)
  const baseline = Math.max(myValue, otherValue, 1)
  const gapPercent = gap / baseline

  if (gapPercent <= 0.08) {
    return {
      score: 32,
      gap,
      gapPercent,
      reason: 'Values are very close, which makes the trade easier to land.',
    }
  }
  if (gapPercent <= 0.18) {
    return {
      score: 24,
      gap,
      gapPercent,
      reason: 'Values are still close enough for a clean value-for-value conversation.',
    }
  }
  if (gapPercent <= 0.3) {
    return {
      score: 16,
      gap,
      gapPercent,
      reason: 'This match may still work with modest cash equalization.',
    }
  }

  return {
    score: 6,
    gap,
    gapPercent,
    reason: 'The value gap is wider, so equalization would likely be needed.',
  }
}

function formatScore(myFormat?: string | null, otherFormat?: string | null) {
  if (!myFormat || !otherFormat) {
    return { score: 4, reason: 'Format data is partial, so this match leans more on value and color.' }
  }

  if (myFormat === otherFormat) {
    return { score: 18, reason: 'Same format keeps the trade conversation straightforward.' }
  }

  return { score: 3, reason: 'Different formats can still trade, but the fit is less direct.' }
}

function bracketScore(myBracket?: number | null, otherBracket?: number | null) {
  if (!myBracket || !otherBracket) {
    return { score: 4, reason: 'Bracket data is light, so this match leans less on power alignment.' }
  }

  const distance = Math.abs(myBracket - otherBracket)

  if (distance === 0) {
    return { score: 12, reason: 'Same bracket suggests a similar power lane.' }
  }
  if (distance === 1) {
    return { score: 8, reason: 'Nearby brackets keep the decks reasonably aligned.' }
  }

  return { score: 2, reason: 'Bracket spread is wider, so pod expectations may differ.' }
}

function shippingScore(
  myCountry?: string | null,
  otherCountry?: string | null,
  otherInternational?: boolean | null
) {
  const my = normalizedCountry(myCountry)
  const other = normalizedCountry(otherCountry)

  if (my && other && my === other) {
    return { score: 10, reason: 'Same-country shipping should keep the swap easier and cheaper.' }
  }

  if (otherInternational) {
    return { score: 5, reason: 'The other trader appears open to international shipping.' }
  }

  return { score: 1, reason: 'Shipping fit is weaker, so logistics may need more care.' }
}

function trustScore(completedTrades?: number | null) {
  const trades = Math.max(0, Number(completedTrades ?? 0))

  if (trades >= 10) {
    return { score: 8, reason: 'The other trader already has solid completed-trade history.' }
  }
  if (trades >= 3) {
    return { score: 5, reason: 'There is enough trade history to add some confidence.' }
  }

  return { score: 2, reason: 'This looks like a newer trading profile, so trust history is still building.' }
}

export function calculateTradeMatch(
  myDeck: TradeMatchDeck,
  otherDeck: TradeMatchDeck,
  options?: {
    myCountry?: string | null
  }
): TradeMatchResult {
  const myValue = normalizeCurrencyValue(myDeck.price_total_usd_foil)
  const otherValue = normalizeCurrencyValue(otherDeck.price_total_usd_foil)
  const myColorCode = colorIdentityCode(myDeck.color_identity)
  const otherColorCode = colorIdentityCode(otherDeck.color_identity)

  const value = valueScore(myValue, otherValue)
  const format = formatScore(myDeck.format, otherDeck.format)
  const colors = colorOverlapScore(myColorCode, otherColorCode)
  const bracket = bracketScore(myDeck.bracket, otherDeck.bracket)
  const shipping = shippingScore(
    options?.myCountry,
    otherDeck.owner_location_country,
    otherDeck.owner_can_ship_international
  )
  const trust = trustScore(otherDeck.owner_completed_trades_count)

  const score = Math.max(
    0,
    Math.min(
      100,
      value.score + format.score + colors.score + bracket.score + shipping.score + trust.score
    )
  )

  return {
    score,
    reasons: [
      value.reason,
      format.reason,
      colors.reason,
      bracket.reason,
      shipping.reason,
      trust.reason,
    ],
    valueGapUsd: value.gap,
    valueGapPercent: value.gapPercent,
    myColorCode,
    otherColorCode,
    sameFormat: myDeck.format === otherDeck.format,
  }
}
