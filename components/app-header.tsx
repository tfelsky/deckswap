'use client'

import { Header } from '@/components/header'
import MarketplaceNav from '@/components/marketplace-nav'

type AppHeaderProps = {
  current:
    | 'home'
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
    <>
      <Header />
      <div className="fixed inset-x-0 top-16 z-40 border-b border-border/70 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <MarketplaceNav
          current={current}
          isSignedIn={isSignedIn}
          isAdmin={isAdmin}
          unreadTradeOffers={unreadTradeOffers}
          unreadNotifications={unreadNotifications}
        />
        </div>
      </div>
    </>
  )
}
