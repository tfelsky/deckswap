// Single source of truth for the site's two-tier navigation.
//
// Tier 1 (persistent): the main sections of the site, rendered in the top
// branded Header. Always the same, wherever you are.
// Tier 2 (contextual): the sub-functions of whatever area you're currently in,
// rendered in the ContextNav bar below the Header. Changes per area.
//
// Both bars read from SITE_AREAS so they can never drift apart. Each area owns
// a set of pathname prefixes used to detect "which area am I in?".

export type NavBadge = 'offers' | 'alerts'

export type SubNavItem = {
  label: string
  href: string
  badge?: NavBadge
}

export type SiteArea = {
  key: string
  /** Label + link shown in the persistent main-sections bar. */
  label: string
  href: string
  /** Pathname prefixes that belong to this area (for active detection). */
  prefixes: string[]
  /** Whether this area appears in the persistent top bar. */
  inMainBar: boolean
  /** Context sub-functions shown in the second bar while in this area. */
  sub: SubNavItem[]
}

export const SITE_AREAS: SiteArea[] = [
  {
    key: 'decks',
    label: 'Decks',
    href: '/decks',
    prefixes: ['/decks'],
    inMainBar: true,
    sub: [
      { label: 'Browse', href: '/decks' },
      { label: 'Import', href: '/import-deck' },
    ],
  },
  {
    key: 'singles',
    label: 'Singles',
    href: '/singles',
    prefixes: ['/singles', '/my-singles', '/singles-orders'],
    inMainBar: true,
    sub: [
      { label: 'Browse', href: '/singles' },
      { label: 'My Singles', href: '/my-singles' },
      { label: 'Single Orders', href: '/singles-orders' },
    ],
  },
  {
    key: 'swap',
    label: 'Deck Swap',
    href: '/trade-matches',
    prefixes: ['/trade-matches', '/trade-offers', '/trade-deals', '/trade-drafts', '/trades'],
    inMainBar: true,
    sub: [
      { label: 'Matches', href: '/trade-matches' },
      { label: 'Offers', href: '/trade-offers', badge: 'offers' },
      { label: 'Trades', href: '/trades' },
    ],
  },
  {
    key: 'mydecks',
    label: 'My Decks',
    href: '/my-decks',
    prefixes: ['/my-decks', '/optimizer', '/import-deck', '/create-deck'],
    inMainBar: true,
    sub: [
      { label: 'My Decks', href: '/my-decks' },
      { label: 'Optimizer', href: '/optimizer' },
      { label: 'Import', href: '/import-deck' },
      { label: 'Create', href: '/create-deck' },
    ],
  },
  {
    key: 'podmatch',
    label: 'PodMatch',
    href: '/podmatch',
    prefixes: ['/podmatch'],
    inMainBar: true,
    sub: [
      { label: 'For Players', href: '/podmatch/users' },
      { label: 'For Stores', href: '/podmatch/stores' },
      { label: 'Analyze', href: '/podmatch' },
      { label: 'Pods', href: '/podmatch/pods/generate' },
      { label: 'Leagues', href: '/podmatch/leagues' },
    ],
  },
  {
    key: 'stores',
    label: 'Stores',
    href: '/for-stores',
    prefixes: ['/for-stores', '/lgs-tv', '/pricing'],
    inMainBar: true,
    sub: [
      { label: 'Store Program', href: '/for-stores' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'LGS TV', href: '/lgs-tv' },
    ],
  },
  {
    key: 'account',
    label: 'Profile',
    href: '/settings/profile',
    prefixes: ['/settings', '/notifications', '/orders'],
    inMainBar: true,
    sub: [
      { label: 'Profile', href: '/settings/profile' },
      { label: 'Notifications', href: '/notifications', badge: 'alerts' },
      { label: 'Orders', href: '/orders' },
    ],
  },
  {
    key: 'learn',
    label: 'How It Works',
    href: '/info',
    prefixes: ['/info'],
    inMainBar: false,
    sub: [],
  },
  {
    key: 'support',
    label: 'Support',
    href: '/support',
    prefixes: ['/support'],
    inMainBar: true,
    sub: [],
  },
]

function matchLength(pathname: string, prefix: string): number {
  if (pathname === prefix || pathname.startsWith(prefix + '/')) return prefix.length
  return 0
}

/** Which area does this pathname belong to? Longest matching prefix wins. */
export function detectArea(pathname: string): SiteArea | null {
  let best: SiteArea | null = null
  let bestLen = 0
  for (const area of SITE_AREAS) {
    for (const prefix of area.prefixes) {
      const len = matchLength(pathname, prefix)
      if (len > bestLen) {
        bestLen = len
        best = area
      }
    }
  }
  return best
}

/** Which sub-item is active for this pathname? Longest matching href wins. */
export function activeSubHref(pathname: string, items: SubNavItem[]): string | null {
  let best: string | null = null
  let bestLen = 0
  for (const item of items) {
    const len = matchLength(pathname, item.href)
    if (len > bestLen) {
      bestLen = len
      best = item.href
    }
  }
  return best
}
