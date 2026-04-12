import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import { getAdminAccessForUser } from '@/lib/admin/access'
import AppHeader from '@/components/app-header'
import { formatCurrencyAmount, normalizeSupportedCurrency } from '@/lib/currency'
import { formatSupportsCommanderRules, getDeckFormatLabel, normalizeDeckFormat } from '@/lib/decks/formats'
import {
  getInventoryStatusDescription,
  getInventoryStatusVisibility,
  isInventoryStatusCompleted,
  getInventoryStatusBadgeClass,
  getInventoryStatusLabel,
  isInventoryStatusLocked,
  isInventoryStatusPublic,
} from '@/lib/decks/inventory-status'
import { getDeckMarketingChips } from '@/lib/decks/marketing'
import { calculateDeckTradeValue } from '@/lib/decks/trade-value'
import FormActionButton from '@/components/form-action-button'
import { createClient } from '@/lib/supabase/server'
import { getUnreadNotificationsCount } from '@/lib/notifications'
import { isUnreadTradeOffer, type TradeOfferRow } from '@/lib/trade-offers'
import { refreshCommanderFitsAction } from './actions'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
const DECKS_PER_PAGE = 9

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

type CommanderFitSummaryRow = {
  matched_commander_name?: string | null
  normalized_commander_name?: string | null
  card_quantity?: number | null
  match_status?: string | null
}

function parseSectionPage(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value
  const parsed = Number(candidate)
  return Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : 1
}

function paginateDecks<T>(items: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / DECKS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * DECKS_PER_PAGE

  return {
    page: currentPage,
    totalPages,
    items: items.slice(startIndex, startIndex + DECKS_PER_PAGE),
    startIndex,
  }
}

export default async function MyDecksPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = searchParams ? await searchParams : {}
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
    .select('id, name, commander, format, price_total_usd_foil, buy_now_price_usd, buy_now_currency, inventory_status, image_url, is_sleeved, is_boxed, is_sealed, is_complete_precon, is_listed_for_trade, box_type')
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
  const showCommanderFitsRefreshed = params.commanderFitsRefreshed === '1'
  const refreshedFitRows = Number(params.fitRows ?? 0)
  const refreshedFitMatched = Number(params.fitMatched ?? 0)
  const refreshedFitNoMatch = Number(params.fitNoMatch ?? 0)
  const refreshedFitErrors = Number(params.fitErrors ?? 0)

  const { data: deckCards } = deckIds.length
    ? await supabase
        .from('deck_cards')
        .select('deck_id, section, quantity, card_name, cmc, mana_cost')
        .in('deck_id', deckIds)
    : { data: [] as DeckCardForBracket[] }

  const { data: commanderFitSummaryRows } = await supabase
    .from('deck_card_commander_matches')
    .select('matched_commander_name, normalized_commander_name, card_quantity, match_status')
    .eq('user_id', user.id)

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
  const liveDecks = deckViews.filter((deck) => isInventoryStatusPublic(deck.inventory_status))
  const privateDecks = deckViews.filter((deck) => getInventoryStatusVisibility(deck.inventory_status) === 'private')
  const completedDecks = deckViews.filter((deck) => isInventoryStatusCompleted(deck.inventory_status))
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
  const commanderFitSummary = Array.from(
    (((commanderFitSummaryRows ?? []) as CommanderFitSummaryRow[])
      .filter((row) => row.match_status === 'matched' && row.matched_commander_name)
      .reduce((map, row) => {
        const key = String(
          row.normalized_commander_name ?? row.matched_commander_name ?? ''
        )
        const existing = map.get(key) ?? {
          commanderName: String(row.matched_commander_name ?? ''),
          totalQuantity: 0,
          matchedRows: 0,
        }
        existing.totalQuantity += Math.max(1, Number(row.card_quantity ?? 1))
        existing.matchedRows += 1
        map.set(key, existing)
        return map
      }, new Map<string, { commanderName: string; totalQuantity: number; matchedRows: number }>())).values()
  )
    .sort((left, right) => right.totalQuantity - left.totalQuantity || right.matchedRows - left.matchedRows)
    .slice(0, 6)
  const livePagination = paginateDecks(liveDecks, parseSectionPage(params.livePage))
  const privatePagination = paginateDecks(privateDecks, parseSectionPage(params.privatePage))
  const completedPagination = paginateDecks(completedDecks, parseSectionPage(params.completedPage))

  function sectionHref(sectionKey: 'livePage' | 'privatePage' | 'completedPage', page: number) {
    const nextParams = new URLSearchParams()
    const nextEntries: Array<[string, string | string[] | undefined]> = Object.entries(params)

    for (const [key, value] of nextEntries) {
      if (key === sectionKey || value == null) continue
      if (Array.isArray(value)) {
        if (value[0]) nextParams.set(key, value[0])
        continue
      }
      nextParams.set(key, value)
    }

    nextParams.set(sectionKey, String(page))
    return `/my-decks?${nextParams.toString()}`
  }

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
          {showCommanderFitsRefreshed && (
            <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              Commander fits refreshed for {refreshedFitRows} card rows. Matched {refreshedFitMatched}, no match for {refreshedFitNoMatch}, errors on {refreshedFitErrors}.
            </div>
          )}

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

            <form action={refreshCommanderFitsAction} className="w-full max-w-sm">
              <input type="hidden" name="return_to" value="/my-decks" />
              <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
                <div className="text-sm font-medium text-white">EDHREC Commander Fits</div>
                <p className="mt-2 text-sm text-sky-100/80">
                  Cache the most popular commander home for each owned card across your catalog.
                </p>
                <FormActionButton
                  pendingLabel="Refreshing commander fits..."
                  className="mt-4 w-full rounded-xl bg-sky-300 px-4 py-3 text-sm font-medium text-zinc-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Refresh Catalog Fits
                </FormActionButton>
              </div>
            </form>

          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
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
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-400">
                Blended value means the current saved card rows rolled into one deck total using the available pricing on each row.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Deck Swap Value</div>
              <div className="mt-2 text-3xl font-semibold text-sky-200">
                ${Math.round(totalDeckSwapValue)}
              </div>
              <div className="mt-2 text-xs text-zinc-500">Value after Deck Swap fee, shipping, and insurance.</div>
              <div className="mt-3 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-sky-200/80">
                  Extra vs Buylist
                </div>
                <div className="mt-1 text-sm font-medium text-white">
                  ${Math.round(totalExtraVsBuylist)}
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-400">
                Extra vs Buylist shows the rough gap between Deck Swap net value and a conservative store-style buylist outcome.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Buylist Estimate</div>
              <div className="mt-2 text-3xl font-semibold text-amber-200">
                ${Math.round(totalBuylistValue)}
              </div>
              <div className="mt-2 text-xs text-zinc-500">Conservative store-style trade-in estimate.</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Live Right Now</div>
              <div className="mt-2 text-3xl font-semibold text-white">{liveDecks.length}</div>
              <div className="mt-2 text-xs text-zinc-500">Decks currently visible in the marketplace and available to move.</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2 xl:col-span-3 2xl:col-span-5">
              <div className="text-sm text-zinc-400">Inventory Visibility</div>
              <div className="mt-2 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <div className="text-xs uppercase tracking-wide text-emerald-200">Live</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{liveDecks.length}</div>
                  <p className="mt-2 text-xs text-emerald-50/80">Public marketplace listings that buyers and traders can discover right now.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-400">Private</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{privateDecks.length}</div>
                  <p className="mt-2 text-xs text-zinc-400">Staged, escrow, donation, and operational states stay out of the public marketplace.</p>
                </div>
                <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
                  <div className="text-xs uppercase tracking-wide text-sky-200">Completed</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{completedDecks.length}</div>
                  <p className="mt-2 text-xs text-sky-50/80">Closed-out deck moves like sold, checked out, delivered, or completed escrow.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2 xl:col-span-3 2xl:col-span-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-sm text-zinc-400">Browsing Model</div>
                  <div className="mt-2 text-xl font-semibold text-white">Decks now paginate after {DECKS_PER_PAGE} cards per section</div>
                  <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                    Live, private, and completed sections each use explicit pages now instead of growing forever, so larger collections stay easier to scan.
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  Average bracket {averageBracket}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2 xl:col-span-3 2xl:col-span-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-sm text-zinc-400">Top Commander Fits In Your Catalog</div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    Where your owned cards most naturally want to go
                  </div>
                  <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                    This groups the saved per-card EDHREC matches by commander so you can spot the most common build destinations in your current inventory.
                  </p>
                </div>
                <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
                  {commanderFitSummary.length > 0
                    ? `${commanderFitSummary.length} leaders surfaced`
                    : 'Run the refresh once to populate this'}
                </div>
              </div>

              {commanderFitSummary.length > 0 ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {commanderFitSummary.map((fit) => (
                    <div
                      key={fit.commanderName}
                      className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4"
                    >
                      <div className="text-lg font-semibold text-white">{fit.commanderName}</div>
                      <div className="mt-2 text-sm text-zinc-400">
                        {fit.totalQuantity} owned card copies across {fit.matchedRows} matched rows
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-zinc-950/60 px-5 py-4 text-sm text-zinc-400">
                  No commander-fit cache yet. Refresh your catalog to import EDHREC card recommendations.
                </div>
              )}
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
          <div className="space-y-10">
            {[
              {
                title: 'Live Inventory',
                description: 'Public decks currently available for discovery.',
                decks: livePagination.items,
                totalDecks: liveDecks.length,
                page: livePagination.page,
                totalPages: livePagination.totalPages,
                pageKey: 'livePage' as const,
              },
              {
                title: 'Private Inventory',
                description: 'Hidden decks in staging, escrow, donation, or internal operational states.',
                decks: privatePagination.items,
                totalDecks: privateDecks.length,
                page: privatePagination.page,
                totalPages: privatePagination.totalPages,
                pageKey: 'privatePage' as const,
              },
              {
                title: 'Completed Deck Moves',
                description: 'Closed-out deck movements that are no longer active inventory.',
                decks: completedPagination.items,
                totalDecks: completedDecks.length,
                page: completedPagination.page,
                totalPages: completedPagination.totalPages,
                pageKey: 'completedPage' as const,
              },
            ].map((section) =>
              section.decks.length > 0 ? (
                <div key={section.title}>
                  <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                    <h2 className="text-2xl font-semibold">{section.title}</h2>
                    <p className="mt-1 text-sm text-zinc-400">{section.description}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                      Page {section.page} of {section.totalPages} • {section.totalDecks} deck{section.totalDecks === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {section.decks.map((deck) => (
                      <article
                        key={deck.id}
                        className={`group overflow-hidden rounded-3xl border bg-zinc-900/80 transition duration-200 ${
                          isInventoryStatusLocked(deck.inventory_status)
                            ? 'border-zinc-700/80 opacity-70'
                            : 'border-white/10 hover:border-emerald-400/30 hover:bg-zinc-900'
                        }`}
                      >
                {(() => {
                  const tradeValue = calculateDeckTradeValue(Number(deck.price_total_usd_foil ?? 0))

                  return (
                    <>
                <Link href={`/my-decks/${deck.id}?tab=settings`} className="block">
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
                    <div
                      className={`absolute right-4 top-4 rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur ${getInventoryStatusBadgeClass(deck.inventory_status)}`}
                    >
                      {getInventoryStatusLabel(deck.inventory_status)}
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
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${getInventoryStatusBadgeClass(deck.inventory_status)}`}
                    >
                      {getInventoryStatusLabel(deck.inventory_status)}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                      {getInventoryStatusVisibility(deck.inventory_status)}
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

                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-zinc-400">
                    {getInventoryStatusDescription(deck.inventory_status)}
                  </div>

                  <div className="mt-5 flex gap-3">
                    <Link
                      href={`/my-decks/${deck.id}?tab=settings`}
                      className="flex-1 rounded-2xl bg-emerald-400 px-4 py-3 text-center text-sm font-medium text-zinc-950 hover:opacity-90"
                    >
                      Market This Deck
                    </Link>

                    <Link
                      href={`/my-decks/${deck.id}`}
                      className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-medium text-white hover:bg-white/10"
                    >
                      Deck Details
                    </Link>
                  </div>

                  <div className="mt-3">
                    <Link
                      href={`/decks/${deck.id}`}
                      className="text-xs text-zinc-400 underline-offset-4 hover:text-white hover:underline"
                    >
                      Public preview
                    </Link>
                  </div>
                </div>
                    </>
                  )
                })()}
                    </article>
                    ))}
                  </div>

                  {section.totalPages > 1 && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      {section.page > 1 && (
                        <Link
                          href={sectionHref(section.pageKey, section.page - 1)}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10"
                        >
                          {'<-'} Previous page
                        </Link>
                      )}
                      {section.page < section.totalPages && (
                        <Link
                          href={sectionHref(section.pageKey, section.page + 1)}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10"
                        >
                          Next page {'->'}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ) : null
            )}
          </div>
        )}
      </section>
    </main>
  )
}
