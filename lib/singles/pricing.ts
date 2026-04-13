export type SinglesCartItem = {
  singleInventoryItemId: number
  quantity: number
}

export type SinglesDiscountTierKey = 'none' | 'tier_20' | 'tier_25'
export type SinglesShippingMethodKey = 'pwe_untracked' | 'tracked_padded_mailer'

export type SinglesPricingBreakdown = {
  subtotal: number
  discountTier: SinglesDiscountTierKey
  tierLabel: string
  discountAmount: number
  discountedSubtotal: number
  shippingMethod: SinglesShippingMethodKey
  shippingLabel: string
  shippingDescription: string
  shippingAmount: number
  taxAmount: number
  grandTotal: number
}

const PWE_SHIPPING_RATE_USD = 5
const TRACKED_MAILER_RATE_USD = 15
const PWE_MAX_CARD_COUNT = 10
const TRACKED_MAILER_SUBTOTAL_THRESHOLD_USD = 30
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

export function resolveSinglesShipping(args: { subtotal: number; itemCount: number }) {
  const safeSubtotal = roundUsd(args.subtotal)
  const safeItemCount = normalizeSinglesQuantity(args.itemCount)

  if (
    safeSubtotal > TRACKED_MAILER_SUBTOTAL_THRESHOLD_USD ||
    safeItemCount > PWE_MAX_CARD_COUNT
  ) {
    return {
      method: 'tracked_padded_mailer' as const,
      label: 'Padded mailer with tracking',
      description: 'Automatic for orders over $30 or more than 10 cards in Canada.',
      amount: TRACKED_MAILER_RATE_USD,
    }
  }

  return {
    method: 'pwe_untracked' as const,
    label: 'PWE Plain White Envelope',
    description:
      'No tracking. Available for up to 10 cards when the order stays at $30 or less in Canada.',
    amount: PWE_SHIPPING_RATE_USD,
  }
}

export function calculateSinglesPricingBreakdown(
  subtotal: number,
  itemCount: number
): SinglesPricingBreakdown {
  const safeSubtotal = roundUsd(subtotal)
  const safeItemCount = normalizeSinglesQuantity(itemCount)
  const tier = resolveSinglesDiscountTier(safeSubtotal)
  const discountAmount = roundUsd(safeSubtotal * tier.rate)
  const discountedSubtotal = roundUsd(safeSubtotal - discountAmount)
  const shipping = resolveSinglesShipping({ subtotal: safeSubtotal, itemCount: safeItemCount })
  const shippingAmount = shipping.amount
  const taxAmount = roundUsd(discountedSubtotal * TAX_RATE)
  const grandTotal = roundUsd(discountedSubtotal + shippingAmount + taxAmount)

  return {
    subtotal: safeSubtotal,
    discountTier: tier.key,
    tierLabel: tier.label,
    discountAmount,
    discountedSubtotal,
    shippingMethod: shipping.method,
    shippingLabel: shipping.label,
    shippingDescription: shipping.description,
    shippingAmount,
    taxAmount,
    grandTotal,
  }
}
