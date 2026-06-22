import { describe, expect, it } from 'vitest'
import {
  ACHIEVEMENT_GOALS_PER_PLAYER,
  buildCommanderAchievementResults,
  COMMANDER_ACHIEVEMENT_GOALS,
  countCompletedAchievementGoals,
  MAX_ACHIEVEMENT_COMPLETIONS_PER_GAME,
  selectCommanderAchievementGoals,
} from '../achievement-goals'

describe('Commander achievement goals', () => {
  it('includes the Tick Tock goal', () => {
    expect(COMMANDER_ACHIEVEMENT_GOALS).toContainEqual(
      expect.objectContaining({
        id: 'tick-tock',
        title: 'Tick Tock',
      })
    )
  })

  it('selects five stable random goals per player and seed', () => {
    const first = selectCommanderAchievementGoals('game-a', 'player-1')
    const second = selectCommanderAchievementGoals('game-a', 'player-1')
    const otherPlayer = selectCommanderAchievementGoals('game-a', 'player-2')

    expect(first).toHaveLength(ACHIEVEMENT_GOALS_PER_PLAYER)
    expect(second.map((goal) => goal.id)).toEqual(first.map((goal) => goal.id))
    expect(otherPlayer.map((goal) => goal.id)).not.toEqual(first.map((goal) => goal.id))
  })

  it('stores assigned goals with completed flags and caps scoring count at five', () => {
    const assigned = selectCommanderAchievementGoals('game-b', 'player-1')
    const results = buildCommanderAchievementResults(
      'game-b',
      'player-1',
      assigned.map((goal) => goal.id).concat(['not-assigned'])
    )

    expect(results).toHaveLength(ACHIEVEMENT_GOALS_PER_PLAYER)
    expect(results.every((goal) => goal.completed)).toBe(true)
    expect(countCompletedAchievementGoals(results)).toBe(MAX_ACHIEVEMENT_COMPLETIONS_PER_GAME)
  })
})
