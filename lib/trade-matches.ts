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
  trade_goal?: string | null
  trade_wanted_profile?: string | null
  wanted_color_identities?: string[] | null
  wanted_formats?: string[] | null
  is_complete_precon?: boolean | null
  token_count?: number | null
  owner_display_name?: string | null
  owner_location_country?: string | null
  owner_can_ship_domestic?: boolean | null
  owner_can_ship_international?: boolean | null
  owner_completed_trades_count?: number | null
  owner_avg_trade_reply_hours?: number | null
  owner_internal_user_rating?: number | null
}

type MatchScorePart = {
  score: number
  reason: string
}

type PreferenceSignalDeck = Pick<
  TradeMatchDeck,
  'format' | 'price_total_usd_foil' | 'color_identity' | 'bracket' | 'is_complete_precon' | 'token_count'
>

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

function uniqueNonEmpty<T>(values: T[]) {
  return [...new Set(values)]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function tokenizePreferenceText(value?: string | null) {
  const normalized = (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) return []

  const stopWords = new Set([
    'the',
    'and',
    'for',
    'with',
    'that',
    'this',
    'deck',
    'decks',
    'trade',
    'trades',
    'looking',
    'value',
    'close',
    'into',
    'from',
    'plus',
    'strong',
    'open',
    'offers',
  ])

  return uniqueNonEmpty(
    normalized
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !stopWords.has(token))
  )
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
  otherDomestic?: boolean | null,
  otherCountry?: string | null,
  otherInternational?: boolean | null
) {
  const my = normalizedCountry(myCountry)
  const other = normalizedCountry(otherCountry)

  if (my && other && my === other) {
    return {
      score: otherDomestic === false ? 7 : 10,
      reason: 'Same-country shipping should keep the swap easier and cheaper.',
    }
  }

  if (otherInternational) {
    return { score: 5, reason: 'The other trader appears open to international shipping.' }
  }

  if (my && other && my !== other) {
    return { score: -3, reason: 'This shipping lane looks cross-border without an international-ship signal.' }
  }

  if (otherDomestic === true && !otherInternational) {
    return { score: 1, reason: 'Shipping fit is probably domestic-only, so this match depends on geography.' }
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

function responsivenessScore(avgTradeReplyHours?: number | null) {
  const hours = Number(avgTradeReplyHours ?? NaN)

  if (!Number.isFinite(hours)) {
    return { score: 1, reason: 'Reply-speed history is still light, so responsiveness is hard to read.' }
  }
  if (hours <= 6) {
    return { score: 6, reason: 'The other trader tends to reply quickly, which helps live trade coordination.' }
  }
  if (hours <= 24) {
    return { score: 4, reason: 'The other trader usually replies within a day.' }
  }
  if (hours <= 72) {
    return { score: 1, reason: 'Reply timing looks workable, though not especially fast.' }
  }

  return { score: -2, reason: 'Slow reply timing may make the trade harder to close.' }
}

function ratingScore(internalUserRating?: number | null) {
  const rating = Number(internalUserRating ?? NaN)

  if (!Number.isFinite(rating)) {
    return { score: 0, reason: 'No user-rating signal is available yet.' }
  }
  if (rating >= 4.5) {
    return { score: 4, reason: 'Internal user rating adds confidence to this match.' }
  }
  if (rating >= 3.5) {
    return { score: 2, reason: 'User rating is positive enough to modestly support the match.' }
  }

  return { score: -2, reason: 'Lower user rating adds a little friction to this match.' }
}

function wantedFormatScore(myDeck: TradeMatchDeck, otherDeck: TradeMatchDeck): MatchScorePart {
  const wantedFormats = uniqueNonEmpty(
    (myDeck.wanted_formats ?? []).map((value) => value?.trim().toLowerCase()).filter(Boolean)
  )

  if (wantedFormats.length === 0) {
    return { score: 0, reason: 'No explicit format preference was set on your listing.' }
  }

  if (otherDeck.format && wantedFormats.includes(otherDeck.format.trim().toLowerCase())) {
    return { score: 8, reason: 'This deck matches a format you explicitly said you want.' }
  }

  return { score: -4, reason: 'This deck sits outside the formats you listed as preferred.' }
}

function colorCodeOverlapScore(baseCode: string, candidateCode: string) {
  if (!baseCode || !candidateCode) return 0
  if (baseCode === candidateCode) return 4

  const baseSet = new Set(baseCode.split(''))
  const candidateSet = new Set(candidateCode.split(''))
  let overlap = 0

  for (const symbol of baseSet) {
    if (candidateSet.has(symbol)) overlap += 1
  }

  return overlap
}

function wantedColorScore(myDeck: TradeMatchDeck, otherDeck: TradeMatchDeck): MatchScorePart {
  const wantedColors = uniqueNonEmpty(
    (myDeck.wanted_color_identities ?? []).map((value) => value?.trim().toUpperCase()).filter(Boolean)
  )

  if (wantedColors.length === 0) {
    return { score: 0, reason: 'No explicit color identity preference was set on your listing.' }
  }

  const otherCode = colorIdentityCode(otherDeck.color_identity)
  const bestOverlap = Math.max(...wantedColors.map((code) => colorCodeOverlapScore(code, otherCode)), 0)

  if (bestOverlap >= 4) {
    return { score: 8, reason: 'This deck lands directly in a color identity you asked for.' }
  }
  if (bestOverlap >= 3) {
    return { score: 5, reason: 'This deck overlaps strongly with the colors you said you want.' }
  }
  if (bestOverlap >= 1) {
    return { score: 2, reason: 'This deck partially overlaps with your stated color preferences.' }
  }

  return { score: -3, reason: 'This deck misses the color identities you marked as preferred.' }
}

function tradeGoalScore(myDeck: TradeMatchDeck, otherDeck: TradeMatchDeck): MatchScorePart {
  const myValue = normalizeCurrencyValue(myDeck.price_total_usd_foil)
  const otherValue = normalizeCurrencyValue(otherDeck.price_total_usd_foil)
  const goal = myDeck.trade_goal?.trim().toLowerCase()

  switch (goal) {
    case 'lateral': {
      const gapPercent = Math.abs(myValue - otherValue) / Math.max(myValue, otherValue, 1)
      return gapPercent <= 0.12
        ? { score: 6, reason: 'Your deck is set to lateral swaps, and this match stays close on value.' }
        : { score: -2, reason: 'Your deck is set to lateral swaps, but this value gap is wider.' }
    }
    case 'upgrade':
      return otherValue > myValue
        ? { score: 6, reason: 'Your deck is marked as a trade-up target, and this candidate is the stronger value side.' }
        : { score: -2, reason: 'Your deck is marked for trading up, but this candidate does not move value upward.' }
    case 'downgrade_cash':
      return otherValue < myValue
        ? { score: 6, reason: 'Your deck is positioned for a downtrade plus cash, and this candidate supports that shape.' }
        : { score: -2, reason: 'Your deck is positioned for a downtrade plus cash, but this candidate is not lower in value.' }
    case 'sell_fast':
      return { score: 3, reason: 'Your listing says speed matters, so clean logistics get a little more weight here.' }
    default:
      return { score: 0, reason: 'No explicit trade-goal adjustment is applied.' }
  }
}

function wantedProfileTextScore(myDeck: TradeMatchDeck, otherDeck: TradeMatchDeck): MatchScorePart {
  const tokens = tokenizePreferenceText(myDeck.trade_wanted_profile)

  if (tokens.length === 0) {
    return { score: 0, reason: 'No free-text trade preference was written on your listing.' }
  }

  const colorCode = colorIdentityCode(otherDeck.color_identity).toLowerCase()
  const searchableText = [
    otherDeck.name,
    otherDeck.commander,
    otherDeck.format,
    otherDeck.bracketLabel,
    colorCode,
    otherDeck.is_complete_precon ? 'precon' : '',
    Number(otherDeck.token_count ?? 0) > 0 ? 'token tokens' : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const keywordGroups = [
    {
      token: 'white',
      hit: colorCode.includes('w'),
      label: 'white',
    },
    {
      token: 'blue',
      hit: colorCode.includes('u'),
      label: 'blue',
    },
    {
      token: 'black',
      hit: colorCode.includes('b'),
      label: 'black',
    },
    {
      token: 'red',
      hit: colorCode.includes('r'),
      label: 'red',
    },
    {
      token: 'green',
      hit: colorCode.includes('g'),
      label: 'green',
    },
    {
      token: 'precon',
      hit: otherDeck.is_complete_precon === true,
      label: 'precon',
    },
    {
      token: 'tokens',
      hit: Number(otherDeck.token_count ?? 0) > 0,
      label: 'token support',
    },
    {
      token: 'token',
      hit: Number(otherDeck.token_count ?? 0) > 0,
      label: 'token support',
    },
  ]

  const matchedLabels = new Set<string>()
  let rawMatches = 0

  for (const token of tokens) {
    if (searchableText.includes(token)) {
      rawMatches += 1
      matchedLabels.add(token)
      continue
    }

    const keyword = keywordGroups.find((entry) => entry.token === token && entry.hit)
    if (keyword) {
      rawMatches += 1
      matchedLabels.add(keyword.label)
    }
  }

  if (rawMatches === 0) {
    return { score: -2, reason: 'This deck misses the themes described in your written trade preferences.' }
  }

  const score = clamp(rawMatches * 2, 2, 8)
  return {
    score,
    reason: `It lines up with the trade themes you wrote down: ${[...matchedLabels].slice(0, 3).join(', ')}.`,
  }
}

function behaviorPreferenceScore(
  label: 'watchlist' | 'rejections',
  otherDeck: TradeMatchDeck,
  sourceDecks: PreferenceSignalDeck[],
  direction: 1 | -1
): MatchScorePart {
  if (sourceDecks.length === 0) {
    return {
      score: 0,
      reason:
        label === 'watchlist'
          ? 'No watchlist behavior is available yet.'
          : 'No rejection behavior is available yet.',
    }
  }

  let score = 0
  const reasons: string[] = []
  const otherCode = colorIdentityCode(otherDeck.color_identity)

  const formatMatches = sourceDecks.filter(
    (deck) => !!deck.format && !!otherDeck.format && deck.format === otherDeck.format
  ).length
  if (formatMatches > 0) {
    score += formatMatches >= 2 ? 4 : 2
    reasons.push(
      label === 'watchlist'
        ? 'It matches formats you have been watching.'
        : 'It looks similar to formats you have been rejecting.'
    )
  }

  const colorMatches = sourceDecks.filter((deck) => {
    const sourceCode = colorIdentityCode(deck.color_identity)
    return colorCodeOverlapScore(sourceCode, otherCode) >= 3
  }).length
  if (colorMatches > 0) {
    score += colorMatches >= 2 ? 4 : 2
    reasons.push(
      label === 'watchlist'
        ? 'Its colors line up with decks you have saved to watch.'
        : 'Its colors line up with decks you have already rejected.'
    )
  }

  const preconMatches = sourceDecks.filter(
    (deck) => deck.is_complete_precon === true && otherDeck.is_complete_precon === true
  ).length
  if (preconMatches > 0) {
    score += 2
    reasons.push(
      label === 'watchlist'
        ? 'It matches your habit of saving precon-style decks.'
        : 'It resembles precon-style decks you have been rejecting.'
    )
  }

  const tokenMatches = sourceDecks.filter(
    (deck) => Number(deck.token_count ?? 0) > 0 && Number(otherDeck.token_count ?? 0) > 0
  ).length
  if (tokenMatches > 0) {
    score += tokenMatches >= 2 ? 3 : 1
    reasons.push(
      label === 'watchlist'
        ? 'It shares the token-heavy shape of decks you have been tracking.'
        : 'It shares the token-heavy shape of decks you have been rejecting.'
    )
  }

  const ratedSourceDecks = sourceDecks.filter((deck) => deck.bracket != null)
  if (otherDeck.bracket != null && ratedSourceDecks.length > 0) {
    const averageBracket =
      ratedSourceDecks.reduce((sum, deck) => sum + Number(deck.bracket ?? 0), 0) /
      ratedSourceDecks.length
    if (Math.abs(averageBracket - Number(otherDeck.bracket)) <= 1) {
      score += 3
      reasons.push(
        label === 'watchlist'
          ? 'Its bracket sits near the decks you have been tracking.'
          : 'Its bracket sits near the decks you have been rejecting.'
      )
    }
  }

  if (score === 0) {
    return {
      score: 0,
      reason:
        label === 'watchlist'
          ? 'Watchlist history does not strongly pull this deck up or down.'
          : 'Rejection history does not strongly push this deck down.',
    }
  }

  return {
    score: clamp(score, 0, 9) * direction,
    reason: reasons.join(' '),
  }
}

export function calculateTradeMatch(
  myDeck: TradeMatchDeck,
  otherDeck: TradeMatchDeck,
  options?: {
    myCountry?: string | null
    watchedDecks?: PreferenceSignalDeck[]
    rejectedDecks?: PreferenceSignalDeck[]
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
    otherDeck.owner_can_ship_domestic,
    otherDeck.owner_location_country,
    otherDeck.owner_can_ship_international
  )
  const trust = trustScore(otherDeck.owner_completed_trades_count)
  const responsiveness = responsivenessScore(otherDeck.owner_avg_trade_reply_hours)
  const rating = ratingScore(otherDeck.owner_internal_user_rating)
  const wantedFormat = wantedFormatScore(myDeck, otherDeck)
  const wantedColor = wantedColorScore(myDeck, otherDeck)
  const goal = tradeGoalScore(myDeck, otherDeck)
  const wantedProfileText = wantedProfileTextScore(myDeck, otherDeck)
  const watchlistBehavior = behaviorPreferenceScore(
    'watchlist',
    otherDeck,
    options?.watchedDecks ?? [],
    1
  )
  const rejectionBehavior = behaviorPreferenceScore(
    'rejections',
    otherDeck,
    options?.rejectedDecks ?? [],
    -1
  )

  const score = Math.max(
    0,
    Math.min(
      100,
      value.score +
        format.score +
        colors.score +
        bracket.score +
        shipping.score +
        trust.score +
        responsiveness.score +
        rating.score +
        wantedFormat.score +
        wantedColor.score +
        goal.score +
        wantedProfileText.score +
        watchlistBehavior.score +
        rejectionBehavior.score
    )
  )

  const reasons = [
    value,
    format,
    colors,
    bracket,
    shipping,
    trust,
    responsiveness,
    rating,
    wantedFormat,
    wantedColor,
    goal,
    wantedProfileText,
    watchlistBehavior,
    rejectionBehavior,
  ]
    .filter((part) => part.score !== 0 || !part.reason.startsWith('No '))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .map((part) => part.reason)

  return {
    score,
    reasons,
    valueGapUsd: value.gap,
    valueGapPercent: value.gapPercent,
    myColorCode,
    otherColorCode,
    sameFormat: myDeck.format === otherDeck.format,
  }
}
