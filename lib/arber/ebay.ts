// Arb'r — eBay listing provider.
//
// When EBAY_CLIENT_ID / EBAY_CLIENT_SECRET are configured, this queries the
// live eBay Browse API for MTG single listings that accept Best Offer. When
// they're absent (or a call fails) it falls back to bundled sample data, the
// same graceful-degradation pattern the rest of the app uses for missing
// infrastructure — so the finder always renders something useful.

import type { CardCondition, EbayListing } from './types'
import { SAMPLE_EBAY_LISTINGS } from './sample-data'

// eBay leaf category for "Collectible Card Games" (MTG singles live here).
const MTG_CATEGORY_ID = '183454'

const OAUTH_URL_PROD = 'https://api.ebay.com/identity/v1/oauth2/token'
const OAUTH_URL_SANDBOX = 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
const BROWSE_URL_PROD = 'https://api.ebay.com/buy/browse/v1/item_summary/search'
const BROWSE_URL_SANDBOX =
  'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search'

export type EbaySearchResult = {
  listings: EbayListing[]
  usingSampleData: boolean
  note: string | null
}

function isConfigured() {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET)
}

function isSandbox() {
  return (process.env.EBAY_ENV ?? 'production').toLowerCase() === 'sandbox'
}

/** Heuristically pull a card name out of a noisy eBay listing title. */
export function parseCardName(title: string): string | null {
  let s = ` ${title} `
  // Strip common MTG noise so Scryfall fuzzy matching has a cleaner target.
  s = s.replace(/\bMTG\b|\bMagic( the| The)? Gathering\b/gi, ' ')
  s = s.replace(/\bx?\d+\b/gi, ' ') // quantities like x1, 4x, 1
  s = s.replace(
    /\b(NM|LP|MP|HP|DMG|near[- ]?mint|lightly|moderately|heavily|played|damaged|mint|foil|etched|nonfoil|non[- ]?foil)\b/gi,
    ' '
  )
  s = s.replace(
    /\b(best offer|or best offer|obo|make( an)? offer|buy it now|bin|accepted|welcome|only|commander|staple|edh)\b/gi,
    ' '
  )
  // Drop trailing set-in-parens or after a dash, which usually isn't the name.
  s = s.split(/[-–—|(]/)[0] ?? s
  s = s.replace(/[^A-Za-z0-9 ,'`/]/g, ' ').replace(/\s+/g, ' ').trim()
  if (s.length < 3) return null
  return s
}

function detectFoil(title: string): boolean {
  return /\bfoil\b|\betched\b/i.test(title) && !/non[- ]?foil/i.test(title)
}

function mapCondition(raw?: string | null): CardCondition {
  const c = (raw ?? '').toLowerCase()
  if (c.includes('near') || c === 'new' || c.includes('mint')) return 'near_mint'
  if (c.includes('lightly')) return 'lightly_played'
  if (c.includes('moderately')) return 'moderately_played'
  if (c.includes('heavily')) return 'heavily_played'
  if (c.includes('damaged') || c.includes('poor')) return 'damaged'
  return 'unknown'
}

async function fetchOAuthToken(): Promise<string> {
  const url = isSandbox() ? OAUTH_URL_SANDBOX : OAUTH_URL_PROD
  const basic = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'https://api.ebay.com/oauth/api_scope',
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`eBay OAuth failed: ${res.status}`)
  }
  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) throw new Error('eBay OAuth returned no token')
  return json.access_token
}

type BrowseItemSummary = {
  itemId?: string
  title?: string
  price?: { value?: string; currency?: string }
  shippingOptions?: Array<{ shippingCost?: { value?: string } }>
  buyingOptions?: string[]
  condition?: string
  itemWebUrl?: string
  image?: { imageUrl?: string }
  seller?: { username?: string }
}

function mapBrowseItem(item: BrowseItemSummary): EbayListing | null {
  const askingPrice = item.price?.value ? Number(item.price.value) : NaN
  if (!item.itemId || !Number.isFinite(askingPrice)) return null

  const title = item.title ?? ''
  const shippingValue = item.shippingOptions?.[0]?.shippingCost?.value
  const shippingCost =
    shippingValue != null && Number.isFinite(Number(shippingValue))
      ? Number(shippingValue)
      : null

  return {
    id: item.itemId,
    title,
    askingPrice,
    bestOfferEnabled: (item.buyingOptions ?? []).includes('BEST_OFFER'),
    condition: mapCondition(item.condition),
    shippingCost,
    quantity: 1,
    cardName: parseCardName(title),
    setHint: null,
    foil: detectFoil(title),
    url: item.itemWebUrl ?? `https://www.ebay.com/itm/${item.itemId}`,
    imageUrl: item.image?.imageUrl ?? null,
    seller: item.seller?.username ?? null,
  }
}

function sampleResult(query: string, note: string | null): EbaySearchResult {
  const q = query.trim().toLowerCase()
  const listings = q
    ? SAMPLE_EBAY_LISTINGS.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.cardName ?? '').toLowerCase().includes(q)
      )
    : SAMPLE_EBAY_LISTINGS
  // If the query matches nothing in the samples, still show the full sample
  // set so the finder demonstrates the workflow rather than going blank.
  return {
    listings: listings.length > 0 ? listings : SAMPLE_EBAY_LISTINGS,
    usingSampleData: true,
    note,
  }
}

/**
 * Search eBay for MTG single listings that accept Best Offer. Always resolves —
 * on missing creds or any error it returns sample data with an explanatory note.
 */
export async function searchBestOfferListings(args: {
  query: string
  limit?: number
}): Promise<EbaySearchResult> {
  const limit = Math.min(200, Math.max(1, args.limit ?? 50))

  if (!isConfigured()) {
    return sampleResult(
      args.query,
      'eBay API credentials not set (EBAY_CLIENT_ID / EBAY_CLIENT_SECRET). Showing sample listings.'
    )
  }

  try {
    const token = await fetchOAuthToken()
    const base = isSandbox() ? BROWSE_URL_SANDBOX : BROWSE_URL_PROD
    const url = new URL(base)
    url.searchParams.set('q', args.query)
    url.searchParams.set('category_ids', MTG_CATEGORY_ID)
    url.searchParams.set('filter', 'buyingOptions:{BEST_OFFER}')
    url.searchParams.set('limit', String(limit))

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': process.env.EBAY_MARKETPLACE_ID ?? 'EBAY_US',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return sampleResult(
        args.query,
        `eBay Browse API returned ${res.status}. Showing sample listings.`
      )
    }

    const json = (await res.json()) as { itemSummaries?: BrowseItemSummary[] }
    const listings = (json.itemSummaries ?? [])
      .map(mapBrowseItem)
      .filter((l): l is EbayListing => l != null)

    if (listings.length === 0) {
      return sampleResult(
        args.query,
        'eBay returned no Best Offer listings for this query. Showing sample listings.'
      )
    }

    return { listings, usingSampleData: false, note: null }
  } catch (error) {
    return sampleResult(
      args.query,
      `eBay lookup failed (${
        error instanceof Error ? error.message : 'unknown error'
      }). Showing sample listings.`
    )
  }
}
