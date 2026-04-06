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
    | 'support'
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
  { key: 'support', href: '/support', label: 'Support' },
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
      return ['home', 'decks', 'import', 'support'].includes(item.key)
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
            const hasUnreadTradeOffers = item.key === 'trade-offers' && unreadTradeOffers > 0
            const hasUnreadNotifications =
              item.key === 'notifications' && unreadNotifications > 0
            const hasUnread = hasUnreadTradeOffers || hasUnreadNotifications
            const label =
              hasUnreadTradeOffers
                ? `${item.label} (${unreadTradeOffers})`
                : hasUnreadNotifications
                ? `${item.label} (${unreadNotifications})`
                : item.label

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`rounded-2xl px-3.5 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-[0_10px_28px_rgba(0,0,0,0.16)]'
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
