export type PublicProfile = {
  user_id: string
  display_name?: string | null
  username?: string | null
  bio?: string | null
  avatar_url?: string | null
  location_country?: string | null
  location_region?: string | null
  preferred_currency?: string | null
  marketplace_tagline?: string | null
  website_url?: string | null
  instagram_url?: string | null
  youtube_url?: string | null
  whatnot_url?: string | null
  ebay_url?: string | null
  cardmarket_url?: string | null
  tcgplayer_url?: string | null
  can_ship_domestic?: boolean | null
  can_ship_international?: boolean | null
}

export type PrivateProfile = {
  user_id: string
  legal_first_name?: string | null
  legal_last_name?: string | null
  support_email?: string | null
  shipping_name?: string | null
  shipping_address_line_1?: string | null
  shipping_city?: string | null
  shipping_region?: string | null
  shipping_postal_code?: string | null
  shipping_country?: string | null
  customer_service_notes?: string | null
  government_id_storage_key?: string | null
  marketing_opt_in_email?: boolean | null
}

export type ProfileVerification = {
  id?: number
  user_id: string
  verification_type: string
  status?: string | null
  notes?: string | null
}

export type ReputationSummary = {
  user_id: string
  completed_trades_count?: number | null
  successful_shipments_count?: number | null
  positive_feedback_count?: number | null
  negative_feedback_count?: number | null
  external_rating_average?: number | null
  external_rating_count?: number | null
  verification_badges?: string[] | null
  is_manually_verified?: boolean | null
  is_known_user?: boolean | null
  is_friend_of_platform?: boolean | null
  banned_status?: string | null
  banned_reason?: string | null
  manual_review_notes?: string | null
  last_seen_at?: string | null
  avg_trade_reply_hours?: number | null
  last_login_ip_country?: string | null
  internal_user_rating?: number | null
  internal_validation_score?: number | null
  internal_validation_tier?: string | null
  internal_validation_notes?: string[] | null
  internal_validation_last_calculated_at?: string | null
}

export type InternalValidationSummary = {
  score: number
  tier: 'High Confidence' | 'Trusted' | 'Monitor' | 'Needs Review'
  activityScore: number
  replyScore: number
  locationScore: number
  historyScore: number
  ratingScore: number
  modifier: number
  notes: string[]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function daysSince(value?: string | null) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return null
  return (Date.now() - timestamp) / (1000 * 60 * 60 * 24)
}

function normalizeCountry(value?: string | null) {
  return value?.trim().toLowerCase() || null
}

function activityScore(lastSeenAt?: string | null) {
  const ageInDays = daysSince(lastSeenAt)

  if (ageInDays == null) return { score: 6, note: 'Last login recency has not been recorded yet.' }
  if (ageInDays <= 7) return { score: 20, note: 'Recent login activity looks healthy.' }
  if (ageInDays <= 30) return { score: 16, note: 'User has been active in the last 30 days.' }
  if (ageInDays <= 90) return { score: 10, note: 'Last login is aging and may need a confidence check.' }
  return { score: 4, note: 'User has not logged in recently.' }
}

function replySpeedScore(avgTradeReplyHours?: number | null) {
  if (avgTradeReplyHours == null || !Number.isFinite(avgTradeReplyHours)) {
    return { score: 8, note: 'Trade-offer reply timing is not populated yet.' }
  }
  if (avgTradeReplyHours <= 6) {
    return { score: 20, note: 'Replies have been consistently fast.' }
  }
  if (avgTradeReplyHours <= 24) {
    return { score: 16, note: 'Replies are arriving within a day.' }
  }
  if (avgTradeReplyHours <= 72) {
    return { score: 11, note: 'Reply time is acceptable but slowing down.' }
  }
  if (avgTradeReplyHours <= 168) {
    return { score: 5, note: 'Reply time is slow for active trade coordination.' }
  }
  return { score: 2, note: 'Reply time is very slow and should be reviewed.' }
}

function locationScore(
  ipCountry?: string | null,
  publicCountry?: string | null,
  shippingCountry?: string | null
) {
  const normalizedIpCountry = normalizeCountry(ipCountry)
  const normalizedPublicCountry = normalizeCountry(publicCountry)
  const normalizedShippingCountry = normalizeCountry(shippingCountry)

  if (!normalizedIpCountry) {
    return { score: 8, note: 'IP geography has not been captured yet.' }
  }
  if (normalizedShippingCountry && normalizedIpCountry === normalizedShippingCountry) {
    return { score: 15, note: 'Last login IP country matches the private shipping country.' }
  }
  if (normalizedPublicCountry && normalizedIpCountry === normalizedPublicCountry) {
    return { score: 13, note: 'Last login IP country matches the public ship-from country.' }
  }
  if (normalizedShippingCountry || normalizedPublicCountry) {
    return { score: 4, note: 'IP geography does not match the stored ship-from country.' }
  }
  return { score: 9, note: 'IP geography exists, but no shipping country is on file yet.' }
}

function transactionHistoryScore(summary?: Partial<ReputationSummary> | null) {
  const completedTrades = Math.max(0, Number(summary?.completed_trades_count ?? 0))
  const successfulShipments = Math.max(0, Number(summary?.successful_shipments_count ?? 0))
  const positiveFeedback = Math.max(0, Number(summary?.positive_feedback_count ?? 0))
  const negativeFeedback = Math.max(0, Number(summary?.negative_feedback_count ?? 0))

  const rawScore =
    Math.min(12, completedTrades * 2.5) +
    Math.min(8, successfulShipments * 1.5) +
    Math.min(5, positiveFeedback * 1.25) -
    Math.min(12, negativeFeedback * 6)

  if (completedTrades === 0 && successfulShipments === 0) {
    return {
      score: clamp(rawScore, 4, 10),
      note: 'No completed transaction history yet, so the score stays conservative.',
    }
  }

  return {
    score: clamp(rawScore, 0, 25),
    note:
      negativeFeedback > 0
        ? 'Past transaction history includes at least one negative signal.'
        : 'Past transaction history is supporting trust.',
  }
}

function userRatingScore(summary?: Partial<ReputationSummary> | null) {
  const rating =
    summary?.internal_user_rating ??
    (summary?.external_rating_average != null ? Number(summary.external_rating_average) : null)
  const ratingCount = Math.max(
    Number(summary?.external_rating_count ?? 0),
    Number(summary?.positive_feedback_count ?? 0) + Number(summary?.negative_feedback_count ?? 0)
  )

  if (rating == null || !Number.isFinite(rating)) {
    return { score: 8, note: 'No user rating has been recorded yet.' }
  }

  const normalized = clamp((rating / 5) * 18, 0, 18)
  const confidenceBonus = ratingCount >= 10 ? 2 : ratingCount >= 3 ? 1 : 0

  return {
    score: clamp(Math.round(normalized + confidenceBonus), 0, 20),
    note:
      ratingCount >= 3
        ? 'User rating has enough volume to contribute meaningfully.'
        : 'User rating exists, but sample size is still light.',
  }
}

function trustModifier(summary?: Partial<ReputationSummary> | null) {
  let modifier = 0
  const notes: string[] = []

  if (summary?.is_manually_verified) {
    modifier += 4
    notes.push('Manual verification gives the score an internal confidence boost.')
  }
  if (summary?.is_known_user) {
    modifier += 3
    notes.push('Known-user status adds confidence.')
  }
  if (summary?.is_friend_of_platform) {
    modifier += 2
    notes.push('Friend-of-platform status adds a small confidence boost.')
  }

  switch (summary?.banned_status) {
    case 'watchlist':
      modifier -= 8
      notes.push('Watchlist status is pulling the score down.')
      break
    case 'restricted':
      modifier -= 18
      notes.push('Restricted status sharply lowers the internal score.')
      break
    case 'banned':
      modifier -= 40
      notes.push('Banned status forces a very low internal score.')
      break
    default:
      break
  }

  return { modifier, notes }
}

export function calculateInternalValidationSummary(
  summary?: Partial<ReputationSummary> | null,
  profile?: Partial<PublicProfile> | null,
  privateProfile?: Partial<PrivateProfile> | null
): InternalValidationSummary {
  const activity = activityScore(summary?.last_seen_at)
  const reply = replySpeedScore(summary?.avg_trade_reply_hours)
  const location = locationScore(
    summary?.last_login_ip_country,
    profile?.location_country,
    privateProfile?.shipping_country
  )
  const history = transactionHistoryScore(summary)
  const rating = userRatingScore(summary)
  const modifierState = trustModifier(summary)

  const rawScore =
    activity.score +
    reply.score +
    location.score +
    history.score +
    rating.score +
    modifierState.modifier
  const score = clamp(Math.round(rawScore), 0, 100)

  const tier: InternalValidationSummary['tier'] =
    score >= 85 ? 'High Confidence' : score >= 70 ? 'Trusted' : score >= 50 ? 'Monitor' : 'Needs Review'

  return {
    score,
    tier,
    activityScore: activity.score,
    replyScore: reply.score,
    locationScore: location.score,
    historyScore: history.score,
    ratingScore: rating.score,
    modifier: modifierState.modifier,
    notes: [
      activity.note,
      reply.note,
      location.note,
      history.note,
      rating.note,
      ...modifierState.notes,
    ],
  }
}

export function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

export function isProfileSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.profiles'") ||
    message.includes('relation "public.profiles"') ||
    message.includes("relation 'public.profile_private'") ||
    message.includes('relation "public.profile_private"') ||
    message.includes("relation 'public.profile_verifications'") ||
    message.includes('relation "public.profile_verifications"') ||
    message.includes("relation 'public.profile_reputation_summary'") ||
    message.includes('relation "public.profile_reputation_summary"') ||
    message.includes("Could not find the relation 'public.profiles'") ||
    message.includes("Could not find the relation 'public.profile_private'") ||
    message.includes("Could not find the relation 'public.profile_verifications'") ||
    message.includes("Could not find the relation 'public.profile_reputation_summary'")
  )
}

export function getProfileHints(
  profile?: Partial<PublicProfile> | null,
  privateProfile?: Partial<PrivateProfile> | null
) {
  const hints: string[] = []

  if (!profile?.display_name) hints.push('Add a display name so buyers know who they are trading with.')
  if (!profile?.location_country) hints.push('Set your ship-from country to improve match confidence.')
  if (!profile?.marketplace_tagline) hints.push('Add a short trader tagline to make your profile feel personal.')
  if (
    !profile?.tcgplayer_url &&
    !profile?.ebay_url &&
    !profile?.whatnot_url &&
    !profile?.cardmarket_url
  ) {
    hints.push('Link at least one real-world marketplace account to strengthen trust.')
  }
  if (!privateProfile?.support_email) hints.push('Add a support email for customer service follow-up.')
  if (!privateProfile?.shipping_country || !privateProfile?.shipping_city) {
    hints.push('Complete your shipping address so logistics are ready when trades go live.')
  }
  if (!privateProfile?.government_id_storage_key) {
    hints.push('Reserve an ID verification placeholder so higher-trust trades can be enabled later.')
  }

  return hints.slice(0, 4)
}

export function getProfileCompletion(
  profile?: Partial<PublicProfile> | null,
  privateProfile?: Partial<PrivateProfile> | null,
  summary?: Partial<ReputationSummary> | null
) {
  const checks = [
    !!profile?.display_name,
    !!profile?.username,
    !!profile?.bio,
    !!profile?.location_country,
    !!profile?.location_region,
    !!profile?.marketplace_tagline,
    !!profile?.tcgplayer_url || !!profile?.ebay_url || !!profile?.whatnot_url || !!profile?.cardmarket_url,
    !!privateProfile?.support_email,
    !!privateProfile?.shipping_name,
    !!privateProfile?.shipping_address_line_1,
    !!privateProfile?.shipping_city,
    !!privateProfile?.shipping_country,
    !!privateProfile?.government_id_storage_key,
    !!summary?.is_manually_verified || !!summary?.is_known_user || !!summary?.is_friend_of_platform,
  ]

  const completed = checks.filter(Boolean).length
  return Math.round((completed / checks.length) * 100)
}

export function getTrustBadges(
  summary?: Partial<ReputationSummary> | null,
  verifications?: Array<Partial<ProfileVerification>> | null
) {
  const badges = new Set<string>(summary?.verification_badges ?? [])

  if (summary?.is_manually_verified) badges.add('Manually Verified')
  if (summary?.is_known_user) badges.add('Known User')
  if (summary?.is_friend_of_platform) badges.add('Friend Of DeckSwap')

  for (const verification of verifications ?? []) {
    if (verification.status !== 'verified') continue

    if (verification.verification_type === 'government_id') badges.add('ID Verified')
    if (verification.verification_type === 'shipping_address') badges.add('Address Verified')
    if (verification.verification_type === 'seller_attestation') badges.add('Seller Attested')
  }

  return [...badges]
}

export function formatShipFrom(profile?: Partial<PublicProfile> | null) {
  const parts = [profile?.location_region, profile?.location_country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Location not set'
}

export function marketplaceLinks(profile?: Partial<PublicProfile> | null) {
  return [
    { label: 'TCGplayer', href: profile?.tcgplayer_url },
    { label: 'eBay', href: profile?.ebay_url },
    { label: 'Cardmarket', href: profile?.cardmarket_url },
    { label: 'Whatnot', href: profile?.whatnot_url },
    { label: 'Instagram', href: profile?.instagram_url },
    { label: 'YouTube', href: profile?.youtube_url },
    { label: 'Website', href: profile?.website_url },
  ].filter((item) => !!item.href) as Array<{ label: string; href: string }>
}
