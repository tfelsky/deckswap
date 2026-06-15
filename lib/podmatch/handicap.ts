// PodMatch handicap engine (spec Feature I).
//
// Soft by default and fully transparent: every adjustment is a plain function
// of visible inputs (ratings, recent results, league rank, deck power) and
// ships with an explanation. No hidden, AI-only decisions, and the whole thing
// can be disabled per league.

import { INITIAL_RATING } from './ratings'

export type HandicapConfig = {
  enabled: boolean
  type: 'soft'
  bonus_point_multiplier: number // leaders earn reduced bonus points
  catch_up_bonus: number // trailers earn a flat catch-up bonus
}

export const DEFAULT_HANDICAP: HandicapConfig = {
  enabled: false,
  type: 'soft',
  bonus_point_multiplier: 0.85,
  catch_up_bonus: 1,
}

export function resolveHandicapConfig(settings: unknown): HandicapConfig {
  const provided =
    settings && typeof settings === 'object' && 'handicap' in (settings as Record<string, unknown>)
      ? ((settings as Record<string, unknown>).handicap as Partial<HandicapConfig>)
      : undefined
  if (!provided) return DEFAULT_HANDICAP
  return {
    enabled: provided.enabled ?? DEFAULT_HANDICAP.enabled,
    type: 'soft',
    bonus_point_multiplier:
      provided.bonus_point_multiplier ?? DEFAULT_HANDICAP.bonus_point_multiplier,
    catch_up_bonus: provided.catch_up_bonus ?? DEFAULT_HANDICAP.catch_up_bonus,
  }
}

export type HandicapInput = {
  player_rating: number
  deck_rating: number
  recent_win_rate: number // 0..1 over recent games
  average_placement_last_5: number | null
  league_rank: number // 1 = top
  league_size: number
  deck_power_score: number // 0..10
}

export type HandicapOutput = {
  type: 'soft'
  band: 'leader' | 'neutral' | 'trailer'
  matchmaking_adjustment: 'stronger_pods' | 'neutral' | 'easier_pods'
  bonus_point_multiplier: number
  starting_life_adjustment: number
  catch_up_bonus: number
  explanation: string[]
}

function isLeader(input: HandicapInput): boolean {
  const topThird = input.league_rank <= Math.ceil(input.league_size / 3)
  return (
    (input.league_rank > 0 && topThird) ||
    input.recent_win_rate >= 0.5 ||
    input.player_rating >= INITIAL_RATING + 100
  )
}

function isTrailer(input: HandicapInput): boolean {
  const bottomThird = input.league_rank > Math.ceil((input.league_size * 2) / 3)
  return (
    (input.league_size > 0 && bottomThird) ||
    input.player_rating <= INITIAL_RATING - 75 ||
    (input.average_placement_last_5 != null && input.average_placement_last_5 >= 3)
  )
}

/**
 * Compute the soft handicap for one player. Leaders get stronger pods and a
 * reduced bonus multiplier; trailers get a catch-up bonus (and precon/jank
 * eligibility note). Everyone else is neutral.
 */
export function computeHandicap(input: HandicapInput, config: HandicapConfig): HandicapOutput {
  if (!config.enabled) {
    return {
      type: 'soft',
      band: 'neutral',
      matchmaking_adjustment: 'neutral',
      bonus_point_multiplier: 1,
      starting_life_adjustment: 0,
      catch_up_bonus: 0,
      explanation: ['Handicaps are disabled for this league.'],
    }
  }

  const leader = isLeader(input)
  const trailer = !leader && isTrailer(input)
  const explanation: string[] = []

  if (leader) {
    explanation.push(
      `Ranked ${input.league_rank}/${input.league_size} with a ${Math.round(
        input.recent_win_rate * 100
      )}% recent win rate and a ${input.player_rating} rating.`
    )
    explanation.push(
      `Soft handicap: placed into stronger pods and bonus points scaled to ${config.bonus_point_multiplier}×. Wins still score in full.`
    )
    return {
      type: 'soft',
      band: 'leader',
      matchmaking_adjustment: 'stronger_pods',
      bonus_point_multiplier: config.bonus_point_multiplier,
      starting_life_adjustment: 0,
      catch_up_bonus: 0,
      explanation,
    }
  }

  if (trailer) {
    explanation.push(
      `Ranked ${input.league_rank}/${input.league_size} with a ${input.player_rating} rating${
        input.average_placement_last_5 != null
          ? ` and an average placement of ${input.average_placement_last_5}`
          : ''
      }.`
    )
    explanation.push(
      `Soft handicap: +${config.catch_up_bonus} catch-up bonus per game${
        input.deck_power_score <= 5 ? ' and precon/jank bonus eligibility' : ''
      }.`
    )
    return {
      type: 'soft',
      band: 'trailer',
      matchmaking_adjustment: 'easier_pods',
      bonus_point_multiplier: 1,
      starting_life_adjustment: 0,
      catch_up_bonus: config.catch_up_bonus,
      explanation,
    }
  }

  explanation.push('Mid-table: no adjustment applied.')
  return {
    type: 'soft',
    band: 'neutral',
    matchmaking_adjustment: 'neutral',
    bonus_point_multiplier: 1,
    starting_life_adjustment: 0,
    catch_up_bonus: 0,
    explanation,
  }
}
