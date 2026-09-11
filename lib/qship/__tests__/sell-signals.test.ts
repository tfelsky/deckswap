import { describe, expect, it } from 'vitest'
import { computeSellSignals, tradeInQuote, type OwnedCardInput } from '../sell-signals'

const NOW = new Date('2026-09-10T12:00:00Z')

function owned(partial: Partial<OwnedCardInput> = {}): OwnedCardInput {
  return {
    sourceKind: 'single_inventory',
    sourceId: '1',
    cardName: 'Test Card',
    oracleId: 'oracle-1',
    foil: false,
    quantity: 1,
    priceUsd: 10,
    priceHistory: { d7: 10, d30: 10, d90: 10 },
    buylistUsd: null,
    inActiveDeck: true,
    copiesOwned: 1,
    lastTouchedAt: '2026-08-01T00:00:00Z',
    signals: [],
    ...partial,
  }
}

describe('computeSellSignals', () => {
  it('stays quiet for a stable card in a deck', () => {
    expect(computeSellSignals([owned()], NOW)).toEqual([])
  })

  it('flags a peak when a 30-day run stalls this week', () => {
    const [signal] = computeSellSignals([owned({ priceUsd: 14, priceHistory: { d7: 14, d30: 10 } })], NOW)
    expect(signal.kind).toBe('peak')
    expect(signal.action).toBe('list_or_trade_in')
    expect(signal.detail).toMatch(/Up 40% in 30 days/)
  })

  it('puts a spoiled reprint ahead of a peak', () => {
    const [signal] = computeSellSignals(
      [
        owned({
          priceUsd: 14,
          priceHistory: { d7: 14, d30: 10 },
          signals: [{ kind: 'reprint_risk', strength: 1, detail: 'In the next Commander precon.' }],
        }),
      ],
      NOW
    )
    expect(signal.kind).toBe('reprint_incoming')
    expect(signal.detail).toBe('In the next Commander precon.')
    expect(signal.alsoMatched).toContain('peak')
  })

  it('spots buylists paying near retail', () => {
    const [signal] = computeSellSignals([owned({ buylistUsd: 8.5 })], NOW)
    expect(signal.kind).toBe('buylist_spike')
    expect(signal.tradeInCashUsd).toBe(8.5)
    expect(signal.tradeInCreditUsd).toBe(9.35)
  })

  it('calls extra copies and year-idle cards dead weight', () => {
    const signals = computeSellSignals(
      [
        owned({ sourceId: 'dupes', inActiveDeck: false, copiesOwned: 3, quantity: 3 }),
        owned({ sourceId: 'idle', inActiveDeck: false, lastTouchedAt: '2024-06-01T00:00:00Z' }),
      ],
      NOW
    )
    expect(signals.map((s) => [s.source.sourceId, s.kind])).toEqual([
      ['dupes', 'dead_weight'],
      ['idle', 'dead_weight'],
    ])
  })

  it('ignores cards under $2', () => {
    expect(computeSellSignals([owned({ priceUsd: 1.5, buylistUsd: 1.4 })], NOW)).toEqual([])
  })

  it('keeps one copy of a deck card out of the sellable count', () => {
    const [signal] = computeSellSignals(
      [owned({ sourceKind: 'deck_card', quantity: 2, buylistUsd: 9 })],
      NOW
    )
    expect(signal.sellableQuantity).toBe(1)
  })

  it('suggests trading up when credit covers half a nicer printing', () => {
    const [signal] = computeSellSignals(
      [owned({ upgradeOption: { scryfallId: 's2', setName: 'Masterpiece', priceUsd: 12 } })],
      NOW
    )
    expect(signal.kind).toBe('better_printing')
    expect(signal.headline).toMatch(/Masterpiece/)
  })
})

describe('tradeInQuote', () => {
  it('falls back to the buylist heuristic with a 10% credit bonus', () => {
    // $10 card sits in the 62% band.
    expect(tradeInQuote({ cardName: 'X', foil: false, priceUsd: 10, buylistUsd: null })).toEqual({
      cash: 6.2,
      credit: 6.82,
    })
  })
})
