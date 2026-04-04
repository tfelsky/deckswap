export const SUPPORTED_CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP'] as const

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

const INTERNAL_EXCHANGE_RATES: Record<SupportedCurrency, number> = {
  USD: 1,
  CAD: 1.36,
  EUR: 0.92,
  GBP: 0.79,
}

const LOCALES: Record<SupportedCurrency, string> = {
  USD: 'en-US',
  CAD: 'en-CA',
  EUR: 'de-DE',
  GBP: 'en-GB',
}

export function normalizeSupportedCurrency(value?: string | null): SupportedCurrency {
  const normalized = String(value ?? 'USD').trim().toUpperCase()
  return SUPPORTED_CURRENCIES.includes(normalized as SupportedCurrency)
    ? (normalized as SupportedCurrency)
    : 'USD'
}

export function currencyLabel(currency: SupportedCurrency) {
  switch (currency) {
    case 'CAD':
      return 'Canadian Dollar'
    case 'EUR':
      return 'Euro'
    case 'GBP':
      return 'Pound Sterling'
    default:
      return 'US Dollar'
  }
}

export function convertUsdToCurrency(value: number, currency: SupportedCurrency) {
  return Number((Math.max(0, value) * INTERNAL_EXCHANGE_RATES[currency]).toFixed(2))
}

export function convertDeckValueForCurrency(args: {
  usdValue?: number | null
  eurValue?: number | null
  currency: SupportedCurrency
}) {
  if (args.currency === 'EUR' && Number(args.eurValue ?? 0) > 0) {
    return Number(Number(args.eurValue ?? 0).toFixed(2))
  }

  return convertUsdToCurrency(Number(args.usdValue ?? 0), args.currency)
}

export function formatCurrencyAmount(value: number, currency: SupportedCurrency) {
  return new Intl.NumberFormat(LOCALES[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
