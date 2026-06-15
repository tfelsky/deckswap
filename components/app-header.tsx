'use client'

import { Header } from '@/components/header'
import ContextNav from '@/components/context-nav'
import { type MarketplaceNavSection } from '@/components/marketplace-nav'

type AppHeaderProps = {
  // Kept for backwards compatibility with existing page calls; the contextual
  // bar now derives the active area/sub-function from the pathname.
  current: MarketplaceNavSection
  isSignedIn?: boolean
  isAdmin?: boolean
  unreadTradeOffers?: number
  unreadNotifications?: number
}

export default function AppHeader({
  isAdmin = false,
  unreadTradeOffers = 0,
  unreadNotifications = 0,
}: AppHeaderProps) {
  return (
    <>
      <Header />
      <ContextNav
        isAdmin={isAdmin}
        unreadTradeOffers={unreadTradeOffers}
        unreadNotifications={unreadNotifications}
      />
    </>
  )
}
