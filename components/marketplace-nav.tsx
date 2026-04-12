'use client'

import Link from 'next/link'

type MarketplaceNavProps = {
  current:
    | 'home'
    | 'decks'
    | 'import'
    | 'create'
    | 'my-decks'
    | 'my-singles'
    | 'trade-matches'
    | 'profile'
    | 'trade-offers'
    | 'notifications'
    | 'support'
  isSignedIn?: boolean
  isAdmin?: boolean
  unreadTradeOffers?: number
  unreadNotifications?: number
}

const NAV_ITEMS = {
  decks: { href: '/decks', label: 'Browse' },
  import: { href: '/import-deck', label: 'Import' },
  create: { href: '/create-deck', label: 'Create' },
  'my-decks': { href: '/my-decks', label: 'My Decks' },
  'my-singles': { href: '/my-singles', label: 'My Singles' },
  'trade-matches': { href: '/trade-matches', label: 'Swaps' },
  'trade-offers': { href: '/trade-offers', label: 'Offers' },
  notifications: { href: '/notifications', label: 'Alerts' },
  support: { href: '/support', label: 'Support' },
  profile: { href: '/settings/profile', label: 'Profile' },
} as const

const CONTEXT_GROUPS: Record<MarketplaceNavProps['current'], Array<keyof typeof NAV_ITEMS>> = {
  home: ['decks', 'trade-matches', 'import'],
  decks: ['decks', 'trade-matches', 'trade-offers', 'notifications'],
  import: ['import', 'create', 'decks'],
  create: ['import', 'create', 'my-decks'],
  'my-decks': ['my-decks', 'create', 'decks', 'notifications'],
  'my-singles': ['my-singles', 'my-decks', 'import', 'notifications'],
  'trade-matches': ['trade-matches', 'trade-offers', 'notifications', 'decks'],
  profile: ['profile', 'my-decks', 'notifications'],
  'trade-offers': ['trade-offers', 'trade-matches', 'notifications', 'decks'],
  notifications: ['notifications', 'trade-offers', 'my-decks'],
  support: ['support', 'decks', 'profile'],
}

export default function MarketplaceNav({
  current,
  isSignedIn,
  isAdmin = false,
  unreadTradeOffers = 0,
  unreadNotifications = 0,
}: MarketplaceNavProps) {
  const detectedSignedIn = isSignedIn ?? false
  const contextKeys = CONTEXT_GROUPS[current]
  const visibleItems = contextKeys.filter((key) => {
    if (detectedSignedIn) return true
    return !['create', 'my-decks', 'my-singles', 'trade-offers', 'notifications', 'profile'].includes(key)
  })

  return (
    <nav aria-label="Section navigation" className="flex flex-wrap gap-1.5">
      {visibleItems.map((key) => {
        const item = NAV_ITEMS[key]
        const active =
          key === 'import' ? current === 'import' || current === 'create' : key === current
        const hasUnreadTradeOffers = key === 'trade-offers' && unreadTradeOffers > 0
        const hasUnreadNotifications = key === 'notifications' && unreadNotifications > 0
        const label =
          hasUnreadTradeOffers
            ? `${item.label} (${unreadTradeOffers})`
            : hasUnreadNotifications
            ? `${item.label} (${unreadNotifications})`
            : item.label

        return (
          <Link
            key={key}
            href={item.href}
            className={`rounded-2xl border px-3 py-1.5 text-sm font-medium transition ${
              active
                ? 'border-primary/30 bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(0,0,0,0.14)]'
                : hasUnreadNotifications
                ? 'relative border border-amber-300/35 bg-[linear-gradient(135deg,rgba(251,191,36,0.24),rgba(245,158,11,0.12))] text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.08),0_10px_28px_rgba(245,158,11,0.18)] hover:bg-[linear-gradient(135deg,rgba(251,191,36,0.3),rgba(245,158,11,0.16))]'
                : hasUnreadTradeOffers
                ? 'border border-primary/25 bg-primary/10 text-primary shadow-[0_10px_24px_rgba(16,185,129,0.12)] hover:bg-primary/15'
                : 'border border-border/80 bg-secondary/50 text-foreground hover:bg-secondary/80'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {hasUnreadNotifications ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-200 shadow-[0_0_12px_rgba(253,224,71,0.9)]" />
                </span>
              ) : null}
              {label}
              {hasUnreadNotifications ? (
                <span className="rounded-full border border-amber-200/30 bg-amber-100/15 px-2 py-0.5 text-[11px] font-semibold text-amber-50">
                  New
                </span>
              ) : null}
            </span>
          </Link>
        )
      })}
      {isAdmin ? (
        <Link
          href="/admin"
          className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/15"
        >
          Admin
        </Link>
      ) : null}
    </nav>
  )
}
