import { describe, expect, it } from 'vitest'
import { estimateBuylistQuote, resolveBuylistRatio } from '../buylist'

describe('resolveBuylistRatio', () => {
  it('pays a higher ratio on more valuable cards', () => {
    expect(resolveBuylistRatio(0.5)).toBe(0.4)
    expect(resolveBuylistRatio(5)).toBe(0.55)
    expect(resolveBuylistRatio(20)).toBe(0.62)
    expect(resolveBuylistRatio(50)).toBe(0.68)
    expect(resolveBuylistRatio(250)).toBe(0.72)
  })

  it('treats band edges as inclusive lower bounds', () => {
    expect(resolveBuylistRatio(2)).toBe(0.55)
    expect(resolveBuylistRatio(10)).toBe(0.62)
    expect(resolveBuylistRatio(100)).toBe(0.72)
  })

  it('handles zero and invalid prices defensively', () => {
    expect(resolveBuylistRatio(0)).toBe(0.4)
    expect(resolveBuylistRatio(NaN)).toBe(0.4)
    expect(resolveBuylistRatio(-5)).toBe(0.4)
  })
})

describe('estimateBuylistQuote', () => {
  it('returns null when there is no usable market price', () => {
    expect(
      estimateBuylistQuote({ cardName: 'X', marketPrice: null, foil: false })
    ).toBeNull()
    expect(
      estimateBuylistQuote({ cardName: 'X', marketPrice: 0, foil: false })
    ).toBeNull()
  })

  it('applies the band ratio to the market price', () => {
    const q = estimateBuylistQuote({
      cardName: 'Smothering Tithe',
      marketPrice: 20,
      foil: false,
    })
    expect(q).not.toBeNull()
    expect(q!.ratio).toBe(0.62)
    expect(q!.cashPrice).toBe(12.4)
  })

  it('trims the ratio for foils', () => {
    const nonfoil = estimateBuylistQuote({
      cardName: 'Dockside',
      marketPrice: 50,
      foil: false,
    })!
    const foil = estimateBuylistQuote({
      cardName: 'Dockside',
      marketPrice: 50,
      foil: true,
    })!
    expect(foil.ratio).toBeLessThan(nonfoil.ratio)
    expect(foil.cashPrice).toBeLessThan(nonfoil.cashPrice)
  })
})
