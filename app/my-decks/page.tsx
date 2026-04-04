import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import { getAdminAccessForUser } from '@/lib/admin/access'
import AppHeader from '@/components/app-header'
import { formatCurrencyAmount, normalizeSupportedCurrency } from '@/lib/currency'
import { formatSupportsCommanderRules, getDeckFormatLabel, normalizeDeckFormat } from '@/lib/decks/formats'
import { getDeckMarketingChips } from '@/lib/decks/marketing'
import { calculateDeckTradeValue } from '@/lib/decks/trade-value'
import { createClient } from '@/lib/supabase/server'
import { getUnreadNotificationsCount } from '@/lib/notifications'
import { isUnreadTradeOffer, type TradeOfferRow } from '@/lib/trade-offers'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type Deck = {
  id: number
  name: string
  commander?: string | null
  format?: string | null
  price_total_usd_foil?: number | null
  buy_now_price_usd?: number | null
  buy_now_currency?: string | null
  image_url?: string | null
  is_sleeved?: boolean | null
  is_boxed?: boolean | null
  is_sealed?: boolean | null
  is_complete_precon?: boolean | null
  is_listed_for_trade?: boolean | null
  box_type?: string | null
}

type DeckCardForBracket = {
  deck_id: number
  section: 'commander' | 'mainboard' | 'token'
  quantity: number
  card_name: string
  cmc?: number | null
  mana_cost?: string | null
}

export default async function MyDecksPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <section className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-8">
            <h1 className="text-3xl font-semibold">My Decks</h1>
            <p className="mt-3 text-zinc-400">You need to sign in to view your decks.</p>

            <div className="mt-6 flex gap-3">
              <Link
                href="/sign-in"
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
              >
                Sign in
              </Link>

              <Link
                href="/decks"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                Back to marketplace
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  const { data, error } = await supabase
    .from('decks')
    .select('id, name, commander, format, price_total_usd_foil, buy_now_price_usd, buy_now_currency, image_url, is_sleeved, is_boxed, is_sealed, is_complete_precon, is_listed_for_trade, box_type')
    .eq('user_id', user.id)
    .order('id', { ascending: false })

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-400">My Decks Error</h1>
          <p className="mt-3 text-sm text-zinc-300">{error.message}</p>
        </div>
      </main>
    )
  }

  const { data: tradeOffersData } = await supabase
    .from('trade_offers')
    .select('id, offered_by_user_id, requested_user_id, offered_deck_id, requested_deck_id, cash_equalization_usd, status, message, accepted_trade_transaction_id, last_action_by_user_id, offered_by_viewed_at, requested_user_viewed_at, created_at, updated_at')
    .or(`offered_by_user_id.eq.${user.id},requested_user_id.eq.${user.id}`)

  const decks = (data ?? []) as Deck[]
  const unreadTradeOffers = ((tradeOffersData ?? []) as TradeOfferRow[]).filter((offer) =>
    isUnreadTradeOffer(offer, user.id)
  ).length
  const unreadNotifications = await getUnreadNotificationsCount(supabase, user.id)
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

  const deckViews = decks.map((deck) => {
    const bracket = getCommanderBracketSummary(cardsByDeck.get(deck.id) ?? [])
    return { ...deck, bracket, format: normalizeDeckFormat(deck.format) }
  })
  const deckValues = deckViews.map((deck) => Number(deck.price_total_usd_foil ?? 0))
  const totalDeckValue = deckValues.reduce((sum, value) => sum + value, 0)
  const totalDeckSwapValue = deckValues.reduce(
    (sum, value) => sum + calculateDeckTradeValue(value).deckSwapValue,
    0
  )
  const totalBuylistValue = deckValues.reduce(
    (sum, value) => sum + calculateDeckTradeValue(value).buylistValue,
    0
  )
  const totalExtraVsBuylist = deckValues.reduce(
    (sum, value) => sum + calculateDeckTradeValue(value).extraVsBuylist,
    0
  )

  const ratedDecks = deckViews.filter(
    (deck) => formatSupportsCommanderRules(deck.format) && deck.bracket.bracket != null
  )
  const averageBracket =
    ratedDecks.length > 0
      ? (
          ratedDecks.reduce(
            (sum, deck) => sum + (deck.bracket.bracket ?? 0),
            0
          ) / ratedDecks.length
        ).toFixed(1)
      : '0.0'
  const access = await getAdminAccessForUser(user)
  const isAdmin = access.isAdmin

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader
        current="my-decks"
        isSignedIn
        isAdmin={isAdmin}
        unreadTradeOffers={unreadTradeOffers}
        unreadNotifications={unreadNotifications}
      />
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                Your Collection
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                My Decks
              </h1>

              <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
                View and manage the deck inventory you have listed in the marketplace across supported formats.
              </p>
            </div>

          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">My Listings</div>
              <div className="mt-2 text-3xl font-semibold">{deckViews.length}</div>
              <div className="mt-2 text-xs text-zinc-500">Decks currently in your marketplace collection.</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Total Deck Value</div>
              <div className="mt-2 text-3xl font-semibold text-emerald-300">
                ${Math.round(totalDeckValue)}
              </div>
              <div className="mt-2 text-xs text-zinc-500">Blended card value across the whole deck inventory.</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Deck Swap Value</div>
              <div className="mt-2 text-3xl font-semibold text-sky-200">
                ${Math.round(totalDeckSwapValue)}
              </div>
              <div className="mt-2 text-xs text-zinc-500">Value after Deck Swap fee, shipping, and insurance.</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Buylist Estimate</div>
              <div className="mt-2 text-3xl font-semibold text-amber-200">
                ${Math.round(totalBuylistValue)}
              </div>
              <div className="mt-2 text-xs text-zinc-500">Conservative store-style trade-in estimate.</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Extra vs Buylist</div>
              <div className="mt-2 text-3xl font-semibold text-emerald-300">
                ${Math.round(totalExtraVsBuylist)}
              </div>
              <div className="mt-2 text-xs text-zinc-500">Estimated additional value kept through Deck Swap.</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2 xl:col-span-1 2xl:col-span-1">
              <div className="text-sm text-zinc-400">Value Ladder</div>
              <div className="mt-2 text-3xl font-semibold">1-2-3</div>
              <div className="mt-2 text-xs text-zinc-500">Deck Swap first, Buy It Now second, auction only as the fallback lane.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {deckViews.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <h3 className="text-xl font-semibold">No decks yet</h3>
            <p className="mt-2 text-zinc-400">You have not created any decks yet.</p>
            <Link
              href="/create-deck"
              className="mt-6 inline-block rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
            >
              Create your first deck
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {deckViews.map((deck) => (
              <article
                key={deck.id}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/80 transition duration-200 hover:border-emerald-400/30 hover:bg-zinc-900"
              >
                {(() => {
                  const tradeValue = calculateDeckTradeValue(Number(deck.price_total_usd_foil ?? 0))

                  return (
                    <>
                <Link href={`/decks/${deck.id}`} className="block">
                  <div className="relative aspect-[16/10] overflow-hidden border-b border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950">
                    {deck.image_url ? (
                      <>
                        <img
                          src={deck.image_url}
                          alt={deck.name}
                          className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
                        />

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5">
                          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                            {getDeckFormatLabel(deck.format)}
                          </div>
                          <div className="mt-2 text-2xl font-semibold text-white">
                            {deck.commander || deck.name}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full w-full items-end p-5">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                            {getDeckFormatLabel(deck.format)}
                          </div>
                          <div className="mt-2 text-2xl font-semibold text-white">
                            {deck.commander || deck.name}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                      {formatSupportsCommanderRules(deck.format)
                        ? deck.bracket.label
                        : getDeckFormatLabel(deck.format)}
                    </div>
                  </div>
                </Link>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-xl font-semibold tracking-tight">{deck.name}</h3>
                        <p className="mt-1 text-sm text-zinc-400">
                          {formatSupportsCommanderRules(deck.format)
                            ? `Commander: ${deck.commander || 'Not set'}`
                            : `Format: ${getDeckFormatLabel(deck.format)}`}
                        </p>
                    </div>

                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-right">
                      <div className="text-[10px] uppercase tracking-wide text-emerald-300/80">
                        Market
                      </div>
                      <div className="text-lg font-semibold text-emerald-300">
                        ${Math.round(tradeValue.deckValue)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                        Buylist
                      </div>
                      <div className="mt-1 text-lg font-semibold text-amber-200">
                        ${Math.round(tradeValue.buylistValue)}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {(tradeValue.buylistRate * 100).toFixed(0)}% estimate
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                        Deck Swap Value
                      </div>
                      <div className="mt-1 text-lg font-semibold text-sky-200">
                        ${Math.round(tradeValue.deckSwapValue)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                        Extra Value
                      </div>
                      <div className="mt-1 text-sm text-zinc-300">
                        Fee ${tradeValue.fee.toFixed(2)} · Ship ${tradeValue.shipping.toFixed(2)} · Ins ${tradeValue.insurance.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                      {formatSupportsCommanderRules(deck.format)
                        ? deck.bracket.label
                        : getDeckFormatLabel(deck.format)}
                    </span>
                    {formatSupportsCommanderRules(deck.format) && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                        {deck.bracket.gameChangerCount} Game Changer
                        {deck.bracket.gameChangerCount === 1 ? '' : 's'}
                      </span>
                    )}
                    {getDeckMarketingChips(deck).map((chip) => (
                      <span
                        key={`${deck.id}-${chip}`}
                        className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200"
                      >
                        {chip}
                      </span>
                    ))}
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                      Owned by You
                    </span>
                    {Number(deck.buy_now_price_usd ?? 0) > 0 && (
                      <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
                        Buy It Now {formatCurrencyAmount(
                          Number(deck.buy_now_price_usd),
                          normalizeSupportedCurrency(deck.buy_now_currency)
                        )}
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex gap-3">
                    <Link
                      href={`/decks/${deck.id}`}
                      className="flex-1 rounded-2xl bg-emerald-400 px-4 py-3 text-center text-sm font-medium text-zinc-950 hover:opacity-90"
                    >
                      View Deck
                    </Link>

                    <Link
                      href={`/my-decks/${deck.id}`}
                      className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-medium text-white hover:bg-white/10"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
                    </>
                  )
                })()}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
