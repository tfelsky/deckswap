'use client'

import Link from 'next/link'

export type MarketplaceNavSection =
  | 'home'
  | 'optimizer'
  | 'decks'
  | 'singles'
  | 'import'
  | 'create'
  | 'my-decks'
  | 'my-singles'
  | 'singles-orders'
  | 'trade-matches'
  | 'profile'
  | 'trade-offers'
  | 'notifications'
  | 'support'
  | 'trades'
  | 'orders'

type MarketplaceNavProps = {
  current: MarketplaceNavSection
  isSignedIn?: boolean
  isAdmin?: boolean
  unreadTradeOffers?: number
  unreadNotifications?: number
}

const NAV_ITEMS = {
  optimizer: { href: '/optimizer', label: 'Optimizer' },
  decks: { href: '/decks', label: 'Decks' },
  singles: { href: '/singles', label: 'Singles' },
  import: { href: '/import-deck', label: 'Import' },
  create: { href: '/create-deck', label: 'Create' },
  'my-decks': { href: '/my-decks', label: 'My Decks' },
  'my-singles': { href: '/my-singles', label: 'My Singles' },
  'singles-orders': { href: '/singles-orders', label: 'Single Orders' },
  'trade-matches': { href: '/trade-matches', label: 'Swaps' },
  'trade-offers': { href: '/trade-offers', label: 'Offers' },
  notifications: { href: '/notifications', label: 'Alerts' },
  support: { href: '/support', label: 'Support' },
  profile: { href: '/settings/profile', label: 'Profile' },
} as const

// One predictable tab set everywhere, so the nav never reshuffles between pages.
const PUBLIC_TABS: Array<keyof typeof NAV_ITEMS> = ['decks', 'singles', 'optimizer', 'import']
const SIGNED_IN_TABS: Array<keyof typeof NAV_ITEMS> = [
  ...PUBLIC_TABS,
  'my-decks',
  'trade-matches',
  'trade-offers',
  'notifications',
]

export default function MarketplaceNav({
  current,
  isSignedIn,
  isAdmin = false,
  unreadTradeOffers = 0,
  unreadNotifications = 0,
}: MarketplaceNavProps) {
  const detectedSignedIn = isSignedIn ?? false
  const baseTabs = detectedSignedIn ? SIGNED_IN_TABS : PUBLIC_TABS
  const currentTab = current in NAV_ITEMS ? (current as keyof typeof NAV_ITEMS) : null
  const visibleItems =
    currentTab && current !== 'create' && !baseTabs.includes(currentTab)
      ? [...baseTabs, currentTab]
      : baseTabs

  return (
    <nav
      aria-label="Section navigation"
      className="flex gap-1.5 overflow-x-auto whitespace-nowrap pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
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
            className={`shrink-0 rounded-2xl border px-3 py-1.5 text-sm font-medium transition ${
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
          className="shrink-0 rounded-2xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/15"
        >
          Admin
        </Link>
      ) : null}
    </nav>
  )
}
