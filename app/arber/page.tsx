import Link from 'next/link'
import AppHeader from '@/components/app-header'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import ArberScan from '@/components/arber/arber-scan'
import { TrendingUp, Search, Scale, HandCoins } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ArberPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 pt-32 text-white">
        <AppHeader current="arber" isSignedIn={false} />
        <section className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-8">
            <h1 className="text-3xl font-semibold">Arb&apos;r</h1>
            <p className="mt-3 text-zinc-400">
              Sign in to scan eBay Best Offer listings for MTG singles you can flip
              into a buylist for a profit.
            </p>
            <Link
              href="/sign-in"
              className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Sign in
            </Link>
          </div>
        </section>
      </main>
    )
  }

  const { isAdmin } = await getAdminAccessForUser(user)

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="arber" isSignedIn isAdmin={isAdmin} />

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-900/40 p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <TrendingUp className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-3xl font-semibold">Arb&apos;r</h1>
              <p className="text-sm text-zinc-400">
                Find MTG singles listed with <em>Best Offer</em> on eBay that you can
                buy low and resell into a buylist for a profit.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Feature icon={<Search className="h-5 w-5" />} title="Scan Best Offer">
              Pulls eBay listings that accept offers, parses the card, and prices it
              against Scryfall market data.
            </Feature>
            <Feature icon={<HandCoins className="h-5 w-5" />} title="Buylist sellback">
              Estimates the cash a buylist pays — scaled by price band — and the offer
              you&apos;d need to clear a profit.
            </Feature>
            <Feature icon={<Scale className="h-5 w-5" />} title="Margin-ranked">
              Deterministic math: suggested offer, acquisition cost, net sellback, and a
              walk-away ceiling for every find.
            </Feature>
          </div>
        </div>

        <ArberScan />
      </section>
    </main>
  )
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">{children}</p>
    </div>
  )
}
