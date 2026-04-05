import type { MetadataRoute } from 'next'
import { getAbsoluteUrl, getSiteUrl } from '@/lib/site'

const DISALLOWED_PATHS = [
  '/api/',
  '/admin/',
  '/auction-prototype',
  '/checkout-prototype',
  '/create-deck',
  '/guest-import',
  '/guest-preview',
  '/import-deck',
  '/import-library',
  '/my-decks',
  '/notifications',
  '/orders',
  '/orders/',
  '/settings/',
  '/sign-in',
  '/trade-drafts/',
  '/trade-matches',
  '/trade-offers',
  '/trade-offers/',
  '/trades',
  '/trades/',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: DISALLOWED_PATHS,
    },
    sitemap: getAbsoluteUrl('/sitemap.xml'),
    host: getSiteUrl(),
  }
}
