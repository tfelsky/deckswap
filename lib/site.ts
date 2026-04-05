const DEFAULT_SITE_URL = 'https://deckswap.app'

function normalizeSiteUrl(value?: string | null) {
  const trimmed = value?.trim()

  if (!trimmed) return null

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    return new URL(withProtocol).origin
  } catch {
    return null
  }
}

export function getSiteUrl() {
  return (
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeSiteUrl(process.env.VERCEL_URL) ??
    DEFAULT_SITE_URL
  )
}

export function getAbsoluteUrl(path = '/') {
  return new URL(path, getSiteUrl()).toString()
}
