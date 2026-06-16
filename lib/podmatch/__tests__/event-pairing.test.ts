import { describe, expect, it } from 'vitest'
import { pairEventRound, playerPairKey, type EventPlayer } from '../event-pairing'

function player(id: string, wins = 0, games = 0): EventPlayer {
  return { id, display_name: id, wins, games_played: games }
}

describe('pairEventRound', () => {
  it('benches everyone when fewer than three players', () => {
    const result = pairEventRound([player('a'), player('b')], { roundNumber: 1 })
    expect(result.pods).toHaveLength(0)
    expect(result.byes.sort()).toEqual(['a', 'b'])
  })

  it('seats every player into pods of 3-4', () => {
    const players = Array.from({ length: 11 }, (_, i) => player(`p${i}`))
    const result = pairEventRound(players, { roundNumber: 1 })
    const seated = result.pods.flatMap((p) => p.player_ids)
    expect(seated.length + result.byes.length).toBe(11)
    expect(seated.length).toBe(11)
    for (const pod of result.pods) {
      expect(pod.player_ids.length).toBeGreaterThanOrEqual(3)
      expect(pod.player_ids.length).toBeLessThanOrEqual(4)
    }
  })

  it('is deterministic for the same inputs', () => {
    const players = Array.from({ length: 8 }, (_, i) => player(`p${i}`))
    const a = pairEventRound(players, { roundNumber: 1 })
    const b = pairEventRound(players, { roundNumber: 1 })
    expect(a).toEqual(b)
  })

  it('groups players by win record in later rounds', () => {
    const players = [
      player('w1', 3),
      player('w2', 3),
      player('w3', 3),
      player('l1', 0),
      player('l2', 0),
      player('l3', 0),
    ]
    const result = pairEventRound(players, { roundNumber: 2 })
    // Two tables of three: the high-win players should not be mixed with the
    // winless ones.
    const tableWithW1 = result.pods.find((p) => p.player_ids.includes('w1'))!
    expect(tableWithW1.player_ids.sort()).toEqual(['w1', 'w2', 'w3'])
  })

  it('breaks up rematches when win records allow it', () => {
    const players = [
      player('a', 1),
      player('b', 1),
      player('c', 1),
      player('d', 1),
      player('e', 1),
      player('f', 1),
    ]
    // a,b,c played together last round; with equal records the swap pass
    // should be free to separate at least one of them.
    const recentPairs = new Set([
      playerPairKey('a', 'b'),
      playerPairKey('a', 'c'),
      playerPairKey('b', 'c'),
    ])
    const result = pairEventRound(players, { roundNumber: 2, recentPairs })
    const tableWithA = result.pods.find((p) => p.player_ids.includes('a'))!
    const rematches = ['b', 'c'].filter((id) => tableWithA.player_ids.includes(id))
    expect(rematches.length).toBeLessThan(2)
  })
})
