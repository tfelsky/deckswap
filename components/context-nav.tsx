'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { activeSubHref, detectArea } from '@/lib/site-nav'

type ContextNavProps = {
  isAdmin?: boolean
  unreadTradeOffers?: number
  unreadNotifications?: number
}

// The contextual second bar: shows the sub-functions of the current area.
// Renders nothing when the current area has no sub-functions (e.g. Learn,
// Support) or the path doesn't map to a known area.
export default function ContextNav({
  isAdmin = false,
  unreadTradeOffers = 0,
  unreadNotifications = 0,
}: ContextNavProps) {
  const pathname = usePathname() || ''
  const area = detectArea(pathname)
  const items = area?.sub ?? []
  const showAdmin = isAdmin && area?.key === 'account'

  if (items.length === 0 && !showAdmin) return null

  const active = activeSubHref(pathname, items)

  return (
    <div className="fixed inset-x-0 top-16 z-40 border-b border-border/70 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <nav
          aria-label="Section navigation"
          className="flex gap-1.5 overflow-x-auto whitespace-nowrap pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const isActive = item.href === active
            const count =
              item.badge === 'offers'
                ? unreadTradeOffers
                : item.badge === 'alerts'
                ? unreadNotifications
                : 0
            const hasBadge = count > 0

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-2xl border px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? 'border-primary/30 bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(0,0,0,0.14)]'
                    : hasBadge
                    ? 'border border-primary/25 bg-primary/10 text-primary hover:bg-primary/15'
                    : 'border border-border/80 bg-secondary/50 text-foreground hover:bg-secondary/80'
                }`}
              >
                {item.label}
                {hasBadge ? ` (${count})` : ''}
              </Link>
            )
          })}

          {showAdmin ? (
            <Link
              href="/admin"
              className="shrink-0 rounded-2xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/15"
            >
              Admin
            </Link>
          ) : null}
        </nav>
      </div>
    </div>
  )
}
