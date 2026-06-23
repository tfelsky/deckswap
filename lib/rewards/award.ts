// Server-side wrappers around the reward/engagement point RPCs.
//
// These are deliberately thin: they call the security-definer functions in
// docs/sql/reward-points.sql and swallow "schema not deployed yet" errors so the
// rest of a checkout/listing flow never breaks if the migration hasn't been run.
// The economic decisions (how many points, off which basis) live in the pure
// helpers in ./points and ./engagement — call those at the call site, pass the
// resulting amount here.

import type { RewardReason } from '@/lib/rewards/points'
import type { EngagementReason } from '@/lib/rewards/engagement'

export function isRewardPointsSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes('award_reward_points') ||
    message.includes('redeem_reward_points') ||
    message.includes('award_engagement_points') ||
    message.includes('reward_point_entries') ||
    message.includes('reward_point_balances') ||
    message.includes('engagement_point_entries') ||
    message.includes('engagement_point_balances')
  )
}

type AwardRewardArgs = {
  userId: string
  amount: number
  reason: RewardReason
  sourceType?: string | null
  sourceId?: string | null
  usdBasis?: number | null
  metadata?: Record<string, unknown>
}

/**
 * Mint MP. Idempotent on (user, reason, source) at the database level, so this is
 * safe to call from order-completion paths that may run more than once. Returns the
 * number of points actually minted (0 if it was a no-op or the schema is missing).
 */
export async function awardRewardPoints(supabase: any, args: AwardRewardArgs) {
  if (!args.userId || !Number.isFinite(args.amount) || args.amount <= 0) return 0

  try {
    const { data, error } = await supabase.rpc('award_reward_points', {
      p_user_id: args.userId,
      p_amount: Math.floor(args.amount),
      p_reason: args.reason,
      p_source_type: args.sourceType ?? null,
      p_source_id: args.sourceId ?? null,
      p_usd_basis: args.usdBasis ?? null,
      p_metadata: args.metadata ?? {},
    })

    if (error) {
      if (!isRewardPointsSchemaMissing(error.message)) {
        console.error('Failed to award reward points:', error)
      }
      return 0
    }

    return Number(data ?? 0)
  } catch (error) {
    console.error('Failed to award reward points:', error)
    return 0
  }
}

type AwardEngagementArgs = {
  userId: string
  amount: number
  reason: EngagementReason
  sourceType?: string | null
  sourceId?: string | null
  dailyCap?: number | null
  metadata?: Record<string, unknown>
}

/**
 * Mint SP. Idempotent on (user, reason, source); the RPC also clamps to the per-day
 * cap when one is passed. Returns the number of points actually minted.
 */
export async function awardEngagementPoints(supabase: any, args: AwardEngagementArgs) {
  if (!args.userId || !Number.isFinite(args.amount) || args.amount <= 0) return 0

  try {
    const { data, error } = await supabase.rpc('award_engagement_points', {
      p_user_id: args.userId,
      p_amount: Math.floor(args.amount),
      p_reason: args.reason,
      p_source_type: args.sourceType ?? null,
      p_source_id: args.sourceId ?? null,
      p_daily_cap: args.dailyCap ?? null,
      p_metadata: args.metadata ?? {},
    })

    if (error) {
      if (!isRewardPointsSchemaMissing(error.message)) {
        console.error('Failed to award engagement points:', error)
      }
      return 0
    }

    return Number(data ?? 0)
  } catch (error) {
    console.error('Failed to award engagement points:', error)
    return 0
  }
}
