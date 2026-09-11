import { describe, expect, it } from 'vitest'
import { computeDesirability, isExcluded, scoreCandidate, scoreCandidates } from '../scoring'
import { candidate, card, member } from './fixtures'

describe('computeDesirability', () => {
  it('scores more-played cards higher on demand', () => {
    const niche = computeDesirability(card({ edhrec: { inclusionPercent: 5, deckCount: 2_000 } }))
    const staple = computeDesirability(card({ edhrec: { inclusionPercent: 45, deckCount: 150_000 } }))
    expect(staple.components.demand).toBeGreaterThan(niche.components.demand)
    expect(staple.desirability).toBeGreaterThan(niche.desirability)
  })

  it('treats a spoiled reprint as risk and says so', () => {
    const safe = computeDesirability(card())
    const reprint = computeDesirability(
      card({ signals: [{ kind: 'reprint_risk', strength: 1, detail: 'Spoiled in the next Commander set.' }] })
    )
    expect(reprint.components.risk).toBeGreaterThanOrEqual(60)
    expect(reprint.desirability).toBeLessThan(safe.desirability)
    expect(reprint.cons).toContain('Spoiled in the next Commander set.')
  })

  it('rewards Reserved List scarcity and old frames', () => {
    const modern = computeDesirability(card())
    const vintage = computeDesirability(
      card({ setCode: 'usg', setName: "Urza's Saga", releasedAt: '1998-10-12', reserved: true, printingCount: 1 })
    )
    expect(vintage.components.scarcity).toBeGreaterThan(modern.components.scarcity)
    expect(vintage.components.collector).toBeGreaterThan(modern.components.collector)
  })

  it('stays inside 0..100', () => {
    const extreme = computeDesirability(
      card({
        priceUsd: 100,
        priceHistory: { d7: 100, d30: 10, d90: 5 },
        buylistUsd: 95,
        reserved: true,
        releasedAt: '1994-01-01',
        setCode: 'leg',
        edhrec: { inclusionPercent: 90, deckCount: 900_000 },
        cedhSharePercent: 80,
      })
    )
    for (const value of Object.values(extreme.components)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
    expect(extreme.desirability).toBeLessThanOrEqual(100)
  })
})

describe('scoreCandidate', () => {
  it.each([
    ['blocked_card', candidate('a'), member({ preferences: { blockedOracleIds: ['oracle-a'] } as never })],
    ['bulk_price', candidate('b', { priceUsd: 0.4 }), member()],
    ['unpriced', candidate('c', { priceUsd: null }), member()],
    ['recent_spike', candidate('d', { priceUsd: 16, priceHistory: { d7: 10 } }), member()],
    ['below_min_condition', candidate('e', {}, { condition: 'moderate_play' }), member()],
    ['language', candidate('f', {}, { language: 'ja' }), member()],
    ['finish', candidate('g', { foil: true }), member({ preferences: { finishPref: 'nonfoil' } as never })],
    ['already_owned', candidate('h'), member({ ownedOracleIds: ['oracle-h'] })],
    ['blocked_set', candidate('i'), member({ preferences: { blockedSetCodes: ['CMM'] } as never })],
  ])('excludes for %s', (reason, input, profile) => {
    const result = scoreCandidate(input, profile)
    expect(isExcluded(result)).toBe(true)
    if (isExcluded(result)) expect(result.reasons).toContain(reason)
  })

  it('still offers an owned card as a play pick when another deck is missing it', () => {
    const result = scoreCandidate(
      candidate('gap', { oracleId: 'oracle-gap', colorIdentity: ['G'] }),
      member({ ownedOracleIds: ['oracle-gap'] })
    )
    expect(isExcluded(result)).toBe(false)
    if (!isExcluded(result)) {
      expect(result.slots).toContain('play')
      expect(result.targetDeckName).toBe('Golgari Graveyard')
      expect(result.targetInclusionPercent).toBe(42)
      expect(result.pros[0]).toMatch(/Fills a gap in Golgari Graveyard/)
    }
  })

  it('skips deck gaps outside the commander color identity', () => {
    const result = scoreCandidate(candidate('red', { oracleId: 'oracle-gap-red', colorIdentity: ['R'] }), member())
    expect(!isExcluded(result) && result.slots.includes('play')).toBe(false)
  })

  it('assigns hold and spec slots from demand, risk, and catalysts', () => {
    const hold = scoreCandidate(candidate('hold'), member())
    const spec = scoreCandidate(
      candidate('spec', { priceUsd: 6, priceHistory: { d7: 6, d30: 5 }, edhrec: null }),
      member()
    )
    const reprint = scoreCandidate(
      candidate('rep', { signals: [{ kind: 'reprint_risk', strength: 1, detail: 'Reprint.' }] }),
      member()
    )
    expect(!isExcluded(hold) && hold.slots).toEqual(['hold'])
    expect(!isExcluded(spec) && spec.slots).toContain('spec')
    expect(!isExcluded(reprint) && reprint.slots).toEqual([])
  })

  it('multiplies desirability by fit for deck gaps and favorite artists', () => {
    const plain = scoreCandidate(candidate('p'), member())
    const liked = scoreCandidate(
      candidate('gap', { oracleId: 'oracle-gap', colorIdentity: ['B'] }),
      member({ preferences: { favoriteArtists: ['test artist'] } as never })
    )
    if (isExcluded(plain) || isExcluded(liked)) throw new Error('unexpected exclusion')
    expect(plain.fit).toBe(1)
    expect(liked.fit).toBeGreaterThan(1.3)
    expect(liked.score).toBeCloseTo(liked.desirability * liked.fit, 1)
  })
})

describe('scoreCandidates', () => {
  it('splits scored and excluded and sorts best first', () => {
    const { scored, excluded } = scoreCandidates(
      [
        candidate('low', { edhrec: { inclusionPercent: 2, deckCount: 500 } }),
        candidate('high', { edhrec: { inclusionPercent: 48, deckCount: 180_000 } }),
        candidate('bulk', { priceUsd: 0.2 }),
      ],
      member()
    )
    expect(scored.map((c) => c.inventoryId)).toEqual(['high', 'low'])
    expect(excluded.map((e) => e.candidate.inventoryId)).toEqual(['bulk'])
  })
})
