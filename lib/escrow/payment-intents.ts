export const PAYMENT_METHOD_TYPES = ['card', 'bank_transfer'] as const

export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number]

export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'processing'
  | 'succeeded'
  | 'canceled'
  | 'refunded'

export function normalizePaymentMethod(
  value: string | null | undefined
): PaymentMethodType | null {
  const normalized = String(value ?? '').trim().toLowerCase()
  return (PAYMENT_METHOD_TYPES as readonly string[]).includes(normalized)
    ? (normalized as PaymentMethodType)
    : null
}

// Placeholder intent ids are shaped like Stripe test ids so the schema and UI
// are ready for a real provider without one being wired yet.
export function createPlaceholderPaymentIntentId() {
  const random =
    typeof globalThis !== 'undefined' &&
    'crypto' in globalThis &&
    typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`

  return `pi_test_${random.slice(0, 24)}`
}

export function isPlaceholderPaymentIntentId(id: string | null | undefined) {
  return String(id ?? '').startsWith('pi_test_')
}

export function formatPaymentMethodLabel(method: string | null | undefined) {
  switch (normalizePaymentMethod(method)) {
    case 'card':
      return 'Card'
    case 'bank_transfer':
      return 'Bank transfer'
    default:
      return 'Not selected'
  }
}
