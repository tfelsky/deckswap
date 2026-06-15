import { describe, expect, it } from 'vitest'
import { INITIAL_RATING, kFactor, updateRatings, type EloEntry } from '../ratings'

function entry(id: string, placement: number | null, rating = INITIAL_RATING, games = 0): EloEntry {
  return { id, placement, rating, games }
}

describe('kFactor', () => {
  it('follows the provisional → mature → confident schedule', () => {
    expect(kFactor(0)).toBe(40)
    expect(kFactor(9)).toBe(40)
    expect(kFactor(10)).toBe(20)
    expect(kFactor(29)).toBe(20)
    expect(kFactor(30)).toBe(12)
  })
})

describe('updateRatings', () => {
  it('is deterministic and zero-sum-ish around equal ratings', () => {
    const entries = [entry('a', 1), entry('b', 2), entry('c', 3), entry('d', 4)]
    const a = updateRatings(entries)
    const b = updateRatings(entries)
    expect(a).toEqual(b)
    const totalDelta = a.reduce((s, u) => s + u.delta, 0)
    // Rounding aside, deltas should roughly cancel.
    expect(Math.abs(totalDelta)).toBeLessThanOrEqual(2)
  })

  it('rewards the winner and penalizes the loser', () => {
    const [first, , , last] = updateRatings([
      entry('a', 1),
      entry('b', 2),
      entry('c', 3),
      entry('d', 4),
    ])
    expect(first.delta).toBeGreaterThan(0)
    expect(last.delta).toBeLessThan(0)
  })

  it('moves provisional ratings faster than confident ones', () => {
    const provisional = updateRatings([
      entry('a', 1, INITIAL_RATING, 0),
      entry('b', 2, INITIAL_RATING, 0),
    ])[0]
    const confident = updateRatings([
      entry('a', 1, INITIAL_RATING, 50),
      entry('b', 2, INITIAL_RATING, 50),
    ])[0]
    expect(provisional.delta).toBeGreaterThan(confident.delta)
  })

  it('treats tied placements as a draw', () => {
    const updates = updateRatings([entry('a', 1, 1600), entry('b', 1, 1400)])
    // Higher-rated player drawing a lower-rated one should lose a little.
    const a = updates.find((u) => u.id === 'a')!
    expect(a.delta).toBeLessThanOrEqual(0)
  })

  it('skips entries without a placement', () => {
    const updates = updateRatings([entry('a', 1), entry('b', 2), entry('c', null)])
    expect(updates.find((u) => u.id === 'c')!.delta).toBe(0)
  })
})
