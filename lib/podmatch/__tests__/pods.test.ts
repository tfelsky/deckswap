import { describe, expect, it } from 'vitest'
import { generatePods, pairKey, podSizes, type PodDeck } from '../pods'

function deck(partial: Partial<PodDeck> & { id: number; overall_power: number }): PodDeck {
  return {
    name: `Deck ${partial.id}`,
    commander: null,
    owner: null,
    proxy_count: 0,
    speed: 5,
    salt: 2,
    combo_density: 1,
    tutor_density: 2,
    budget_pressure: 4,
    color_identity: ['G'],
    ...partial,
  }
}

describe('podSizes', () => {
  it('prefers 4-player pods', () => {
    expect(podSizes(4)).toEqual([4])
    expect(podSizes(8)).toEqual([4, 4])
    expect(podSizes(12)).toEqual([4, 4, 4])
  })

  it('falls back to 3-player pods to cover the remainder', () => {
    expect(podSizes(6)).toEqual([3, 3])
    expect(podSizes(7)).toEqual([4, 3])
    expect(podSizes(11)).toEqual([4, 4, 3])
  })

  it('uses a single 5-player table only when unavoidable', () => {
    expect(podSizes(5)).toEqual([5])
  })

  it('returns nothing below the minimum', () => {
    expect(podSizes(2)).toEqual([])
  })
})

describe('generatePods', () => {
  const eightDecks = Array.from({ length: 8 }, (_, i) =>
    deck({ id: i + 1, overall_power: i < 4 ? 8 : 4 })
  )

  it('is deterministic', () => {
    const a = generatePods(eightDecks)
    const b = generatePods(eightDecks)
    expect(a).toEqual(b)
  })

  it('groups similar-power decks onto the same table', () => {
    const { pods } = generatePods(eightDecks)
    expect(pods).toHaveLength(2)
    // Strong decks cluster on table 1, weak on table 2.
    expect(pods[0].decks.every((d) => d.overall_power === 8)).toBe(true)
    expect(pods[1].decks.every((d) => d.overall_power === 4)).toBe(true)
  })

  it('scores a uniform pod higher than a lopsided one', () => {
    const uniform = generatePods(
      Array.from({ length: 4 }, (_, i) => deck({ id: i + 1, overall_power: 7 }))
    ).pods[0]
    const lopsided = generatePods([
      deck({ id: 1, overall_power: 9 }),
      deck({ id: 2, overall_power: 8 }),
      deck({ id: 3, overall_power: 4 }),
      deck({ id: 4, overall_power: 2 }),
    ]).pods[0]
    expect(uniform.fit_score).toBeGreaterThan(lopsided.fit_score)
  })

  it('warns when a precon and a cEDH deck share a table', () => {
    const { pods } = generatePods([
      deck({ id: 1, name: 'cEDH', overall_power: 9 }),
      deck({ id: 2, name: 'High', overall_power: 8 }),
      deck({ id: 3, name: 'Mid', overall_power: 6 }),
      deck({ id: 4, name: 'Precon', overall_power: 3 }),
    ])
    const warnings = pods[0].warnings.join(' ')
    expect(warnings).toMatch(/cEDH-level deck with a precon-level deck/i)
  })

  it('flags proxy decks when proxies are disabled', () => {
    const { pods } = generatePods(
      [
        deck({ id: 1, name: 'Proxied', overall_power: 7, proxy_count: 12 }),
        deck({ id: 2, overall_power: 7 }),
        deck({ id: 3, overall_power: 7 }),
        deck({ id: 4, overall_power: 7 }),
      ],
      { allowProxies: false, allowStax: true, allowCombo: true }
    )
    expect(pods[0].warnings.join(' ')).toMatch(/Proxied uses proxies/i)
  })

  it('breaks up recent rematches when power allows', () => {
    // Two same-power pods; decks 1&3 and 2&4 recently played.
    const decks = [
      deck({ id: 1, overall_power: 7 }),
      deck({ id: 2, overall_power: 7 }),
      deck({ id: 3, overall_power: 7 }),
      deck({ id: 4, overall_power: 7 }),
      deck({ id: 5, overall_power: 7 }),
      deck({ id: 6, overall_power: 7 }),
      deck({ id: 7, overall_power: 7 }),
      deck({ id: 8, overall_power: 7 }),
    ]
    // Default chunking would put 1-4 together and 5-8 together.
    const recentPairs = new Set([pairKey(1, 2), pairKey(1, 3), pairKey(1, 4)])

    const countRepeats = (pods: { deck_ids: number[] }[]) =>
      pods.reduce((total, pod) => {
        let c = 0
        for (let i = 0; i < pod.deck_ids.length; i++)
          for (let j = i + 1; j < pod.deck_ids.length; j++)
            if (recentPairs.has(pairKey(pod.deck_ids[i], pod.deck_ids[j]))) c++
        return total + c
      }, 0)

    const baseline = generatePods(decks, { allowProxies: true, allowStax: true, allowCombo: true })
    const avoided = generatePods(decks, {
      allowProxies: true,
      allowStax: true,
      allowCombo: true,
      recentPairs,
    })

    expect(countRepeats(baseline.pods)).toBe(3)
    expect(countRepeats(avoided.pods)).toBeLessThan(3)
  })

  it('rewards color-identity diversity', () => {
    const diverse = generatePods([
      deck({ id: 1, overall_power: 7, color_identity: ['W'] }),
      deck({ id: 2, overall_power: 7, color_identity: ['U'] }),
      deck({ id: 3, overall_power: 7, color_identity: ['B'] }),
      deck({ id: 4, overall_power: 7, color_identity: ['R'] }),
    ]).pods[0]
    const mirror = generatePods([
      deck({ id: 1, overall_power: 7, color_identity: ['G'] }),
      deck({ id: 2, overall_power: 7, color_identity: ['G'] }),
      deck({ id: 3, overall_power: 7, color_identity: ['G'] }),
      deck({ id: 4, overall_power: 7, color_identity: ['G'] }),
    ]).pods[0]
    expect(diverse.fit_breakdown.archetype_diversity).toBeGreaterThan(
      mirror.fit_breakdown.archetype_diversity
    )
  })
})
