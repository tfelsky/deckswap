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
    | 'profile'
    | 'trade-offers'
  isSignedIn?: boolean
  isAdmin?: boolean
  unreadTradeOffers?: number
}

const ITEMS = [
  { key: 'home', href: '/', label: 'Home' },
  { key: 'decks', href: '/decks', label: 'Marketplace' },
  { key: 'import', href: '/import-deck', label: 'Import' },
  { key: 'create', href: '/create-deck', label: 'Create' },
  { key: 'my-decks', href: '/my-decks', label: 'My Decks' },
  { key: 'trade-offers', href: '/trade-offers', label: 'Trade Offers' },
  { key: 'profile', href: '/settings/profile', label: 'Profile' },
] as const

export default function MarketplaceNav({
  current,
  isSignedIn,
  isAdmin = false,
  unreadTradeOffers = 0,
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
      return ['home', 'decks', 'import', 'create'].includes(item.key)
    }

    return true
  })

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {visibleItems.map((item) => {
            const active = item.key === current
            const label =
              item.key === 'trade-offers' && unreadTradeOffers > 0
                ? `${item.label} (${unreadTradeOffers})`
                : item.label

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-emerald-400 text-zinc-950'
                    : 'border border-white/10 bg-zinc-950/50 text-zinc-200 hover:bg-white/10'
                }`}
              >
                {label}
              </Link>
            )
          })}

          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-400/15"
            >
              Admin
            </Link>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {!detectedSignedIn ? (
            <Link
              href="/sign-in"
              className="rounded-2xl border border-white/10 bg-zinc-950/50 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              Sign in
            </Link>
          ) : (
            <SignOutButton />
          )}
        </div>
      </div>
    </div>
  )
}
