export type SinglesCartItem = {
  singleInventoryItemId: number
  quantity: number
}

export type SinglesDiscountTierKey = 'none' | 'tier_20' | 'tier_25'

export type SinglesPricingBreakdown = {
  subtotal: number
  discountTier: SinglesDiscountTierKey
  tierLabel: string
  discountAmount: number
  discountedSubtotal: number
  shippingAmount: number
  taxAmount: number
  grandTotal: number
}

const SHIPPING_FLAT_RATE_USD = 0
const TAX_RATE = 0

export function normalizeSinglesQuantity(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

export function resolveSinglesDiscountTier(subtotal: number) {
  if (subtotal >= 200) {
    return { key: 'tier_25' as const, label: '25% off orders $200+', rate: 0.25 }
  }

  if (subtotal >= 100) {
    return { key: 'tier_20' as const, label: '20% off orders $100+', rate: 0.2 }
  }

  return { key: 'none' as const, label: 'No volume discount yet', rate: 0 }
}

export function roundUsd(value: number) {
  return Number(Math.max(0, value).toFixed(2))
}

export function calculateSinglesPricingBreakdown(subtotal: number): SinglesPricingBreakdown {
  const safeSubtotal = roundUsd(subtotal)
  const tier = resolveSinglesDiscountTier(safeSubtotal)
  const discountAmount = roundUsd(safeSubtotal * tier.rate)
  const discountedSubtotal = roundUsd(safeSubtotal - discountAmount)
  const shippingAmount = SHIPPING_FLAT_RATE_USD
  const taxAmount = roundUsd(discountedSubtotal * TAX_RATE)
  const grandTotal = roundUsd(discountedSubtotal + shippingAmount + taxAmount)

  return {
    subtotal: safeSubtotal,
    discountTier: tier.key,
    tierLabel: tier.label,
    discountAmount,
    discountedSubtotal,
    shippingAmount,
    taxAmount,
    grandTotal,
  }
}
