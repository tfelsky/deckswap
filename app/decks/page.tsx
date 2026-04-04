import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import AppHeader from '@/components/app-header'
import { formatSupportsCommanderRules, getDeckFormatLabel, normalizeDeckFormat } from '@/lib/decks/formats'
import { getDeckMarketingChips } from '@/lib/decks/marketing'
import { getUnreadNotificationsCount } from '@/lib/notifications'
import { createClient } from '@/lib/supabase/server'
import { isUnreadTradeOffer, type TradeOfferRow } from '@/lib/trade-offers'
import { Info } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type Deck = {
  id: number
  name: string
  commander?: string | null
  format?: string | null
  price_total_usd_foil?: number | null
  buy_now_price_usd?: number | null
  image_url?: string | null
  commander_count?: number | null
  mainboard_count?: number | null
  token_count?: number | null
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

export default async function DecksPage() {
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
    ? ((tradeOffersData ?? []) as TradeOfferRow[]).filter((offer) =>
        isUnreadTradeOffer(offer, user.id)
      ).length
    : 0
  const unreadNotifications = user ? await getUnreadNotificationsCount(supabase, user.id) : 0

  const { data, error } = await supabase
    .from('decks')
    .select(
      'id, name, commander, format, price_total_usd_foil, buy_now_price_usd, image_url, commander_count, mainboard_count, token_count, is_sleeved, is_boxed, is_sealed, is_complete_precon, is_listed_for_trade, box_type'
    )
    .order('id', { ascending: true })

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <h1 className="text-red-500">Error: {error.message}</h1>
      </main>
    )
  }

  const decks = (data ?? []) as Deck[]
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
    const format = normalizeDeckFormat(deck.format)
    return { ...deck, bracket, format }
  })

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
  const topValueDeck = [...deckViews].sort(
    (a, b) => Number(b.price_total_usd_foil ?? 0) - Number(a.price_total_usd_foil ?? 0)
  )[0]
  const mostCardsDeck = [...deckViews].sort(
    (a, b) =>
      Number((b.commander_count ?? 0) + (b.mainboard_count ?? 0) + (b.token_count ?? 0)) -
      Number((a.commander_count ?? 0) + (a.mainboard_count ?? 0) + (a.token_count ?? 0))
  )[0]
  const mostGameChangersDeck = [...ratedDecks].sort(
    (a, b) => b.bracket.gameChangerCount - a.bracket.gameChangerCount
  )[0]
  const highestBracketDeck = [...ratedDecks].sort(
    (a, b) => (b.bracket.bracket ?? 0) - (a.bracket.bracket ?? 0)
  )[0]
  const bracketCounts = new Map<number, number>()

  for (const deck of ratedDecks) {
    const bracket = deck.bracket.bracket as number
    bracketCounts.set(bracket, (bracketCounts.get(bracket) ?? 0) + 1)
  }

  const dominantBracketEntry =
    [...bracketCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null
  const tokenReadyDecks = deckViews.filter((deck) => Number(deck.token_count ?? 0) > 0).length

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
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                Deck Marketplace
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Browse decks across formats
              </h1>

              <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
                Discover deck inventory across Commander, Standard, Pauper, Canadian Highlander, Legacy, Modern, and Premodern with blended pricing and format-aware details.
              </p>
            </div>

          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Live Decks</div>
              <div className="mt-2 text-3xl font-semibold">{deckViews.length}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                Avg. Bracket
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <button type="button" className="text-zinc-500 hover:text-white">
                      <Info className="h-4 w-4" />
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent className="border-white/10 bg-zinc-900 text-zinc-100">
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-white">Commander bracket help</p>
                      <p>
                        Brackets are a pregame matching signal for Commander decks. Lower brackets
                        tend to be more casual, while higher brackets reflect stronger optimization
                        and more powerful card signals.
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
              <div className="mt-2 text-3xl font-semibold">{averageBracket}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Top Value</div>
              <div className="mt-2 text-3xl font-semibold">
                $
                {Math.max(
                  0,
                  ...deckViews.map((deck) => Number(deck.price_total_usd_foil ?? 0))
                ).toFixed(2)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Token Ready</div>
              <div className="mt-2 text-3xl font-semibold text-emerald-300">
                {tokenReadyDecks}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
            <div className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/15 via-emerald-400/5 to-transparent p-6">
              <div className="text-sm uppercase tracking-[0.2em] text-emerald-300/80">
                Marketplace Snapshot
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Decks are trending around Bracket {dominantBracketEntry?.[0] ?? 2}
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-zinc-300">
                {dominantBracketEntry
                  ? `${dominantBracketEntry[1]} current listings sit in the most common bracket. Use bracket labels, Game Changer counts, and blended pricing to find pods that feel right faster.`
                  : 'Import a few more decks to build out bracket and pricing insight across the marketplace.'}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
              <div className="text-sm text-zinc-400">Highest Bracket Listing</div>
              <div className="mt-3 text-xl font-semibold text-white">
                {highestBracketDeck?.name || 'N/A'}
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                {highestBracketDeck?.bracket.label || 'No bracket data yet'}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
              <div className="text-sm text-zinc-400">Most Game Changers</div>
              <div className="mt-3 text-xl font-semibold text-white">
                {mostGameChangersDeck?.name || 'N/A'}
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                {mostGameChangersDeck
                  ? `${mostGameChangersDeck.bracket.gameChangerCount} Game Changers`
                  : 'No Game Changer data yet'}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
              <div className="text-sm text-zinc-400">How to scan this page</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Bracket Fit</div>
                  <p className="mt-2 text-sm text-zinc-300">
                    Use the bracket badge first to narrow to the table speed you want.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Price Signal</div>
                  <p className="mt-2 text-sm text-zinc-300">
                    Value is blended from foil flags, so it tracks deck cost more honestly.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Table Setup</div>
                  <p className="mt-2 text-sm text-zinc-300">
                    Card and token counts help spot decks that are ready to sleeve and play.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
              <div className="text-sm text-emerald-200">Bring your own list</div>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Import from text, file, or Moxfield
              </h2>
              <p className="mt-3 text-sm text-emerald-50/80">
                Paste a list, upload a `.txt` or Archidekt export, or point the app at a public Moxfield deck.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/import-deck"
                  className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:opacity-90"
                >
                  Import Deck
                </Link>
                <Link
                  href="/create-deck"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Start manual listing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Available Decks</h2>
            <p className="mt-1 text-sm text-zinc-400">
                Marketplace grid with format-aware labels, Commander bracket signals where available, and blended value.
              </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Top Value Deck</div>
              <div className="mt-1 text-sm font-medium text-white">
                {topValueDeck?.name || 'N/A'}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Most Common Bracket</div>
              <div className="mt-1 text-sm font-medium text-white">
                {dominantBracketEntry ? `Bracket ${dominantBracketEntry[0]}` : 'N/A'}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Bracket Coverage</div>
              <div className="mt-1 text-sm font-medium text-white">
                {ratedDecks.length}/{deckViews.length} rated
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Largest List</div>
              <div className="mt-1 text-sm font-medium text-white">
                {mostCardsDeck
                  ? `${(mostCardsDeck.commander_count ?? 0) + (mostCardsDeck.mainboard_count ?? 0) + (mostCardsDeck.token_count ?? 0)} cards`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {deckViews.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <h3 className="text-xl font-semibold">No decks yet</h3>
            <p className="mt-2 text-zinc-400">
              Your connection works. Now seed the table with more decks and metadata.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {deckViews.map((deck) => (
              <Link key={deck.id} href={`/decks/${deck.id}`}>
                <article className="group cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/80 transition duration-200 hover:border-emerald-400/30 hover:bg-zinc-900">
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
                        Value
                        </div>
                        <div className="text-lg font-semibold text-emerald-300">
                          ${Number(deck.price_total_usd_foil ?? 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {Number(deck.buy_now_price_usd ?? 0) > 0 && (
                      <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
                        <div className="text-[10px] uppercase tracking-wide text-amber-200/80">
                          Buy It Now
                        </div>
                        <div className="mt-1 text-lg font-semibold text-amber-200">
                          ${Number(deck.buy_now_price_usd).toFixed(2)}
                        </div>
                        <div className="mt-1 text-xs text-amber-50/70">
                          Direct-sale fallback after Deck Swap
                        </div>
                      </div>
                    )}

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
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                        {(deck.commander_count ?? 0) + (deck.mainboard_count ?? 0)} cards
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                        {Number(deck.token_count ?? 0)} token
                        {Number(deck.token_count ?? 0) === 1 ? '' : 's'}
                      </span>
                      {getDeckMarketingChips(deck).map((chip) => (
                        <span
                          key={`${deck.id}-${chip}`}
                          className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200"
                        >
                          {chip}
                        </span>
                      ))}
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
