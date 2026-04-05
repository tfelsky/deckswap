import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getAbsoluteUrl } from '@/lib/site'

type SitemapEntry = MetadataRoute.Sitemap[number]

type PublicDeckRow = {
  id: number
  updated_at?: string | null
}

type PublicProfileRow = {
  username?: string | null
  updated_at?: string | null
}

type PublicAuctionRow = {
  id: number
  updated_at?: string | null
}

const STATIC_ROUTES: Array<{
  path: string
  changeFrequency: NonNullable<SitemapEntry['changeFrequency']>
  priority: number
}> = [
  { path: '/', changeFrequency: 'hourly', priority: 1 },
  { path: '/decks', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/auctions', changeFrequency: 'hourly', priority: 0.8 },
  { path: '/info', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/completed-sales', changeFrequency: 'daily', priority: 0.7 },
  { path: '/paper-power-9', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/holiday-giveback', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/compliance', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/accessibility', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/cookies', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/sustainability', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.5 },
]

function toIsoDate(value?: string | null) {
  if (!value) return new Date()

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) return null

  return createClient(url, key)
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: getAbsoluteUrl(route.path),
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  const supabase = getPublicClient()

  if (!supabase) {
    return staticEntries
  }

  const [decksResult, profilesResult, auctionsResult] = await Promise.all([
    supabase
      .from('decks')
      .select('id, updated_at')
      .in('inventory_status', ['deck_swap_live', 'buy_it_now_live', 'auction_live', 'auction_pending']),
    supabase.from('profiles').select('username, updated_at').not('username', 'is', null),
    supabase.from('auction_listings').select('id, updated_at'),
  ])

  const deckEntries: MetadataRoute.Sitemap = ((decksResult.data ?? []) as PublicDeckRow[]).map(
    (deck) => ({
      url: getAbsoluteUrl(`/decks/${deck.id}`),
      lastModified: toIsoDate(deck.updated_at),
      changeFrequency: 'daily',
      priority: 0.8,
    })
  )

  const profileEntries: MetadataRoute.Sitemap = (
    ((profilesResult.data ?? []) as PublicProfileRow[])
      .filter((profile) => profile.username?.trim())
      .map((profile) => ({
        url: getAbsoluteUrl(`/u/${profile.username!.trim().toLowerCase()}`),
        lastModified: toIsoDate(profile.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
  )

  const auctionEntries: MetadataRoute.Sitemap = (
    ((auctionsResult.data ?? []) as PublicAuctionRow[]).map((auction) => ({
      url: getAbsoluteUrl(`/auctions/${auction.id}`),
      lastModified: toIsoDate(auction.updated_at),
      changeFrequency: 'hourly' as const,
      priority: 0.7,
    }))
  )

  return [...staticEntries, ...deckEntries, ...profileEntries, ...auctionEntries]
}
