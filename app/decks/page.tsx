import type { Metadata } from 'next'
import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  ALL_COLOR_FILTERS,
  colorIdentityCode,
  getColorIdentityLabel,
} from '@/lib/decks/color-identity'
import { formatCurrencyAmount, normalizeSupportedCurrency } from '@/lib/currency'
import {
  isInventoryStatusCompleted,
  getInventoryStatusBadgeClass,
  getInventoryStatusLabel,
  isInventoryStatusLocked,
  isInventoryStatusPublic,
} from '@/lib/decks/inventory-status'
import AppHeader from '@/components/app-header'
import {
  SUPPORTED_DECK_FORMATS,
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
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Browse Decks | Mythiverse Exchange',
  description:
    'Browse complete Magic deck listings with pricing, format details, Commander bracket signals, and marketplace-ready inventory on Mythiverse Exchange.',
  alternates: {
    canonical: '/decks',
  },
}

type Deck = {
  id: number
  name: string
  commander?: string | null
  format?: string | null
  imported_at?: string | null
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
  is_listed_for_trade?: boolean | null
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

type DeckSearchScope = 'any' | 'deck' | 'card'
type DeckSortOption =
  | 'newest'
  | 'value_desc'
  | 'value_asc'
  | 'bracket_desc'
  | 'cards_desc'
  | 'name_asc'
type ListingTypeFilter = 'any' | 'trade' | 'buy_now' | 'auction'
type TokenFilter = 'any' | 'with_tokens' | 'without_tokens'
type GameChangerFilter = 'any' | 'with_game_changers' | 'without_game_changers'

type DeckView = Deck & {
  bracket: ReturnType<typeof getCommanderBracketSummary>
  format: ReturnType<typeof normalizeDeckFormat>
}

const SEARCH_SCOPE_OPTIONS: Array<{ value: DeckSearchScope; label: string }> = [
  { value: 'any', label: 'Decks and cards' },
  { value: 'deck', label: 'Deck names and commanders' },
  { value: 'card', label: 'Cards inside decks' },
]

const SORT_OPTIONS: Array<{ value: DeckSortOption; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'value_desc', label: 'Highest value' },
  { value: 'value_asc', label: 'Lowest value' },
  { value: 'bracket_desc', label: 'Highest bracket' },
  { value: 'cards_desc', label: 'Largest list' },
  { value: 'name_asc', label: 'Alphabetical' },
]

const LISTING_TYPE_OPTIONS: Array<{ value: ListingTypeFilter; label: string }> = [
  { value: 'any', label: 'Any listing type' },
  { value: 'trade', label: 'Deck swap live' },
  { value: 'buy_now', label: 'Buy it now' },
  { value: 'auction', label: 'Auction' },
]

const TOKEN_FILTER_OPTIONS: Array<{ value: TokenFilter; label: string }> = [
  { value: 'any', label: 'Any token state' },
  { value: 'with_tokens', label: 'Has tokens' },
  { value: 'without_tokens', label: 'No tokens' },
]

const GAME_CHANGER_FILTER_OPTIONS: Array<{ value: GameChangerFilter; label: string }> = [
  { value: 'any', label: 'Any Game Changer count' },
  { value: 'with_game_changers', label: 'Includes Game Changers' },
  { value: 'without_game_changers', label: 'No Game Changers' },
]

const PUBLIC_INVENTORY_FILTERS = [
  'deck_swap_live',
  'buy_it_now_live',
  'auction_live',
  'auction_pending',
] as const

function readSearchParam(
  value: string | string[] | undefined,
  fallback = ''
) {
  if (Array.isArray(value)) return value[0] ?? fallback
  return value ?? fallback
}

function readNumericSearchParam(value: string | string[] | undefined) {
  const raw = readSearchParam(value).trim()
  if (!raw) return null

  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function readBooleanSearchParam(value: string | string[] | undefined) {
  const raw = readSearchParam(value).trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}

function readDeckSearchScope(value: string | string[] | undefined): DeckSearchScope {
  const raw = readSearchParam(value, 'any')
  return SEARCH_SCOPE_OPTIONS.some((option) => option.value === raw)
    ? (raw as DeckSearchScope)
    : 'any'
}

function readDeckSortOption(value: string | string[] | undefined): DeckSortOption {
  const raw = readSearchParam(value, 'newest')
  return SORT_OPTIONS.some((option) => option.value === raw)
    ? (raw as DeckSortOption)
    : 'newest'
}

function readListingType(value: string | string[] | undefined): ListingTypeFilter {
  const raw = readSearchParam(value, 'any')
  return LISTING_TYPE_OPTIONS.some((option) => option.value === raw)
    ? (raw as ListingTypeFilter)
    : 'any'
}

function readTokenFilter(value: string | string[] | undefined): TokenFilter {
  const raw = readSearchParam(value, 'any')
  return TOKEN_FILTER_OPTIONS.some((option) => option.value === raw)
    ? (raw as TokenFilter)
    : 'any'
}

function readGameChangerFilter(value: string | string[] | undefined): GameChangerFilter {
  const raw = readSearchParam(value, 'any')
  return GAME_CHANGER_FILTER_OPTIONS.some((option) => option.value === raw)
    ? (raw as GameChangerFilter)
    : 'any'
}

function normalizeSearchTerms(query: string) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)
}

function matchesSearchText(haystackParts: Array<string | null | undefined>, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  const haystack = haystackParts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (!haystack) return false
  if (haystack.includes(normalizedQuery)) return true

  return normalizeSearchTerms(normalizedQuery).every((term) => haystack.includes(term))
}

function matchesDeckSearch(
  deck: DeckView,
  cards: DeckCardForBracket[],
  query: string,
  scope: DeckSearchScope
) {
  if (!query.trim()) return true

  const matchDeck = matchesSearchText(
    [
      deck.name,
      deck.commander,
      getDeckFormatLabel(deck.format),
      getColorIdentityLabel(deck.color_identity),
      deck.box_type,
    ],
    query
  )

  const matchCard = matchesSearchText(
    cards.flatMap((card) => [card.card_name, card.section]),
    query
  )

  if (scope === 'deck') return matchDeck
  if (scope === 'card') return matchCard
  return matchDeck || matchCard
}

function sortDeckViews(deckViews: DeckView[], sort: DeckSortOption) {
  return [...deckViews].sort((a, b) => {
    switch (sort) {
      case 'value_desc':
        return Number(b.price_total_usd_foil ?? 0) - Number(a.price_total_usd_foil ?? 0)
      case 'value_asc':
        return Number(a.price_total_usd_foil ?? 0) - Number(b.price_total_usd_foil ?? 0)
      case 'bracket_desc':
        return (b.bracket.bracket ?? 0) - (a.bracket.bracket ?? 0)
      case 'cards_desc':
        return (
          Number((b.commander_count ?? 0) + (b.mainboard_count ?? 0) + (b.token_count ?? 0)) -
          Number((a.commander_count ?? 0) + (a.mainboard_count ?? 0) + (a.token_count ?? 0))
        )
      case 'name_asc':
        return a.name.localeCompare(b.name)
      case 'newest':
      default:
        return (
          new Date(b.imported_at ?? 0).getTime() - new Date(a.imported_at ?? 0).getTime()
        )
    }
  })
}

export default async function DecksPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const supabase = await createClient()
  const query = readSearchParam(resolvedSearchParams.q).trim()
  const searchScope = readDeckSearchScope(resolvedSearchParams.scope)
  const selectedFormat = normalizeDeckFormat(readSearchParam(resolvedSearchParams.format))
  const selectedListingType = readListingType(resolvedSearchParams.listing)
  const selectedInventoryStatus = readSearchParam(resolvedSearchParams.inventory, 'any')
  const selectedColorIdentity = readSearchParam(resolvedSearchParams.color).trim().toUpperCase()
  const minPrice = readNumericSearchParam(resolvedSearchParams.minPrice)
  const maxPrice = readNumericSearchParam(resolvedSearchParams.maxPrice)
  const selectedBracket = readNumericSearchParam(resolvedSearchParams.bracket)
  const tokenFilter = readTokenFilter(resolvedSearchParams.tokens)
  const gameChangerFilter = readGameChangerFilter(resolvedSearchParams.gameChangers)
  const requireSleeved = readBooleanSearchParam(resolvedSearchParams.sleeved)
  const requireBoxed = readBooleanSearchParam(resolvedSearchParams.boxed)
  const requireSealed = readBooleanSearchParam(resolvedSearchParams.sealed)
  const requireCompletePrecon = readBooleanSearchParam(resolvedSearchParams.completePrecon)
  const sortOption = readDeckSortOption(resolvedSearchParams.sort)
  const advancedFiltersOpen =
    selectedFormat !== 'unknown' ||
    selectedListingType !== 'any' ||
    selectedInventoryStatus !== 'any' ||
    !!selectedColorIdentity ||
    minPrice != null ||
    maxPrice != null ||
    selectedBracket != null ||
    tokenFilter !== 'any' ||
    gameChangerFilter !== 'any' ||
    requireSleeved ||
    requireBoxed ||
    requireSealed ||
    requireCompletePrecon ||
    sortOption !== 'newest'
  const hasActiveSearch = !!query || searchScope !== 'any' || advancedFiltersOpen

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

  async function passDeckAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/sign-in')

    const deckId = Number(formData.get('deck_id'))
    if (!Number.isFinite(deckId)) redirect('/decks')

    await supabase
      .from('user_deck_watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('deck_id', deckId)

    await supabase.from('user_deck_passes').upsert(
      {
        user_id: user.id,
        deck_id: deckId,
      },
      { onConflict: 'user_id,deck_id' }
    )

    redirect('/decks')
  }

  async function watchDeckAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/sign-in')

    const deckId = Number(formData.get('deck_id'))
    if (!Number.isFinite(deckId)) redirect('/decks')

    await supabase
      .from('user_deck_passes')
      .delete()
      .eq('user_id', user.id)
      .eq('deck_id', deckId)

    await supabase.from('user_deck_watchlist').upsert(
      {
        user_id: user.id,
        deck_id: deckId,
      },
      { onConflict: 'user_id,deck_id' }
    )

    redirect('/decks')
  }

  async function restorePassedDeckAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/sign-in')

    const deckId = Number(formData.get('deck_id'))
    if (!Number.isFinite(deckId)) redirect('/decks')

    await supabase
      .from('user_deck_passes')
      .delete()
      .eq('user_id', user.id)
      .eq('deck_id', deckId)

    redirect('/decks')
  }

  async function restoreWatchedDeckAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/sign-in')

    const deckId = Number(formData.get('deck_id'))
    if (!Number.isFinite(deckId)) redirect('/decks')

    await supabase
      .from('user_deck_watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('deck_id', deckId)

    redirect('/decks')
  }

  const { data, error } = await supabase
    .from('decks')
    .select(
      'id, name, commander, format, imported_at, price_total_usd_foil, buy_now_price_usd, buy_now_currency, inventory_status, image_url, commander_count, mainboard_count, token_count, is_sleeved, is_boxed, is_sealed, is_complete_precon, is_listed_for_trade, box_type, color_identity'
    )
    .order('imported_at', { ascending: false })

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <h1 className="text-red-500">Error: {error.message}</h1>
      </main>
    )
  }

  const allDecks = (data ?? []) as Deck[]
  const decks = allDecks.filter((deck) => isInventoryStatusPublic(deck.inventory_status))
  const passedDecksResult = user
    ? await supabase
        .from('user_deck_passes')
        .select('id, user_id, deck_id, created_at, reason')
        .eq('user_id', user.id)
    : { data: [] as UserDeckPassRow[], error: null }
  const watchedDecksResult = user
    ? await supabase
        .from('user_deck_watchlist')
        .select('id, user_id, deck_id, created_at, note')
        .eq('user_id', user.id)
    : { data: [] as UserDeckWatchlistRow[], error: null }
  const passesSchemaMissing = isUserDeckPassesSchemaMissing(passedDecksResult.error?.message)
  const watchlistSchemaMissing = isUserDeckWatchlistSchemaMissing(watchedDecksResult.error?.message)
  const passedDeckRows = passesSchemaMissing ? [] : ((passedDecksResult.data ?? []) as UserDeckPassRow[])
  const watchedDeckRows = watchlistSchemaMissing
    ? []
    : ((watchedDecksResult.data ?? []) as UserDeckWatchlistRow[])
  const passedDeckIds = new Set(passedDeckRows.map((row) => row.deck_id))
  const watchedDeckIds = new Set(watchedDeckRows.map((row) => row.deck_id))
  const completedDeckCount = allDecks.filter((deck) => isInventoryStatusCompleted(deck.inventory_status)).length
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
  const matchesMarketplaceFilters = (deck: DeckView) => {
    const deckCardsForSearch = cardsByDeck.get(deck.id) ?? []
    const normalizedInventoryStatus = String(deck.inventory_status ?? '')
    const deckValue = Number(deck.price_total_usd_foil ?? 0)
    const tokenCount = Number(deck.token_count ?? 0)
    const deckColorCode = colorIdentityCode(deck.color_identity)
    const bracketValue = deck.bracket.bracket

    if (!matchesDeckSearch(deck, deckCardsForSearch, query, searchScope)) return false
    if (selectedFormat !== 'unknown' && deck.format !== selectedFormat) return false
    if (
      selectedInventoryStatus !== 'any' &&
      normalizedInventoryStatus !== selectedInventoryStatus
    ) {
      return false
    }
    if (
      selectedListingType === 'trade' &&
      normalizedInventoryStatus !== 'deck_swap_live'
    ) {
      return false
    }
    if (
      selectedListingType === 'buy_now' &&
      normalizedInventoryStatus !== 'buy_it_now_live'
    ) {
      return false
    }
    if (
      selectedListingType === 'auction' &&
      normalizedInventoryStatus !== 'auction_live' &&
      normalizedInventoryStatus !== 'auction_pending'
    ) {
      return false
    }
    if (selectedColorIdentity && deckColorCode !== selectedColorIdentity) return false
    if (minPrice != null && deckValue < minPrice) return false
    if (maxPrice != null && deckValue > maxPrice) return false
    if (
      selectedBracket != null &&
      (bracketValue == null || bracketValue !== selectedBracket)
    ) {
      return false
    }
    if (tokenFilter === 'with_tokens' && tokenCount <= 0) return false
    if (tokenFilter === 'without_tokens' && tokenCount > 0) return false
    if (
      gameChangerFilter === 'with_game_changers' &&
      deck.bracket.gameChangerCount <= 0
    ) {
      return false
    }
    if (
      gameChangerFilter === 'without_game_changers' &&
      deck.bracket.gameChangerCount > 0
    ) {
      return false
    }
    if (requireSleeved && !deck.is_sleeved) return false
    if (requireBoxed && !deck.is_boxed) return false
    if (requireSealed && !deck.is_sealed) return false
    if (requireCompletePrecon && !deck.is_complete_precon) return false

    return true
  }
  const availableDeckViews = sortDeckViews(
    user
      ? deckViews.filter(
          (deck) =>
            !passedDeckIds.has(deck.id) &&
            !watchedDeckIds.has(deck.id) &&
            matchesMarketplaceFilters(deck)
        )
      : deckViews.filter(matchesMarketplaceFilters),
    sortOption
  )
  const watchedDeckViews = sortDeckViews(
    user
      ? deckViews.filter(
          (deck) =>
            watchedDeckIds.has(deck.id) &&
            !passedDeckIds.has(deck.id) &&
            (!hasActiveSearch || matchesMarketplaceFilters(deck))
        )
      : [],
    sortOption
  )
  const passedDeckViews = sortDeckViews(
    user
      ? deckViews.filter(
          (deck) => passedDeckIds.has(deck.id) && (!hasActiveSearch || matchesMarketplaceFilters(deck))
        )
      : [],
    sortOption
  )

  const ratedDecks = availableDeckViews.filter(
    (deck) => formatSupportsCommanderRules(deck.format) && deck.bracket.bracket != null
  )
  const topValueDeck = [...availableDeckViews].sort(
    (a, b) => Number(b.price_total_usd_foil ?? 0) - Number(a.price_total_usd_foil ?? 0)
  )[0]
  const bracketCounts = new Map<number, number>()

  for (const deck of ratedDecks) {
    const bracket = deck.bracket.bracket as number
    bracketCounts.set(bracket, (bracketCounts.get(bracket) ?? 0) + 1)
  }

  const dominantBracketEntry =
    [...bracketCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null

  return (
    <main className="min-h-screen bg-zinc-950 pt-24 text-white">
      <AppHeader
        current="decks"
        isSignedIn={!!user}
        isAdmin={isAdmin}
        unreadTradeOffers={unreadTradeOffers}
        unreadNotifications={unreadNotifications}
      />
      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/55 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                Deck Marketplace
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Browse live decks
              </h1>

              <p className="mt-3 text-sm text-zinc-400 sm:text-base">
                Search by deck or card, narrow the list with lightweight filters, and jump straight into live listings.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
                <span className="text-zinc-500">Live</span>{' '}
                <span className="font-semibold text-white">{availableDeckViews.length}</span>
              </div>
              <Link
                href="/completed-sales"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10"
              >
                Completed Sales
              </Link>
              <Link
                href="/import-deck"
                className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
              >
                Import Deck
              </Link>
            </div>
          </div>
          <form method="get" className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search decks or cards"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500"
              />

              <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-center">
                <label className="block">
                  <span className="sr-only">Search scope</span>
                  <select
                    name="scope"
                    defaultValue={searchScope}
                    className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-sm text-white xl:w-44"
                  >
                    {SEARCH_SCOPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="sr-only">Sort</span>
                  <select
                    name="sort"
                    defaultValue={sortOption}
                    className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-sm text-white xl:w-44"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:opacity-90">
                  Search
                </button>

                <Link
                  href="/decks"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm text-white hover:bg-white/10"
                >
                  Reset
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <details
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5"
                open={advancedFiltersOpen}
              >
                <summary className="cursor-pointer list-none text-sm font-medium text-zinc-200">
                  Advanced filters
                </summary>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-500">Format</span>
                    <select
                      name="format"
                      defaultValue={selectedFormat}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-sm text-white"
                    >
                      <option value="unknown">Any format</option>
                      {SUPPORTED_DECK_FORMATS.filter((format) => format !== 'unknown').map((format) => (
                        <option key={format} value={format}>
                          {getDeckFormatLabel(format)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-500">Listing</span>
                    <select
                      name="listing"
                      defaultValue={selectedListingType}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-sm text-white"
                    >
                      {LISTING_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-500">Status</span>
                    <select
                      name="inventory"
                      defaultValue={selectedInventoryStatus}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-sm text-white"
                    >
                      <option value="any">Any public status</option>
                      {PUBLIC_INVENTORY_FILTERS.map((status) => (
                        <option key={status} value={status}>
                          {getInventoryStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-500">Color</span>
                    <select
                      name="color"
                      defaultValue={selectedColorIdentity}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-sm text-white"
                    >
                      <option value="">Any color identity</option>
                      {ALL_COLOR_FILTERS.map((filter) => (
                        <option key={filter.code} value={filter.code}>
                          {filter.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-500">Min value</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      name="minPrice"
                      defaultValue={minPrice ?? ''}
                      placeholder="0"
                      className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-500">Max value</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      name="maxPrice"
                      defaultValue={maxPrice ?? ''}
                      placeholder="500"
                      className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-500">Bracket</span>
                    <select
                      name="bracket"
                      defaultValue={selectedBracket ?? ''}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-sm text-white"
                    >
                      <option value="">Any bracket</option>
                      {[1, 2, 3, 4, 5].map((bracket) => (
                        <option key={bracket} value={bracket}>
                          Bracket {bracket}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-500">Tokens</span>
                    <select
                      name="tokens"
                      defaultValue={tokenFilter}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-sm text-white"
                    >
                      {TOKEN_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-500">Game Changers</span>
                    <select
                      name="gameChangers"
                      defaultValue={gameChangerFilter}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-sm text-white"
                    >
                      {GAME_CHANGER_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-zinc-200">
                    <input type="checkbox" name="sleeved" value="1" defaultChecked={requireSleeved} />
                    Sleeved only
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-zinc-200">
                    <input type="checkbox" name="boxed" value="1" defaultChecked={requireBoxed} />
                    Boxed only
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-zinc-200">
                    <input type="checkbox" name="sealed" value="1" defaultChecked={requireSealed} />
                    Sealed only
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      name="completePrecon"
                      value="1"
                      defaultChecked={requireCompletePrecon}
                    />
                    Complete precons
                  </label>
                </div>
              </details>

              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300">
                {availableDeckViews.length} match{availableDeckViews.length === 1 ? '' : 'es'}
                {user && watchedDeckViews.length > 0 ? ` | ${watchedDeckViews.length} watched` : ''}
                {user && passedDeckViews.length > 0 ? ` | ${passedDeckViews.length} rejected` : ''}
              </div>
            </div>
          </form>

          {hasActiveSearch ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {query ? (
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                  {query}
                </span>
              ) : null}
              {searchScope !== 'any' ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                  {SEARCH_SCOPE_OPTIONS.find((option) => option.value === searchScope)?.label}
                </span>
              ) : null}
              {selectedFormat !== 'unknown' ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                  {getDeckFormatLabel(selectedFormat)}
                </span>
              ) : null}
              {selectedListingType !== 'any' ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                  {LISTING_TYPE_OPTIONS.find((option) => option.value === selectedListingType)?.label}
                </span>
              ) : null}
              {selectedInventoryStatus !== 'any' ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                  {getInventoryStatusLabel(selectedInventoryStatus)}
                </span>
              ) : null}
              {selectedColorIdentity ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                  {getColorIdentityLabel(selectedColorIdentity === 'C' ? [] : selectedColorIdentity.split(''))}
                </span>
              ) : null}
              {selectedBracket != null ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                  Bracket {selectedBracket}
                </span>
              ) : null}
              {minPrice != null ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                  Min ${minPrice}
                </span>
              ) : null}
              {maxPrice != null ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                  Max ${maxPrice}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {topValueDeck ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                Top value: <span className="font-medium text-white">{topValueDeck.name}</span>
              </div>
            ) : null}
            {dominantBracketEntry ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                Common bracket: <span className="font-medium text-white">Bracket {dominantBracketEntry[0]}</span>
              </div>
            ) : null}
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
              Rated decks: <span className="font-medium text-white">{ratedDecks.length}/{availableDeckViews.length}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-4">
        {availableDeckViews.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <h3 className="text-xl font-semibold">
              {hasActiveSearch ? 'No decks match this search yet' : 'No available decks right now'}
            </h3>
            <p className="mt-2 text-zinc-400">
              {hasActiveSearch
                ? 'Try a broader search term, switch from card search to deck search, or clear a few advanced filters.'
                : user && passedDeckViews.length > 0
                ? 'Everything currently visible has been moved into your watchlist or rejected list. You can restore any of them below.'
                : 'Your connection works. Now seed the table with more decks and metadata.'}
            </p>
            {hasActiveSearch ? (
              <div className="mt-5">
                <Link
                  href="/decks"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10"
                >
                  Clear search
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {availableDeckViews.map((deck) => (
              <article
                key={deck.id}
                className={`group overflow-hidden rounded-3xl border bg-zinc-900/80 transition duration-200 ${
                  isInventoryStatusLocked(deck.inventory_status)
                    ? 'border-zinc-700/80 opacity-80'
                    : 'border-white/10 hover:border-emerald-400/30 hover:bg-zinc-900'
                }`}
              >
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
                    <div
                      className={`absolute right-4 top-4 rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur ${getInventoryStatusBadgeClass(deck.inventory_status)}`}
                    >
                      {getInventoryStatusLabel(deck.inventory_status)}
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
                          {formatCurrencyAmount(
                            Number(deck.buy_now_price_usd),
                            normalizeSupportedCurrency(deck.buy_now_currency)
                          )}
                        </div>
                        <div className="mt-1 text-xs text-amber-50/70">
                          Direct-sale fallback after Deck Swap
                        </div>
                      </div>
                    )}

                    {isInventoryStatusLocked(deck.inventory_status) && (
                      <div className="mt-4 rounded-2xl border border-zinc-600/40 bg-zinc-800/70 px-4 py-3 text-xs text-zinc-300">
                        This deck is currently committed to another flow and is not positioned like an active live listing.
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
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${getInventoryStatusBadgeClass(deck.inventory_status)}`}
                      >
                        {getInventoryStatusLabel(deck.inventory_status)}
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
                </Link>

                {user && (!passesSchemaMissing || !watchlistSchemaMissing) ? (
                  <div className="border-t border-white/10 px-5 py-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {!watchlistSchemaMissing ? (
                        <form action={watchDeckAction}>
                          <input type="hidden" name="deck_id" value={deck.id} />
                          <button className="w-full rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-100 transition hover:bg-amber-400/15">
                            Add to watchlist
                          </button>
                        </form>
                      ) : null}
                      {!passesSchemaMissing ? (
                        <form action={passDeckAction}>
                          <input type="hidden" name="deck_id" value={deck.id} />
                          <button className="w-full rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-400/15">
                            Reject
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}

        {user && (passesSchemaMissing || watchlistSchemaMissing) ? (
          <div className="mt-8 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm text-yellow-100">
            {passesSchemaMissing ? (
              <span>Run <code>docs/sql/user-deck-passes.sql</code> to enable rejected decks.</span>
            ) : null}
            {passesSchemaMissing && watchlistSchemaMissing ? <span> </span> : null}
            {watchlistSchemaMissing ? (
              <span>Run <code>docs/sql/user-deck-watchlist.sql</code> to enable the per-user watchlist.</span>
            ) : null}
          </div>
        ) : null}

        {user && watchedDeckViews.length > 0 ? (
          <div className="mt-12">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Watchlist</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {hasActiveSearch
                    ? 'Watched decks that also match the current marketplace search.'
                    : 'Decks you want to keep an eye on without leaving them in the main browsing grid.'}
                </p>
              </div>
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                {watchedDeckViews.length} watched deck{watchedDeckViews.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {watchedDeckViews.map((deck) => (
                <article key={deck.id} className="overflow-hidden rounded-3xl border border-amber-400/20 bg-zinc-900/80">
                  <Link href={`/decks/${deck.id}`} className="block">
                    <div className="relative aspect-[16/10] overflow-hidden border-b border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950">
                      {deck.image_url ? (
                        <img
                          src={deck.image_url}
                          alt={deck.name}
                          className="h-full w-full object-cover object-top opacity-90"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-5">
                        <div className="text-xs uppercase tracking-[0.2em] text-amber-200/80">
                          Watchlist
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {deck.commander || deck.name}
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-semibold tracking-tight text-white">{deck.name}</h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        {formatSupportsCommanderRules(deck.format)
                          ? `Commander: ${deck.commander || 'Not set'}`
                          : `Format: ${getDeckFormatLabel(deck.format)}`}
                      </p>
                    </div>
                  </Link>

                  <div className="grid gap-3 border-t border-white/10 px-5 py-4 sm:grid-cols-2">
                    <form action={restoreWatchedDeckAction}>
                      <input type="hidden" name="deck_id" value={deck.id} />
                      <button className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10">
                        Restore to browsing
                      </button>
                    </form>
                    <form action={passDeckAction}>
                      <input type="hidden" name="deck_id" value={deck.id} />
                      <button className="w-full rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-400/15">
                        Reject
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {user && passedDeckViews.length > 0 ? (
          <div className="mt-12">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Rejected</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {hasActiveSearch
                    ? 'Rejected decks that also match the current marketplace search.'
                    : 'Decks you have rejected and hidden from your available list. Restore them if you want to reconsider later.'}
                </p>
              </div>
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {passedDeckViews.length} rejected deck{passedDeckViews.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {passedDeckViews.map((deck) => (
                <article key={deck.id} className="overflow-hidden rounded-3xl border border-rose-400/20 bg-zinc-900/80">
                  <Link href={`/decks/${deck.id}`} className="block">
                    <div className="relative aspect-[16/10] overflow-hidden border-b border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950">
                      {deck.image_url ? (
                        <img
                          src={deck.image_url}
                          alt={deck.name}
                          className="h-full w-full object-cover object-top opacity-80"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-5">
                        <div className="text-xs uppercase tracking-[0.2em] text-rose-200/80">
                          Rejected
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-white">
                          {deck.commander || deck.name}
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-semibold tracking-tight text-white">{deck.name}</h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        {formatSupportsCommanderRules(deck.format)
                          ? `Commander: ${deck.commander || 'Not set'}`
                          : `Format: ${getDeckFormatLabel(deck.format)}`}
                      </p>
                    </div>
                  </Link>

                  <div className="border-t border-white/10 px-5 py-4">
                    <form action={restorePassedDeckAction}>
                      <input type="hidden" name="deck_id" value={deck.id} />
                      <button className="w-full rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/15">
                        Restore to browsing
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}
