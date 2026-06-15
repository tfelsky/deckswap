'use client'

import { Header } from '@/components/header'
import ContextNav from '@/components/context-nav'

type AppHeaderProps = {
  // `current` is accepted for backwards compatibility with existing page
  // calls but is no longer used: the contextual bar derives the active
  // area/sub-function from the pathname.
  current?: string
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
