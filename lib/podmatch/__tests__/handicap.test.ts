import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HANDICAP,
  computeHandicap,
  resolveHandicapConfig,
  type HandicapConfig,
  type HandicapInput,
} from '../handicap'

const ENABLED: HandicapConfig = { ...DEFAULT_HANDICAP, enabled: true }

function input(partial: Partial<HandicapInput>): HandicapInput {
  return {
    player_rating: 1500,
    deck_rating: 1500,
    recent_win_rate: 0.2,
    average_placement_last_5: 2.5,
    league_rank: 5,
    league_size: 9,
    deck_power_score: 6,
    ...partial,
  }
}

describe('computeHandicap', () => {
  it('is neutral when disabled', () => {
    const out = computeHandicap(input({ league_rank: 1 }), DEFAULT_HANDICAP)
    expect(out.bonus_point_multiplier).toBe(1)
    expect(out.catch_up_bonus).toBe(0)
    expect(out.explanation[0]).toMatch(/disabled/i)
  })

  it('flags leaders for stronger pods and reduced bonus', () => {
    const out = computeHandicap(
      input({ league_rank: 1, league_size: 9, recent_win_rate: 0.6, player_rating: 1650 }),
      ENABLED
    )
    expect(out.band).toBe('leader')
    expect(out.matchmaking_adjustment).toBe('stronger_pods')
    expect(out.bonus_point_multiplier).toBe(0.85)
    expect(out.starting_life_adjustment).toBe(0) // soft only
  })

  it('gives trailers a catch-up bonus', () => {
    const out = computeHandicap(
      input({ league_rank: 9, league_size: 9, player_rating: 1380, average_placement_last_5: 3.4 }),
      ENABLED
    )
    expect(out.band).toBe('trailer')
    expect(out.catch_up_bonus).toBe(1)
    expect(out.bonus_point_multiplier).toBe(1)
  })

  it('leaves mid-table players neutral', () => {
    const out = computeHandicap(
      input({ league_rank: 5, league_size: 9, recent_win_rate: 0.2, player_rating: 1500, average_placement_last_5: 2.4 }),
      ENABLED
    )
    expect(out.band).toBe('neutral')
    expect(out.bonus_point_multiplier).toBe(1)
    expect(out.catch_up_bonus).toBe(0)
  })

  it('reads a custom config from league settings', () => {
    const config = resolveHandicapConfig({ handicap: { enabled: true, bonus_point_multiplier: 0.5 } })
    expect(config.enabled).toBe(true)
    expect(config.bonus_point_multiplier).toBe(0.5)
    expect(config.catch_up_bonus).toBe(DEFAULT_HANDICAP.catch_up_bonus)
  })
})
