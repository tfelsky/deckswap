import AppHeader from '@/components/app-header'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { getUnreadNotificationsCount } from '@/lib/notifications'
import { createClient } from '@/lib/supabase/server'
import { isUnreadTradeOffer, type TradeOfferRow } from '@/lib/trade-offers'
import { ArrowRight, LineChart, Sparkles, Upload } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type DeckRow = {
  id: number
  name: string
  commander?: string | null
  image_url?: string | null
  price_total_usd_foil?: number | null
  commander_count?: number | null
  mainboard_count?: number | null
  token_count?: number | null
  imported_at?: string | null
}

function formatUsd(value?: number | null) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function readDeckId(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value
  const parsed = Number(candidate)
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null
}

export default async function OptimizerIndexPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const importedDeckId = readDeckId(resolvedSearchParams.importedDeckId)

  if (importedDeckId) {
    redirect(`/optimizer/${importedDeckId}?imported=1`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 pt-32 text-white">
        <AppHeader current="optimizer" isSignedIn={false} />
        <section className="border-b border-white/10 bg-zinc-900">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-amber-100">
                <Sparkles className="h-3.5 w-3.5" />
                Deck Optimizer
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Upload a deck. Grow the buying tree.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
                DeckSwap ranks printings by price, style fit, gameplay relevance, and collection confidence so every recommendation can point to a clear marketplace next step.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 rounded-md bg-amber-200 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-100"
                >
                  Sign in to optimize
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/guest-import?next=/optimizer"
                  className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.1]"
                >
                  Try guest import
                  <Upload className="h-4 w-4" />
                </Link>
                <Link
                  href="/optimizer/upgrade-path"
                  className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.1]"
                >
                  Scoring path
                  <LineChart className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="grid gap-3 self-end">
              {['Top 5 Buying Opportunities', 'Budget and style branches', 'Card-image value map'].map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-sm font-semibold text-white">{item}</div>
                  <div className="mt-1 text-sm leading-6 text-zinc-400">
                    Built around curated buying decisions, with affiliate disclosure close to the links.
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    )
  }

  const [{ data: decksData, error }, { data: tradeOffersData }] = await Promise.all([
    supabase
      .from('decks')
      .select('id, name, commander, image_url, price_total_usd_foil, commander_count, mainboard_count, token_count, imported_at')
      .eq('user_id', user.id)
      .order('id', { ascending: false }),
    supabase
      .from('trade_offers')
      .select('id, offered_by_user_id, requested_user_id, offered_deck_id, requested_deck_id, cash_equalization_usd, status, message, accepted_trade_transaction_id, last_action_by_user_id, offered_by_viewed_at, requested_user_viewed_at, created_at, updated_at')
      .or(`offered_by_user_id.eq.${user.id},requested_user_id.eq.${user.id}`),
  ])

  const access = await getAdminAccessForUser(user)
  const unreadNotifications = await getUnreadNotificationsCount(supabase, user.id)
  const unreadTradeOffers = ((tradeOffersData ?? []) as TradeOfferRow[]).filter((offer) =>
    isUnreadTradeOffer(offer, user.id)
  ).length

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 pt-32 text-white">
        <AppHeader
          current="optimizer"
          isSignedIn
          isAdmin={access.isAdmin}
          unreadNotifications={unreadNotifications}
          unreadTradeOffers={unreadTradeOffers}
        />
        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-6">
            <h1 className="text-2xl font-semibold text-red-100">Optimizer Error</h1>
            <p className="mt-2 text-sm text-red-100/80">{error.message}</p>
          </div>
        </section>
      </main>
    )
  }

  const decks = (decksData ?? []) as DeckRow[]

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader
        current="optimizer"
        isSignedIn
        isAdmin={access.isAdmin}
        unreadNotifications={unreadNotifications}
        unreadTradeOffers={unreadTradeOffers}
      />

      <section className="border-b border-white/10 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200">
                Deck Optimizer
              </div>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
                Choose a deck to optimize
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                Each run builds a buying tree with five branches and a ranked opportunity list. This is curated purchase guidance, not financial advice.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/optimizer/upgrade-path"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.1]"
              >
                Scoring path
                <LineChart className="h-4 w-4" />
              </Link>
              <Link
                href="/import-deck?next=/optimizer"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-200 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-100"
              >
                Import another deck
                <Upload className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {decks.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold text-white">No decks yet</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Import a deck first, then the optimizer can rank printings and build the buying tree.
            </p>
            <Link
              href="/import-deck?next=/optimizer"
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-amber-200 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-100"
            >
              Import deck
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {decks.map((deck) => {
              const totalCards =
                Number(deck.commander_count ?? 0) +
                Number(deck.mainboard_count ?? 0) +
                Number(deck.token_count ?? 0)

              return (
                <article
                  key={deck.id}
                  className="overflow-hidden rounded-lg border border-white/10 bg-zinc-900"
                >
                  <div className="aspect-[16/9] bg-zinc-950">
                    {deck.image_url ? (
                      <img
                        src={deck.image_url}
                        alt={deck.name}
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                        No image yet
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-white">{deck.name}</h2>
                        <p className="mt-1 text-sm text-zinc-400">
                          {deck.commander || 'Commander not set'}
                        </p>
                      </div>
                      <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
                        <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                          Current
                        </div>
                        <div className="font-semibold text-amber-100">
                          {formatUsd(deck.price_total_usd_foil)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-300">
                      <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">
                        {totalCards} cards
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">
                        {deck.imported_at ? 'Imported' : 'Manual'}
                      </span>
                    </div>

                    <Link
                      href={`/optimizer/${deck.id}`}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-200 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-100"
                    >
                      Open optimizer
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
