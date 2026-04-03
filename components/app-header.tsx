'use client'

import Link from 'next/link'
import MarketplaceNav from '@/components/marketplace-nav'

type AppHeaderProps = {
  current:
    | 'home'
    | 'decks'
    | 'import'
    | 'create'
    | 'my-decks'
    | 'trade-matches'
    | 'profile'
    | 'trade-offers'
    | 'notifications'
  isSignedIn?: boolean
  isAdmin?: boolean
  unreadTradeOffers?: number
  unreadNotifications?: number
}

export default function AppHeader({
  current,
  isSignedIn,
  isAdmin = false,
  unreadTradeOffers = 0,
  unreadNotifications = 0,
}: AppHeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="mb-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
              ME
            </div>
            <div>
              <div className="text-base font-semibold text-foreground">Mythiverse Exchange</div>
              <div className="text-xs text-muted-foreground">Marketplace app</div>
            </div>
          </Link>

          <Link
            href="/"
            className="rounded-2xl border border-border/80 bg-card/60 px-3.5 py-2 text-sm text-foreground hover:bg-secondary/80"
          >
            Back to landing
          </Link>
        </div>

        <MarketplaceNav
          current={current}
          isSignedIn={isSignedIn}
          isAdmin={isAdmin}
          unreadTradeOffers={unreadTradeOffers}
          unreadNotifications={unreadNotifications}
        />
      </div>
    </header>
  )
}
