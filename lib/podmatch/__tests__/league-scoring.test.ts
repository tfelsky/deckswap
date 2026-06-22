import { describe, expect, it } from 'vitest'
import {
  CASUAL_BALANCED,
  calculateStandings,
  resolveScoringConfig,
  scoreGamePlayer,
  type GamePlayerResult,
} from '../league-scoring'

function result(partial: Partial<GamePlayerResult> & { player_id: string }): GamePlayerResult {
  return {
    placement: null,
    eliminations: 0,
    combo_win: false,
    no_show: false,
    sportsmanship: false,
    ...partial,
  }
}

describe('scoreGamePlayer', () => {
  it('awards casual-balanced placement points', () => {
    expect(scoreGamePlayer(result({ player_id: 'a', placement: 1 }), 4, CASUAL_BALANCED).total).toBe(
      5 + 1 // win + survived to final two
    )
    expect(scoreGamePlayer(result({ player_id: 'b', placement: 2 }), 4, CASUAL_BALANCED).total).toBe(
      3 + 1
    )
    expect(scoreGamePlayer(result({ player_id: 'c', placement: 3 }), 4, CASUAL_BALANCED).total).toBe(2)
    expect(scoreGamePlayer(result({ player_id: 'd', placement: 4 }), 4, CASUAL_BALANCED).total).toBe(1)
  })

  it('adds elimination and sportsmanship points with an audit trail', () => {
    const scored = scoreGamePlayer(
      result({ player_id: 'a', placement: 1, eliminations: 2, sportsmanship: true }),
      4,
      CASUAL_BALANCED
    )
    // win(5) + final-two(1) + 2 elims(2) + sportsmanship(1)
    expect(scored.total).toBe(9)
    expect(scored.breakdown.map((b) => b.label)).toContain('Eliminations ×2')
    expect(scored.breakdown.map((b) => b.label)).toContain('Sportsmanship vote')
  })

  it('adds completed achievement goals as bonus points', () => {
    const scored = scoreGamePlayer(
      result({ player_id: 'a', placement: 2, achievement_count: 3 }),
      4,
      CASUAL_BALANCED
    )
    // second(3) + final-two(1) + three achievements(3)
    expect(scored.total).toBe(7)
    expect(scored.breakdown.map((b) => b.label)).toContain('Achievement goals x3')
  })

  it('applies a no-show penalty and ignores other fields', () => {
    const scored = scoreGamePlayer(
      result({ player_id: 'a', placement: 1, eliminations: 3, no_show: true }),
      4,
      CASUAL_BALANCED
    )
    expect(scored.total).toBe(-3)
    expect(scored.breakdown).toHaveLength(1)
  })

  it('applies a soft handicap to bonus points but not the win itself', () => {
    const scored = scoreGamePlayer(
      result({ player_id: 'a', placement: 1, eliminations: 2 }),
      4,
      CASUAL_BALANCED,
      { bonusMultiplier: 0.5, catchUpBonus: 0 }
    )
    // Win(5, full) + final-two(1 * 0.5 = 0.5) + 2 elims(2 * 0.5 = 1)
    expect(scored.total).toBe(6.5)
    expect(scored.breakdown.find((b) => b.label === 'Win')?.points).toBe(5)
  })

  it('adds a catch-up bonus for trailing players', () => {
    const scored = scoreGamePlayer(
      result({ player_id: 'a', placement: 3 }),
      4,
      CASUAL_BALANCED,
      { bonusMultiplier: 1, catchUpBonus: 1 }
    )
    expect(scored.total).toBe(3) // third(2) + catch-up(1)
    expect(scored.breakdown.map((b) => b.label)).toContain('Catch-up bonus')
  })

  it('honors a custom scoring config from league settings', () => {
    const config = resolveScoringConfig({ scoring: { placement: { '1': 10 }, elimination: 2 } })
    const scored = scoreGamePlayer(
      result({ player_id: 'a', placement: 1, eliminations: 1 }),
      4,
      config
    )
    // custom win(10) + final-two(1, default) + elim(2)
    expect(scored.total).toBe(13)
  })
})

describe('calculateStandings', () => {
  const players = [
    { id: 'a', display_name: 'Alice' },
    { id: 'b', display_name: 'Bob' },
    { id: 'c', display_name: 'Carol' },
  ]

  it('ranks by points then wins then average placement', () => {
    const lines = [
      { player_id: 'a', placement: 1, points_awarded: 6 },
      { player_id: 'b', placement: 2, points_awarded: 4 },
      { player_id: 'c', placement: 3, points_awarded: 2 },
      { player_id: 'a', placement: 2, points_awarded: 4 },
      { player_id: 'b', placement: 1, points_awarded: 6 },
      { player_id: 'c', placement: 3, points_awarded: 2 },
    ]
    const standings = calculateStandings(lines, players)
    expect(standings.map((r) => r.display_name)).toEqual(['Alice', 'Bob', 'Carol'])
    expect(standings[0]).toMatchObject({ rank: 1, points: 10, wins: 1, games: 2 })
    expect(standings[2]).toMatchObject({ rank: 3, points: 4, average_placement: 3 })
  })

  it('includes players with no games at the bottom', () => {
    const standings = calculateStandings([{ player_id: 'a', placement: 1, points_awarded: 5 }], players)
    expect(standings[0].display_name).toBe('Alice')
    const carol = standings.find((r) => r.player_id === 'c')!
    expect(carol).toMatchObject({ points: 0, games: 0, average_placement: null })
  })
})
