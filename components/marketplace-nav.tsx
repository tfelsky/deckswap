'use client'

import Link from 'next/link'
import SignOutButton from '@/components/sign-out-button'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

type MarketplaceNavProps = {
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

const ITEMS = [
  { key: 'home', href: '/', label: 'Home' },
  { key: 'decks', href: '/decks', label: 'Marketplace' },
  { key: 'import', href: '/import-deck', label: 'Add Deck' },
  { key: 'my-decks', href: '/my-decks', label: 'My Decks' },
  { key: 'trade-matches', href: '/trade-matches', label: 'Deck Swap' },
  { key: 'trade-offers', href: '/trade-offers', label: 'Trade Offers' },
  { key: 'notifications', href: '/notifications', label: 'Notifications' },
  { key: 'profile', href: '/settings/profile', label: 'Profile' },
] as const

export default function MarketplaceNav({
  current,
  isSignedIn,
  isAdmin = false,
  unreadTradeOffers = 0,
  unreadNotifications = 0,
}: MarketplaceNavProps) {
  const supabase = createClient()
  const [detectedSignedIn, setDetectedSignedIn] = useState<boolean>(isSignedIn ?? false)

  useEffect(() => {
    if (typeof isSignedIn === 'boolean') {
      setDetectedSignedIn(isSignedIn)
      return
    }

    let active = true

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setDetectedSignedIn(!!data.user)
      }
    })

    return () => {
      active = false
    }
  }, [isSignedIn, supabase])

  const visibleItems = ITEMS.filter((item) => {
    if (!detectedSignedIn) {
      return ['home', 'decks', 'import'].includes(item.key)
    }

    return true
  })

  return (
    <div className="deckswap-glass rounded-3xl p-2.5">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {visibleItems.map((item) => {
            const active =
              item.key === 'import'
                ? current === 'import' || current === 'create'
                : item.key === current
            const label =
              item.key === 'trade-offers' && unreadTradeOffers > 0
                ? `${item.label} (${unreadTradeOffers})`
                : item.key === 'notifications' && unreadNotifications > 0
                ? `${item.label} (${unreadNotifications})`
                : item.label

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`rounded-2xl px-3.5 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-[0_10px_28px_rgba(0,0,0,0.16)]'
                    : 'border border-border/80 bg-secondary/50 text-foreground hover:bg-secondary/80'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {!detectedSignedIn ? (
            <Link
              href="/sign-in"
              className="rounded-2xl border border-border/80 bg-secondary/50 px-3.5 py-2 text-sm font-medium text-foreground hover:bg-secondary/80"
            >
              Sign in
            </Link>
          ) : (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-2xl border border-primary/20 bg-primary/10 px-3.5 py-2 text-sm font-medium text-primary hover:bg-primary/15"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/settings/profile"
                className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15"
              >
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-300 align-middle shadow-[0_0_12px_rgba(110,231,183,0.75)]" />
                Signed in
              </Link>
              <SignOutButton />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
