import { describe, expect, it } from 'vitest'
import { validateDoubleDeckerDeck, validateDeckForFormat } from '../validate'
import { detectDeckFormat, normalizeDeckFormat } from '@/lib/decks/formats'
import type { ImportedDeckCard } from '../types'

function commander(cardName: string, colorIdentity?: string[]): ImportedDeckCard {
  return { section: 'commander', quantity: 1, cardName, colorIdentity }
}

function mainboard(cardName: string, quantity = 1, colorIdentity?: string[]): ImportedDeckCard {
  return { section: 'mainboard', quantity, cardName, colorIdentity }
}

// Build a legal 200-card deck: 2 commanders + 198 unique maindeck cards.
function buildDoubleDecker(
  overrides: { mainboard?: ImportedDeckCard[]; extra?: ImportedDeckCard[] } = {}
): ImportedDeckCard[] {
  const filler =
    overrides.mainboard ??
    Array.from({ length: 198 }, (_, i) => mainboard(`Filler Card ${i + 1}`))

  return [
    commander('Commander One'),
    commander('Commander Two'),
    ...filler,
    ...(overrides.extra ?? []),
  ]
}

describe('validateDoubleDeckerDeck', () => {
  it('accepts two commanders fronting a 200-card list', () => {
    const result = validateDoubleDeckerDeck(buildDoubleDecker())

    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.commanderMode).toBe('double_decker')
    expect(result.commanderCount).toBe(2)
    expect(result.mainboardCount).toBe(198)
  })

  it('requires exactly two commanders', () => {
    const cards = buildDoubleDecker()
    // Drop one commander and replace it with a maindeck card to keep 200 total.
    const single = [
      cards[0],
      ...cards.slice(2),
      mainboard('Replacement Card'),
    ]

    const result = validateDoubleDeckerDeck(single)

    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.includes('pair two commanders'))).toBe(true)
  })

  it('requires a 200-card total', () => {
    const short = buildDoubleDecker({
      mainboard: Array.from({ length: 100 }, (_, i) => mainboard(`Filler Card ${i + 1}`)),
    })

    const result = validateDoubleDeckerDeck(short)

    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.includes('must total 200 cards'))).toBe(true)
  })

  it('allows up to two copies of a nonbasic card across the two decks', () => {
    const cards = buildDoubleDecker({
      mainboard: [
        mainboard('Sol Ring', 2),
        ...Array.from({ length: 196 }, (_, i) => mainboard(`Filler Card ${i + 1}`)),
      ],
    })

    const result = validateDoubleDeckerDeck(cards)

    expect(result.isValid).toBe(true)
  })

  it('rejects a third copy of a nonbasic card', () => {
    const cards = buildDoubleDecker({
      mainboard: [
        mainboard('Sol Ring', 3),
        ...Array.from({ length: 195 }, (_, i) => mainboard(`Filler Card ${i + 1}`)),
      ],
    })

    const result = validateDoubleDeckerDeck(cards)

    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('sol ring'))).toBe(true)
  })

  it('allows more than two basic lands', () => {
    const cards = buildDoubleDecker({
      mainboard: [
        mainboard('Island', 40),
        ...Array.from({ length: 158 }, (_, i) => mainboard(`Filler Card ${i + 1}`)),
      ],
    })

    const result = validateDoubleDeckerDeck(cards)

    expect(result.isValid).toBe(true)
  })

  it('treats the sideboard as unlimited and does not count it toward 200', () => {
    const cards = buildDoubleDecker({
      extra: Array.from({ length: 60 }, (_, i) => ({
        section: 'sideboard' as const,
        quantity: 1,
        cardName: `Sideboard Card ${i + 1}`,
      })),
    })

    const result = validateDoubleDeckerDeck(cards)

    expect(result.isValid).toBe(true)
    expect(result.sideboardCount).toBe(60)
  })

  it('enforces the union of both commanders color identities', () => {
    const cards = buildDoubleDecker({
      mainboard: [
        mainboard('Lightning Bolt', 1, ['R']),
        ...Array.from({ length: 197 }, (_, i) => mainboard(`Filler Card ${i + 1}`)),
      ],
    })
    cards[0] = commander('Commander One', ['U'])
    cards[1] = commander('Commander Two', ['W'])

    const result = validateDoubleDeckerDeck(cards)

    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.includes('Color identity mismatch'))).toBe(true)
  })

  it('routes through validateDeckForFormat by format id', () => {
    const result = validateDeckForFormat(buildDoubleDecker(), 'double-decker')
    expect(result.isValid).toBe(true)
    expect(result.commanderMode).toBe('double_decker')
  })
})

describe('Double Decker format detection', () => {
  it('detects a 200-card two-commander deck as double-decker', () => {
    expect(detectDeckFormat(buildDoubleDecker())).toBe('double-decker')
  })

  it('still detects a normal 100-card two-commander deck as commander', () => {
    const cards: ImportedDeckCard[] = [
      commander('Commander One'),
      commander('Commander Two'),
      ...Array.from({ length: 98 }, (_, i) => mainboard(`Filler Card ${i + 1}`)),
    ]
    expect(detectDeckFormat(cards)).toBe('commander')
  })

  it('normalizes the moxfield-style format id', () => {
    expect(normalizeDeckFormat('doubledecker')).toBe('double-decker')
  })
})
