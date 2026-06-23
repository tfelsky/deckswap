// Spark (SP) — the "soft", non-economic engagement currency.
//
// SP is minted for signalling activity (listing, add-to-cart, profile completion,
// daily visits) and can ONLY ever buy status: profile tier, badges, listing reach.
// It is never redeemable and has no USD basis. The anti-farm story is two-fold:
//   * per-entity dedupe (enforced by the unique constraint in the ledger), and
//   * per-reason daily caps (enforced by award_engagement_points).
// These helpers describe the earn rates, the daily ceilings, and the tier ladder.

export type EngagementReason =
  | 'list_item'
  | 'cart_add'
  | 'cart_add_received'
  | 'profile_complete'
  | 'daily_visit'
  | 'delist_reversal'
  | 'decay'
  | 'manual_adjustment'

// Earn rates and ceilings. dailyCap of null means "no daily cap" (the per-entity
// dedupe already makes the action one-shot, e.g. listing a given item once).
export const ENGAGEMENT_RULES = {
  list_item: { points: 10, dailyCap: null },
  cart_add: { points: 1, dailyCap: 20 },
  cart_add_received: { points: 2, dailyCap: 40 },
  profile_complete: { points: 25, dailyCap: null },
  daily_visit: { points: 5, dailyCap: null },
} as const satisfies Record<string, { points: number; dailyCap: number | null }>

export type EngagementEarnReason = keyof typeof ENGAGEMENT_RULES

/** Window during which delisting an item claws back its listing award. */
export const DELIST_REVERSAL_WINDOW_HOURS = 24

export type EngagementTierKey = 'newcomer' | 'regular' | 'trusted' | 'veteran' | 'legend'

type EngagementTier = {
  key: EngagementTierKey
  label: string
  /** Lifetime SP required to reach this tier. */
  threshold: number
}

// Ordered high → low so resolveEngagementTier can return the first match.
// Thresholds MUST match public.engagement_tier() in docs/sql/reward-points.sql.
export const ENGAGEMENT_TIERS: readonly EngagementTier[] = [
  { key: 'legend', label: 'Legend', threshold: 5000 },
  { key: 'veteran', label: 'Veteran', threshold: 2000 },
  { key: 'trusted', label: 'Trusted', threshold: 500 },
  { key: 'regular', label: 'Regular', threshold: 100 },
  { key: 'newcomer', label: 'Newcomer', threshold: 0 },
] as const

/** Points a single occurrence of an action is worth, ignoring daily caps. */
export function engagementPointsFor(reason: EngagementEarnReason) {
  return ENGAGEMENT_RULES[reason].points
}

/**
 * How many SP can still be granted today for an action, given what's already been
 * awarded. Mirrors the daily-cap clamp inside award_engagement_points so the UI can
 * preview the award without a round-trip. Returns 0 when capped out.
 */
export function remainingDailyAllowance(reason: EngagementEarnReason, awardedToday: number) {
  const cap = ENGAGEMENT_RULES[reason].dailyCap
  const safeAwarded = Math.max(0, Math.floor(Number(awardedToday) || 0))
  if (cap === null) return ENGAGEMENT_RULES[reason].points
  return Math.max(0, cap - safeAwarded)
}

/** What an action will actually mint right now, after the daily cap. */
export function grantableEngagementPoints(reason: EngagementEarnReason, awardedToday: number) {
  return Math.min(ENGAGEMENT_RULES[reason].points, remainingDailyAllowance(reason, awardedToday))
}

export type EngagementTierProgress = {
  tier: EngagementTier
  nextTier: EngagementTier | null
  /** SP still needed to reach the next tier (0 at the top). */
  pointsToNextTier: number
  /** 0–1 progress through the current tier toward the next. */
  progress: number
}

/** Resolve the tier for a lifetime SP total. */
export function resolveEngagementTier(lifetimeEarned: number): EngagementTier {
  const safe = Math.max(0, Math.floor(Number(lifetimeEarned) || 0))
  return ENGAGEMENT_TIERS.find((tier) => safe >= tier.threshold) ?? ENGAGEMENT_TIERS[ENGAGEMENT_TIERS.length - 1]
}

/** Tier plus progress toward the next one — everything a status badge needs. */
export function resolveEngagementTierProgress(lifetimeEarned: number): EngagementTierProgress {
  const safe = Math.max(0, Math.floor(Number(lifetimeEarned) || 0))
  const tier = resolveEngagementTier(safe)
  // Tiers are ordered high → low; the next tier up is the entry just before this one.
  const index = ENGAGEMENT_TIERS.findIndex((entry) => entry.key === tier.key)
  const nextTier = index > 0 ? ENGAGEMENT_TIERS[index - 1] : null

  if (!nextTier) {
    return { tier, nextTier: null, pointsToNextTier: 0, progress: 1 }
  }

  const span = nextTier.threshold - tier.threshold
  const earnedIntoTier = safe - tier.threshold
  const progress = span > 0 ? Math.min(1, Math.max(0, earnedIntoTier / span)) : 1

  return {
    tier,
    nextTier,
    pointsToNextTier: Math.max(0, nextTier.threshold - safe),
    progress,
  }
}
