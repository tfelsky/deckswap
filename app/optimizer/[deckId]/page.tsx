import { DeckTree } from '@/components/optimizer/deck-tree'
import { TopOpportunities } from '@/components/optimizer/top-opportunities'
import AppHeader from '@/components/app-header'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { formatCurrencyAmount } from '@/lib/currency'
import { getUnreadNotificationsCount } from '@/lib/notifications'
import { buildDeckOptimization, type OptimizerCardRow } from '@/lib/optimizer/scoring'
import { createClient } from '@/lib/supabase/server'
import { isUnreadTradeOffer, type TradeOfferRow } from '@/lib/trade-offers'
import { ArrowLeft, Upload } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type DeckRow = {
  id: number
  user_id: string
  name: string
  commander?: string | null
  image_url?: string | null
  price_total_usd_foil?: number | null
}

function parseDeckId(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null
}

export default async function OptimizerDeckPage({
  params,
}: {
  params: Promise<{ deckId: string }>
}) {
  const { deckId: deckIdParam } = await params
  const deckId = parseDeckId(deckIdParam)

  if (!deckId) {
    redirect('/optimizer')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const [{ data: deckData, error: deckError }, { data: tradeOffersData }] = await Promise.all([
    supabase
      .from('decks')
      .select('id, user_id, name, commander, image_url, price_total_usd_foil')
      .eq('id', deckId)
      .single(),
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

  if (deckError || !deckData) {
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
            <h1 className="text-2xl font-semibold text-red-100">Deck not found</h1>
            <p className="mt-2 text-sm text-red-100/80">
              {deckError?.message ?? 'The optimizer could not load this deck.'}
            </p>
          </div>
        </section>
      </main>
    )
  }

  const deck = deckData as DeckRow

  if (deck.user_id !== user.id && !access.isAdmin) {
    redirect('/optimizer')
  }

  const { data: cardsData, error: cardsError } = await supabase
    .from('deck_cards')
    .select('id, deck_id, card_name, section, quantity, set_code, set_name, collector_number, foil, image_url, price_usd, price_usd_foil, price_usd_etched, rarity, type_line, oracle_text, cmc, released_at, finishes')
    .eq('deck_id', deckId)
    .order('section', { ascending: true })
    .order('sort_order', { ascending: true })

  const cards = ((cardsData ?? []) as OptimizerCardRow[]).map((card) => ({
    ...card,
    quantity: Number(card.quantity ?? 1),
  }))
  const optimization = buildDeckOptimization(deck, cards)

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
          <Link
            href="/optimizer"
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-white/[0.09]"
          >
            <ArrowLeft className="h-4 w-4" />
            Optimizer home
          </Link>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200">
                Buying Tree
              </div>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
                {deck.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                {deck.commander || 'Commander not set'} - Optimized printings, style branches, and marketplace handoffs for this deck.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">Current</div>
                <div className="mt-1 text-xl font-semibold text-white">
                  {formatCurrencyAmount(optimization.summary.totalEstimatedUsd, 'USD')}
                </div>
              </div>
              <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4">
                <div className="text-[10px] uppercase tracking-wide text-cyan-100/70">Playable</div>
                <div className="mt-1 text-xl font-semibold text-cyan-50">
                  {formatCurrencyAmount(optimization.summary.optimizedPlayableUsd, 'USD')}
                </div>
              </div>
              <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-4">
                <div className="text-[10px] uppercase tracking-wide text-amber-100/70">Top Score</div>
                <div className="mt-1 text-xl font-semibold text-amber-50">
                  {optimization.summary.topScore}
                </div>
              </div>
            </div>
          </div>

          {cardsError ? (
            <div className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
              {cardsError.message}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2 text-xs text-zinc-300">
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">
              {optimization.summary.pricedCards} priced cards
            </span>
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">
              {optimization.summary.totalCards} total cards
            </span>
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">
              {optimization.summary.styleUpgradeCount} style upgrades
            </span>
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">
              {optimization.summary.watchlistCount} watchlist flags
            </span>
          </div>
        </div>
      </section>

      <TopOpportunities deckId={deck.id} opportunities={optimization.topOpportunities} />
      <DeckTree deck={deck} optimization={optimization} />

      <section className="border-t border-white/10 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-lg font-semibold text-white">Need a fresher list?</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Re-import from Moxfield or paste an updated list to rebuild the optimizer tree.
            </p>
          </div>
          <Link
            href="/import-deck?next=/optimizer"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-200 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-100"
          >
            Import updated deck
            <Upload className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="bg-zinc-950 pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-xs leading-5 text-zinc-500">
            DeckSwap recommendations are curated hobby guidance based on visible card metadata, current prices, and lightweight scoring. They are not financial advice, investment advice, or a guarantee of future card value.
          </p>
        </div>
      </section>
    </main>
  )
}
