import type { Metadata } from 'next'
import AppHeader from '@/components/app-header'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import {
  getInventoryStatusBadgeClass,
  getInventoryStatusLabel,
  isInventoryStatusCompleted,
} from '@/lib/decks/inventory-status'
import { formatSupportsCommanderRules, getDeckFormatLabel, normalizeDeckFormat } from '@/lib/decks/formats'
import { getUnreadNotificationsCount } from '@/lib/notifications'
import { createClient } from '@/lib/supabase/server'
import { isUnreadTradeOffer, type TradeOfferRow } from '@/lib/trade-offers'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Completed Sales | Mythiverse Exchange',
  description:
    'View completed sales and committed deck moves that have already left the live marketplace on Mythiverse Exchange.',
  alternates: {
    canonical: '/completed-sales',
  },
}

type Deck = {
  id: number
  name: string
  commander?: string | null
  format?: string | null
  price_total_usd_foil?: number | null
  inventory_status?: string | null
  image_url?: string | null
}

type DeckCardForBracket = {
  deck_id: number
  section: 'commander' | 'mainboard' | 'token'
  quantity: number
  card_name: string
  cmc?: number | null
  mana_cost?: string | null
}

export default async function CompletedSalesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = await getAdminAccessForUser(user)
  const isAdmin = access.isAdmin
  const { data: tradeOffersData } = user
    ? await supabase
        .from('trade_offers')
        .select('id, offered_by_user_id, requested_user_id, offered_deck_id, requested_deck_id, cash_equalization_usd, status, message, accepted_trade_transaction_id, last_action_by_user_id, offered_by_viewed_at, requested_user_viewed_at, created_at, updated_at')
        .or(`offered_by_user_id.eq.${user.id},requested_user_id.eq.${user.id}`)
    : { data: [] as TradeOfferRow[] }
  const unreadTradeOffers = user
    ? ((tradeOffersData ?? []) as TradeOfferRow[]).filter((offer) => isUnreadTradeOffer(offer, user.id)).length
    : 0
  const unreadNotifications = user ? await getUnreadNotificationsCount(supabase, user.id) : 0

  const { data } = await supabase
    .from('decks')
    .select('id, name, commander, format, price_total_usd_foil, inventory_status, image_url')
    .order('id', { ascending: false })

  const decks = ((data ?? []) as Deck[]).filter((deck) => isInventoryStatusCompleted(deck.inventory_status))
  const deckIds = decks.map((deck) => deck.id)
  const { data: deckCards } = deckIds.length
    ? await supabase
        .from('deck_cards')
        .select('deck_id, section, quantity, card_name, cmc, mana_cost')
        .in('deck_id', deckIds)
    : { data: [] as DeckCardForBracket[] }

  const cardsByDeck = new Map<number, DeckCardForBracket[]>()
  for (const card of ((deckCards ?? []) as DeckCardForBracket[])) {
    const existing = cardsByDeck.get(card.deck_id) ?? []
    existing.push(card)
    cardsByDeck.set(card.deck_id, existing)
  }

  const deckViews = decks.map((deck) => ({
    ...deck,
    format: normalizeDeckFormat(deck.format),
    bracket: getCommanderBracketSummary(cardsByDeck.get(deck.id) ?? []),
  }))

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader
        current="decks"
        isSignedIn={!!user}
        isAdmin={isAdmin}
        unreadTradeOffers={unreadTradeOffers}
        unreadNotifications={unreadNotifications}
      />
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-zinc-300">
              Marketplace Archive
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              Completed sales and committed deck moves
            </h1>
            <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
              Decks no longer live in the public marketplace can land here once they have been checked out, completed, or otherwise moved out of active inventory.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/decks"
                className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
              >
                Back to Live Marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {deckViews.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <h2 className="text-2xl font-semibold">No completed deck moves yet</h2>
            <p className="mt-3 text-zinc-400">Completed sales, fulfilled orders, and closed deck moves will appear here once statuses are updated.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {deckViews.map((deck) => (
              <Link key={deck.id} href={`/decks/${deck.id}`}>
                <article className="overflow-hidden rounded-3xl border border-zinc-700/80 bg-zinc-900/80 opacity-85 transition hover:opacity-100">
                  <div className="relative aspect-[16/10] overflow-hidden border-b border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950">
                    {deck.image_url ? (
                      <img src={deck.image_url} alt={deck.name} className="h-full w-full object-cover object-top" />
                    ) : null}
                    <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                      {formatSupportsCommanderRules(deck.format) ? deck.bracket.label : getDeckFormatLabel(deck.format)}
                    </div>
                    <div
                      className={`absolute right-4 top-4 rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur ${getInventoryStatusBadgeClass(deck.inventory_status)}`}
                    >
                      {getInventoryStatusLabel(deck.inventory_status)}
                    </div>
                  </div>
                  <div className="p-5">
                    <h2 className="text-xl font-semibold">{deck.name}</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      {deck.commander || getDeckFormatLabel(deck.format)}
                    </p>
                    <div className="mt-4 text-sm text-zinc-300">
                      Final tracked value: ${Number(deck.price_total_usd_foil ?? 0).toFixed(2)}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
