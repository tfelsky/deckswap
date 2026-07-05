import { describe, expect, it } from 'vitest'
import {
  REWARD_POINTS,
  calculateBuyerPurchasePoints,
  calculateSellerSalePoints,
  calculateSellerSalePointsFromSale,
  calculateTicketPurchasePoints,
  pointsToUsd,
  resolveRedemption,
} from '@/lib/rewards/points'

describe('reward point earning', () => {
  it('awards buyers one point per discounted dollar, floored', () => {
    expect(calculateBuyerPurchasePoints(100)).toBe(100)
    expect(calculateBuyerPurchasePoints(149.99)).toBe(149)
    expect(calculateBuyerPurchasePoints(0)).toBe(0)
    expect(calculateBuyerPurchasePoints(-50)).toBe(0)
  })

  it('rebates sellers a fraction of the platform fee', () => {
    // 0.2 MP per fee dollar => $10 fee = 2 MP
    expect(calculateSellerSalePoints(10)).toBe(2)
    expect(calculateSellerSalePoints(47)).toBe(9)
    expect(calculateSellerSalePoints(0)).toBe(0)
  })

  it('derives seller earn from sale value via the platform take rate', () => {
    // saleValue * platformTakeRate(0.1) * sellerPointsPerFeeUsd(0.2) = saleValue * 0.02
    expect(calculateSellerSalePointsFromSale(100)).toBe(2)
    expect(calculateSellerSalePointsFromSale(250)).toBe(5)
    expect(calculateSellerSalePointsFromSale(0)).toBe(0)
  })

  it('combines a flat per-seat award with the ticket spend', () => {
    expect(calculateTicketPurchasePoints({ ticketCount: 1, ticketCostUsd: 12 })).toBe(
      REWARD_POINTS.ticketPointsPerSeat + 12
    )
    expect(calculateTicketPurchasePoints({ ticketCount: 3, ticketCostUsd: 0 })).toBe(15)
    expect(calculateTicketPurchasePoints({ ticketCount: 0, ticketCostUsd: 0 })).toBe(0)
  })
})

describe('pointsToUsd', () => {
  it('converts at the 100 MP = $1 peg', () => {
    expect(pointsToUsd(100)).toBe(1)
    expect(pointsToUsd(550)).toBe(5.5)
    expect(pointsToUsd(0)).toBe(0)
  })
})

describe('resolveRedemption', () => {
  it('applies a valid redemption within all limits', () => {
    const result = resolveRedemption({ pointsRequested: 1000, balance: 5000, orderTotalUsd: 100 })
    expect(result).toEqual({ pointsApplied: 1000, creditUsd: 10, reason: 'applied' })
  })

  it('returns nothing when no points are requested', () => {
    expect(resolveRedemption({ pointsRequested: 0, balance: 5000, orderTotalUsd: 100 }).reason).toBe(
      'none_requested'
    )
  })

  it('rejects requests under the minimum redemption', () => {
    const result = resolveRedemption({ pointsRequested: 300, balance: 5000, orderTotalUsd: 100 })
    expect(result.pointsApplied).toBe(0)
    expect(result.reason).toBe('below_minimum')
  })

  it('caps redemption at half the order total', () => {
    // $20 order => max $10 credit => 1000 points even though the member asked for more.
    const result = resolveRedemption({ pointsRequested: 5000, balance: 5000, orderTotalUsd: 20 })
    expect(result.pointsApplied).toBe(1000)
    expect(result.creditUsd).toBe(10)
  })

  it('flags an order too small to clear the minimum', () => {
    // $5 order => max $2.50 => floored to $2 => 200 points, below the 500 minimum.
    const result = resolveRedemption({ pointsRequested: 5000, balance: 5000, orderTotalUsd: 5 })
    expect(result.pointsApplied).toBe(0)
    expect(result.reason).toBe('capped_by_order')
  })

  it('never spends more than the available balance', () => {
    const result = resolveRedemption({ pointsRequested: 5000, balance: 700, orderTotalUsd: 1000 })
    expect(result.pointsApplied).toBe(700)
    expect(result.creditUsd).toBe(7)
  })

  it('spends only in whole-dollar increments', () => {
    // 1450 requested snaps down to 1400 (=$14).
    const result = resolveRedemption({ pointsRequested: 1450, balance: 5000, orderTotalUsd: 1000 })
    expect(result.pointsApplied).toBe(1400)
    expect(result.creditUsd).toBe(14)
  })
})
