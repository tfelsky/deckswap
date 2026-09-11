import { describe, expect, it } from 'vitest'
import { computeCardValueSignals, type CardValueInput } from '../value-signals'

function baseInput(overrides: Partial<CardValueInput> = {}): CardValueInput {
  return {
    cardName: 'Test Card',
    setCode: 'tst',
    setName: 'Test Set',
    releasedAt: '2015-06-01',
    rarity: 'rare',
    foil: false,
    oracleText: null,
    typeLine: 'Creature - Human',
    cmc: 3,
    condition: 'near_mint',
    language: 'en',
    priceUsd: 5,
    priceUsdFoil: 12,
    commanderData: null,
    ...overrides,
  }
}

function signalKinds(input: CardValueInput) {
  return computeCardValueSignals(input).signals.map((signal) => signal.kind)
}

function conLabels(input: CardValueInput) {
  return computeCardValueSignals(input).cons.map((con) => con.label)
}

describe('set signal', () => {
  it('flags iconic vintage sets as strong regardless of date', () => {
    const { signals } = computeCardValueSignals(
      baseInput({ setCode: 'leb', setName: 'Limited Edition Beta', releasedAt: '1993-10-04' })
    )
    const setSignal = signals.find((signal) => signal.kind === 'set')
    expect(setSignal?.label).toBe('Iconic vintage set')
    expect(setSignal?.strength).toBe('strong')
  })

  it('flags Reserved List era printings', () => {
    const { signals } = computeCardValueSignals(
      baseInput({ setCode: 'usg', setName: "Urza's Saga", releasedAt: '1998-10-12' })
    )
    const setSignal = signals.find((signal) => signal.kind === 'set')
    expect(setSignal?.label).toBe('Reserved List era')
  })

  it('flags old-frame era printings as moderate', () => {
    const { signals } = computeCardValueSignals(
      baseInput({ setCode: 'ons', setName: 'Onslaught', releasedAt: '2002-10-07' })
    )
    const setSignal = signals.find((signal) => signal.kind === 'set')
    expect(setSignal?.label).toBe('Old-frame era set')
    expect(setSignal?.strength).toBe('moderate')
  })

  it('gives no set signal for modern sets', () => {
    expect(signalKinds(baseInput({ releasedAt: '2015-06-01' }))).not.toContain('set')
  })
})

describe('early foil signal', () => {
  it('flags 1999-2003 foils as strong', () => {
    const { signals } = computeCardValueSignals(
      baseInput({ foil: true, releasedAt: '2000-06-05' })
    )
    const foilSignal = signals.find((signal) => signal.kind === 'early_foil')
    expect(foilSignal?.strength).toBe('strong')
  })

  it('flags pre-2010 foils as moderate', () => {
    const { signals } = computeCardValueSignals(
      baseInput({ foil: true, releasedAt: '2007-05-04' })
    )
    const foilSignal = signals.find((signal) => signal.kind === 'early_foil')
    expect(foilSignal?.strength).toBe('moderate')
  })

  it('ignores non-foils and modern foils', () => {
    expect(signalKinds(baseInput({ foil: false, releasedAt: '2000-06-05' }))).not.toContain(
      'early_foil'
    )
    expect(signalKinds(baseInput({ foil: true, releasedAt: '2022-02-18' }))).not.toContain(
      'early_foil'
    )
  })

  it('never marks a pre-1999 printing as foil-era', () => {
    expect(signalKinds(baseInput({ foil: true, releasedAt: '1994-06-01' }))).not.toContain(
      'early_foil'
    )
  })
})

describe('playable signal', () => {
  it('marks multi-pattern text as strong', () => {
    const { signals } = computeCardValueSignals(
      baseInput({
        oracleText: 'Search your library for a card, then draw a card.',
      })
    )
    const playable = signals.find((signal) => signal.kind === 'playable')
    expect(playable?.strength).toBe('strong')
  })

  it('marks a single cheap effect as strong and an expensive one as moderate', () => {
    const cheap = computeCardValueSignals(
      baseInput({ oracleText: 'Counter target spell.', cmc: 1 })
    ).signals.find((signal) => signal.kind === 'playable')
    expect(cheap?.strength).toBe('strong')

    const pricey = computeCardValueSignals(
      baseInput({ oracleText: 'Counter target spell.', cmc: 6 })
    ).signals.find((signal) => signal.kind === 'playable')
    expect(pricey?.strength).toBe('moderate')
  })

  it('gives no playable signal for vanilla text', () => {
    expect(signalKinds(baseInput({ oracleText: 'Flying' }))).not.toContain('playable')
  })
})

describe('commander staple signal', () => {
  it('uses EDHREC inclusion for a strong staple call', () => {
    const { signals } = computeCardValueSignals(
      baseInput({
        commanderData: { commanderName: 'Atraxa, Praetors’ Voice', inclusionPercent: 62 },
      })
    )
    const staple = signals.find((signal) => signal.kind === 'commander_staple')
    expect(staple?.label).toBe('Commander staple')
    expect(staple?.detail).toContain('62%')
    expect(staple?.detail).toContain('Atraxa')
  })

  it('marks mid inclusion as a moderate include', () => {
    const { signals } = computeCardValueSignals(
      baseInput({ commanderData: { inclusionPercent: 20 } })
    )
    const staple = signals.find((signal) => signal.kind === 'commander_staple')
    expect(staple?.strength).toBe('moderate')
  })

  it('falls back to commander-shaped oracle text without EDHREC data', () => {
    const { signals } = computeCardValueSignals(
      baseInput({ oracleText: 'Each opponent loses 2 life.' })
    )
    const staple = signals.find((signal) => signal.kind === 'commander_staple')
    expect(staple?.label).toBe('Commander-shaped text')
  })

  it('gives no staple signal below the inclusion floor', () => {
    expect(
      signalKinds(baseInput({ commanderData: { inclusionPercent: 5 } }))
    ).not.toContain('commander_staple')
  })
})

describe('cons', () => {
  it('flags bulk pricing', () => {
    expect(conLabels(baseInput({ priceUsd: 0.15, priceUsdFoil: null }))).toContain(
      'Bulk-tier price'
    )
  })

  it('flags deep supply for cheap commons', () => {
    expect(
      conLabels(baseInput({ rarity: 'common', priceUsd: 1.2, priceUsdFoil: null }))
    ).toContain('Deep supply at this rarity')
  })

  it('flags the high-supply era, played condition, and non-English copies', () => {
    const labels = conLabels(
      baseInput({ releasedAt: '2021-04-23', condition: 'moderate_play', language: 'ja' })
    )
    expect(labels).toContain('High-supply printing era')
    expect(labels).toContain('Below Near Mint')
    expect(labels).toContain('Non-English copy')
  })

  it('warns about condition-sensitive early foils and thin foil premiums', () => {
    const labels = conLabels(
      baseInput({ foil: true, releasedAt: '2001-10-01', priceUsd: 10, priceUsdFoil: 10.5 })
    )
    expect(labels).toContain('Condition-sensitive foil')
    expect(labels).toContain('Thin foil premium')
  })

  it('uses the foil price when judging bulk on foil copies', () => {
    expect(
      conLabels(baseInput({ foil: true, priceUsd: 0.1, priceUsdFoil: 8 }))
    ).not.toContain('Bulk-tier price')
  })

  it('always says something: no-signal cards get the fallback con', () => {
    const result = computeCardValueSignals(
      baseInput({ oracleText: 'Flying', priceUsd: 3, priceUsdFoil: null })
    )
    expect(result.signals).toHaveLength(0)
    expect(result.cons.map((con) => con.label)).toContain('No standout signal')
  })

  it('skips the fallback con when real signals exist', () => {
    const result = computeCardValueSignals(
      baseInput({ oracleText: 'Counter target spell.', cmc: 1, priceUsd: 3 })
    )
    expect(result.cons.map((con) => con.label)).not.toContain('No standout signal')
  })
})
