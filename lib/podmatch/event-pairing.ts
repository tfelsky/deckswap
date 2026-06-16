// PodMatch in-store event pairing (mobile-first walk-in events).
//
// Swiss-style pairing on PLAYERS — no deck scores required, unlike the
// league pod generator. Round 1 is seeded and deterministic; later rounds
// group players with similar win records and break up rematches. Pure and
// deterministic, so the same inputs always yield the same tables.

import { podSizes } from './pods'

export type EventPlayer = {
  id: string
  display_name: string
  wins: number
  games_played: number
}

export type EventPod = {
  table_number: number
  player_ids: string[]
}

export type EventPairing = {
  pods: EventPod[]
  /** Players left unseated (only happens when fewer than 3 remain). */
  byes: string[]
}

export function playerPairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/** Stable, deterministic per-id hash so ordering isn't alphabetical. */
function hashId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function repeatsInGroup(group: string[], recent: Set<string>): number {
  let count = 0
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      if (recent.has(playerPairKey(group[i], group[j]))) count++
    }
  }
  return count
}

function winsSpread(group: string[], wins: Map<string, number>): number {
  if (group.length === 0) return 0
  const values = group.map((id) => wins.get(id) ?? 0)
  return Math.max(...values) - Math.min(...values)
}

/**
 * Local-search swap pass: trade players between equal-size tables when it
 * reduces rematches without meaningfully widening the win-record gap.
 * Deterministic — fixed iteration order, first improving swap wins.
 */
function reduceRepeats(
  groups: string[][],
  recent: Set<string>,
  wins: Map<string, number>
): void {
  const WINS_TOLERANCE = 1
  let improved = true
  let guard = 0
  while (improved && guard++ < 100) {
    improved = false
    for (let gi = 0; gi < groups.length && !improved; gi++) {
      for (let gj = gi + 1; gj < groups.length && !improved; gj++) {
        const A = groups[gi]
        const B = groups[gj]
        if (A.length !== B.length) continue
        const beforeRepeats = repeatsInGroup(A, recent) + repeatsInGroup(B, recent)
        const beforeSpread = winsSpread(A, wins) + winsSpread(B, wins)
        for (let ai = 0; ai < A.length && !improved; ai++) {
          for (let bj = 0; bj < B.length && !improved; bj++) {
            const tmp = A[ai]
            A[ai] = B[bj]
            B[bj] = tmp
            const afterRepeats = repeatsInGroup(A, recent) + repeatsInGroup(B, recent)
            const afterSpread = winsSpread(A, wins) + winsSpread(B, wins)
            if (afterRepeats < beforeRepeats && afterSpread <= beforeSpread + WINS_TOLERANCE) {
              improved = true
            } else {
              const t2 = A[ai]
              A[ai] = B[bj]
              B[bj] = t2
            }
          }
        }
      }
    }
  }
}

/**
 * Pair one round of an in-store event.
 *
 * Round 1: players are ordered by a stable hash (random-feeling but
 * reproducible). Later rounds: ordered by wins (descending) so similar
 * records share a table, then a swap pass breaks up rematches.
 */
export function pairEventRound(
  players: EventPlayer[],
  options: { roundNumber: number; recentPairs?: Set<string> }
): EventPairing {
  if (players.length < 3) {
    return { pods: [], byes: players.map((p) => p.id) }
  }

  const wins = new Map(players.map((p) => [p.id, p.wins]))

  const ordered = [...players].sort((a, b) => {
    if (options.roundNumber > 1 && b.wins !== a.wins) return b.wins - a.wins
    return hashId(a.id) - hashId(b.id)
  })

  const sizes = podSizes(ordered.length)
  const groups: string[][] = []
  let cursor = 0
  for (const size of sizes) {
    groups.push(ordered.slice(cursor, cursor + size).map((p) => p.id))
    cursor += size
  }
  const byes = ordered.slice(cursor).map((p) => p.id)

  if (options.recentPairs && options.recentPairs.size > 0) {
    reduceRepeats(groups, options.recentPairs, wins)
  }

  const pods: EventPod[] = groups.map((player_ids, index) => ({
    table_number: index + 1,
    player_ids,
  }))

  return { pods, byes }
}
