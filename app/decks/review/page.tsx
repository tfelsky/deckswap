import type { Metadata } from 'next'
import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { getColorIdentityLabel } from '@/lib/decks/color-identity'
import { formatCurrencyAmount, normalizeSupportedCurrency } from '@/lib/currency'
import {
  getInventoryStatusBadgeClass,
  getInventoryStatusLabel,
  isInventoryStatusPublic,
} from '@/lib/decks/inventory-status'
import AppHeader from '@/components/app-header'
import DeckReviewClient, { type ReviewDeck } from '@/components/deck-review-client'
import {
  formatSupportsCommanderRules,
  getDeckFormatLabel,
  normalizeDeckFormat,
} from '@/lib/decks/formats'
import { getDeckMarketingChips } from '@/lib/decks/marketing'
import { getUnreadNotificationsCount } from '@/lib/notifications'
import { createClient } from '@/lib/supabase/server'
import { isUnreadTradeOffer, type TradeOfferRow } from '@/lib/trade-offers'
import { isUserDeckPassesSchemaMissing, type UserDeckPassRow } from '@/lib/user-deck-passes'
import {
  isUserDeckWatchlistSchemaMissing,
  type UserDeckWatchlistRow,
} from '@/lib/user-deck-watchlist'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Review Decks | Mythiverse Exchange',
  description:
    'Review live deck listings one at a time and record which ones you want to watch and which ones to hide.',
  alternates: {
    canonical: '/decks/review',
  },
}

type Deck = {
  id: number
  name: string
  commander?: string | null
  format?: string | null
  price_total_usd_foil?: number | null
  buy_now_price_usd?: number | null
  buy_now_currency?: string | null
  inventory_status?: string | null
  image_url?: string | null
  commander_count?: number | null
  mainboard_count?: number | null
  token_count?: number | null
  is_sleeved?: boolean | null
  is_boxed?: boolean | null
  is_sealed?: boolean | null
  is_complete_precon?: boolean | null
  box_type?: string | null
  color_identity?: string[] | null
}

type DeckCardForBracket = {
  deck_id: number
  section: 'commander' | 'mainboard' | 'token'
  quantity: number
  card_name: string
  cmc?: number | null
  mana_cost?: string | null
}

export default async function DeckReviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  const access = await getAdminAccessForUser(user)
  const { data: tradeOffersData } = await supabase
    .from('trade_offers')
    .select('id, offered_by_user_id, requested_user_id, offered_deck_id, requested_deck_id, cash_equalization_usd, status, message, accepted_trade_transaction_id, last_action_by_user_id, offered_by_viewed_at, requested_user_viewed_at, created_at, updated_at')
    .or(`offered_by_user_id.eq.${user.id},requested_user_id.eq.${user.id}`)
  const unreadTradeOffers = ((tradeOffersData ?? []) as TradeOfferRow[]).filter((offer) =>
    isUnreadTradeOffer(offer, user.id)
  ).length
  const unreadNotifications = await getUnreadNotificationsCount(supabase, user.id)

  async function decideDeckAction(
    deckId: number,
    decision: 'watch' | 'pass',
    reason: string | null
  ): Promise<{ ok: boolean }> {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/sign-in')
    if (!Number.isFinite(deckId)) return { ok: false }
    if (decision !== 'watch' && decision !== 'pass') return { ok: false }

    const cleanReason = typeof reason === 'string' ? reason.trim().slice(0, 120) || null : null

    // These tables have insert/delete RLS policies but no update policy, so
    // clear both lists first instead of relying on upsert's conflict update.
    for (const table of ['user_deck_passes', 'user_deck_watchlist'] as const) {
      await supabase.from(table).delete().eq('user_id', user.id).eq('deck_id', deckId)
    }

    const { error } =
      decision === 'watch'
        ? await supabase
            .from('user_deck_watchlist')
            .insert({ user_id: user.id, deck_id: deckId, note: cleanReason })
        : await supabase
            .from('user_deck_passes')
            .insert({ user_id: user.id, deck_id: deckId, reason: cleanReason })

    if (error) return { ok: false }

    revalidatePath('/decks')
    return { ok: true }
  }

  const { data, error } = await supabase
    .from('decks')
    .select(
      'id, name, commander, format, imported_at, price_total_usd_foil, buy_now_price_usd, buy_now_currency, inventory_status, image_url, commander_count, mainboard_count, token_count, is_sleeved, is_boxed, is_sealed, is_complete_precon, box_type, color_identity'
    )
    .order('imported_at', { ascending: false })

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <h1 className="text-red-500">Error: {error.message}</h1>
      </main>
    )
  }

  const publicDecks = ((data ?? []) as Deck[]).filter((deck) =>
    isInventoryStatusPublic(deck.inventory_status)
  )

  const passedDecksResult = await supabase
    .from('user_deck_passes')
    .select('id, user_id, deck_id, created_at, reason')
    .eq('user_id', user.id)
  const watchedDecksResult = await supabase
    .from('user_deck_watchlist')
    .select('id, user_id, deck_id, created_at, note')
    .eq('user_id', user.id)

  const passesSchemaMissing = isUserDeckPassesSchemaMissing(passedDecksResult.error?.message)
  const watchlistSchemaMissing = isUserDeckWatchlistSchemaMissing(watchedDecksResult.error?.message)
  const decidedDeckIds = new Set([
    ...(passesSchemaMissing ? [] : ((passedDecksResult.data ?? []) as UserDeckPassRow[])).map(
      (row) => row.deck_id
    ),
    ...(watchlistSchemaMissing
      ? []
      : ((watchedDecksResult.data ?? []) as UserDeckWatchlistRow[])
    ).map((row) => row.deck_id),
  ])

  const queue = publicDecks.filter((deck) => !decidedDeckIds.has(deck.id))
  const queueIds = queue.map((deck) => deck.id)

  const { data: deckCards } = queueIds.length
    ? await supabase
        .from('deck_cards')
        .select('deck_id, section, quantity, card_name, cmc, mana_cost')
        .in('deck_id', queueIds)
    : { data: [] as DeckCardForBracket[] }

  const cardsByDeck = new Map<number, DeckCardForBracket[]>()

  for (const card of ((deckCards ?? []) as DeckCardForBracket[])) {
    const existing = cardsByDeck.get(card.deck_id) ?? []
    existing.push(card)
    cardsByDeck.set(card.deck_id, existing)
  }

  const reviewDecks: ReviewDeck[] = queue.map((deck) => {
    const format = normalizeDeckFormat(deck.format)
    const supportsCommander = formatSupportsCommanderRules(format)
    const bracket = getCommanderBracketSummary(cardsByDeck.get(deck.id) ?? [])

    return {
      id: deck.id,
      name: deck.name,
      commander: deck.commander ?? null,
      formatLabel: getDeckFormatLabel(format),
      bracketLabel: supportsCommander ? bracket.label : null,
      gameChangerCount: supportsCommander ? bracket.gameChangerCount : 0,
      valueUsd: Number(deck.price_total_usd_foil ?? 0),
      buyNowLabel:
        Number(deck.buy_now_price_usd ?? 0) > 0
          ? formatCurrencyAmount(
              Number(deck.buy_now_price_usd),
              normalizeSupportedCurrency(deck.buy_now_currency)
            )
          : null,
      statusLabel: getInventoryStatusLabel(deck.inventory_status),
      statusBadgeClass: getInventoryStatusBadgeClass(deck.inventory_status),
      imageUrl: deck.image_url ?? null,
      cardCount: (deck.commander_count ?? 0) + (deck.mainboard_count ?? 0),
      tokenCount: Number(deck.token_count ?? 0),
      colorLabel: getColorIdentityLabel(deck.color_identity),
      chips: getDeckMarketingChips(deck),
    }
  })

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader
        current="decks"
        isSignedIn
        isAdmin={access.isAdmin}
        unreadTradeOffers={unreadTradeOffers}
        unreadNotifications={unreadNotifications}
      />
      <section className="mx-auto max-w-3xl px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Review decks</h1>
            <p className="mt-2 text-sm text-zinc-400">
              One deck at a time. Watchlist the ones you want to follow, mark the rest not
              interested — with a reason if you have one. Both lists feed your view of the
              marketplace.
            </p>
          </div>
          <Link
            href="/decks"
            className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10"
          >
            Back to browsing
          </Link>
        </div>

        {passesSchemaMissing || watchlistSchemaMissing ? (
          <div className="mt-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm text-yellow-100">
            {passesSchemaMissing ? (
              <span>Run <code>docs/sql/user-deck-passes.sql</code> to enable not-interested decisions.</span>
            ) : null}
            {passesSchemaMissing && watchlistSchemaMissing ? <span> </span> : null}
            {watchlistSchemaMissing ? (
              <span>Run <code>docs/sql/user-deck-watchlist.sql</code> to enable the watchlist.</span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8">
          <DeckReviewClient
            decks={reviewDecks}
            canWatch={!watchlistSchemaMissing}
            canPass={!passesSchemaMissing}
            decideAction={decideDeckAction}
          />
        </div>
      </section>
    </main>
  )
}
