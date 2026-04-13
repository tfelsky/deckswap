'use client'

import Link from 'next/link'
import { useDeferredValue, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { formatCurrencyAmount } from '@/lib/currency'
import { buildSinglesQuote, formatSingleCondition, type PublicSingleListing } from '@/lib/singles/marketplace'
import { type SinglesCartItem } from '@/lib/singles/pricing'

const SINGLES_CART_STORAGE_KEY = 'deckswap_singles_cart_v1'
const SINGLES_GRID_COLUMNS_STORAGE_KEY = 'deckswap_singles_grid_columns_v1'
const SINGLES_CART_PANEL_STORAGE_KEY = 'deckswap_singles_cart_panel_v1'

type SinglesMarketplaceProps = {
  listings: PublicSingleListing[]
  isSignedIn: boolean
}

type FinishFilter = 'all' | 'foil' | 'nonfoil'
type SortOption = 'price_desc' | 'price_asc' | 'name_asc' | 'name_desc'
type PageSizeOption = 6 | 50 | 100 | 150
type CardsPerRowOption = 2 | 3 | 4 | 5
type ColorFilter =
  | 'all'
  | 'w'
  | 'u'
  | 'b'
  | 'r'
  | 'g'
  | 'colorless'
  | 'multicolor'

const CARDS_PER_ROW_CLASSES: Record<CardsPerRowOption, string> = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
  5: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-5',
}

function readStoredCart() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SINGLES_CART_STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readStoredGridColumns() {
  try {
    const parsed = Number(window.localStorage.getItem(SINGLES_GRID_COLUMNS_STORAGE_KEY) ?? '5')
    return parsed >= 2 && parsed <= 5 ? (parsed as CardsPerRowOption) : 5
  } catch {
    return 5
  }
}

function readStoredCartPanelCollapsed() {
  try {
    return window.localStorage.getItem(SINGLES_CART_PANEL_STORAGE_KEY) === 'collapsed'
  } catch {
    return false
  }
}

function normalizeCart(items: SinglesCartItem[]) {
  const grouped = new Map<number, number>()

  for (const item of items) {
    const listingId = Number(item.singleInventoryItemId)
    const quantity = Math.max(0, Math.floor(Number(item.quantity)))
    if (!Number.isFinite(listingId) || quantity <= 0) continue
    grouped.set(listingId, (grouped.get(listingId) ?? 0) + quantity)
  }

  return Array.from(grouped.entries()).map(([singleInventoryItemId, quantity]) => ({
    singleInventoryItemId,
    quantity,
  }))
}

function nextDiscountTarget(subtotal: number) {
  if (subtotal >= 200) return null
  if (subtotal >= 100) {
    return { label: '25% off at $200', amountNeeded: Number((200 - subtotal).toFixed(2)) }
  }

  return { label: '20% off at $100', amountNeeded: Number((100 - subtotal).toFixed(2)) }
}

export function SinglesMarketplace({ listings, isSignedIn }: SinglesMarketplaceProps) {
  const [cartItems, setCartItems] = useState<SinglesCartItem[]>([])
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null)
  const [cartSheetOpen, setCartSheetOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [finishFilter, setFinishFilter] = useState<FinishFilter>('all')
  const [setFilter, setSetFilter] = useState('all')
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('price_desc')
  const [pageSize, setPageSize] = useState<PageSizeOption>(6)
  const [cardsPerRow, setCardsPerRow] = useState<CardsPerRowOption>(5)
  const [cartPanelCollapsed, setCartPanelCollapsed] = useState(false)
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    setCartItems(normalizeCart(readStoredCart()))
    setCardsPerRow(readStoredGridColumns())
    setCartPanelCollapsed(readStoredCartPanelCollapsed())
  }, [])

  useEffect(() => {
    window.localStorage.setItem(SINGLES_CART_STORAGE_KEY, JSON.stringify(cartItems))
  }, [cartItems])

  useEffect(() => {
    window.localStorage.setItem(SINGLES_GRID_COLUMNS_STORAGE_KEY, String(cardsPerRow))
  }, [cardsPerRow])

  useEffect(() => {
    window.localStorage.setItem(
      SINGLES_CART_PANEL_STORAGE_KEY,
      cartPanelCollapsed ? 'collapsed' : 'expanded'
    )
  }, [cartPanelCollapsed])

  const listingMap = new Map(listings.map((listing) => [listing.id, listing]))
  const setOptions = Array.from(
    new Set(listings.map((listing) => listing.set_name).filter(Boolean))
  ).sort((a, b) => String(a).localeCompare(String(b)))

  const filteredListings = listings
    .filter((listing) => {
      const matchesSearch =
        !deferredSearch.trim() ||
        [
          listing.card_name,
          listing.set_name,
          listing.set_code,
          listing.collector_number,
          listing.type_line,
          listing.oracle_text,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(deferredSearch.trim().toLowerCase())

      if (!matchesSearch) return false
      if (finishFilter === 'foil' && !listing.foil) return false
      if (finishFilter === 'nonfoil' && listing.foil) return false
      if (setFilter !== 'all' && listing.set_name !== setFilter) return false
      if (colorFilter !== 'all') {
        const colorIdentity = Array.isArray(listing.color_identity)
          ? listing.color_identity.map((color) => String(color).toLowerCase())
          : []

        if (colorFilter === 'colorless' && colorIdentity.length > 0) return false
        if (colorFilter === 'multicolor' && colorIdentity.length < 2) return false
        if (
          ['w', 'u', 'b', 'r', 'g'].includes(colorFilter) &&
          !colorIdentity.includes(colorFilter)
        ) {
          return false
        }
      }

      return true
    })
    .sort((left, right) => {
      if (sortOption === 'price_desc') {
        return Number(right.marketplace_price_usd ?? 0) - Number(left.marketplace_price_usd ?? 0)
      }

      if (sortOption === 'price_asc') {
        return Number(left.marketplace_price_usd ?? 0) - Number(right.marketplace_price_usd ?? 0)
      }

      if (sortOption === 'name_asc') {
        return left.card_name.localeCompare(right.card_name)
      }

      return right.card_name.localeCompare(left.card_name)
    })

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, finishFilter, setFilter, colorFilter, sortOption, pageSize])

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const pageEnd = pageStart + pageSize
  const visibleListings = filteredListings.slice(pageStart, pageEnd)

  const selectedListing =
    selectedListingId != null ? listingMap.get(selectedListingId) ?? null : null
  const quote = buildSinglesQuote({ cartItems, listings })
  const totalItems = quote.items.reduce((sum, item) => sum + item.quantity, 0)
  const thresholdHint = nextDiscountTarget(quote.pricing.subtotal)
  const hasDesktopCart = quote.items.length > 0
  const desktopCartWidthClass = hasDesktopCart
    ? cartPanelCollapsed
      ? 'lg:pr-[7.5rem]'
      : 'lg:pr-[26rem]'
    : ''

  function setListingQuantity(listing: PublicSingleListing, nextQuantity: number) {
    const quantity = Math.max(
      0,
      Math.min(Math.floor(nextQuantity), Number(listing.marketplace_quantity_available ?? 0))
    )

    setCartItems((current) => {
      const withoutListing = current.filter((item) => item.singleInventoryItemId !== listing.id)
      if (quantity <= 0) return withoutListing

      if (current.length > 0) {
        const existingSeller = listingMap.get(current[0].singleInventoryItemId)?.user_id
        if (existingSeller && existingSeller !== listing.user_id) {
          return [{ singleInventoryItemId: listing.id, quantity }]
        }
      }

      return normalizeCart([...withoutListing, { singleInventoryItemId: listing.id, quantity }])
    })

    if (quantity > 0) {
      setCartSheetOpen(true)
    }
  }

  function getListingQuantity(listingId: number) {
    return cartItems.find((item) => item.singleInventoryItemId === listingId)?.quantity ?? 0
  }

  return (
    <>
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900/95">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300">
                    Singles Marketplace
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-300">
                    {listings.length} live listings
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                      Browse cards, price fast, checkout cleanly.
                    </h1>
                    <p className="mt-1 text-sm text-zinc-400 sm:text-base">
                      Canada shipping: $5 PWE up to 10 cards at $30 or less, then automatic $15
                      tracked mailer.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                      20% off at $100
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                      25% off at $200
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_12rem_12rem_12rem_12rem_10rem]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search cards, sets, oracle text..."
              className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/40"
            />
            <select
              value={finishFilter}
              onChange={(event) => setFinishFilter(event.target.value as FinishFilter)}
              className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/40"
            >
              <option value="all">All finishes</option>
              <option value="foil">Foil</option>
              <option value="nonfoil">Non-foil</option>
            </select>
            <select
              value={setFilter}
              onChange={(event) => setSetFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/40"
            >
              <option value="all">All sets</option>
              {setOptions.map((setName) => (
                <option key={setName} value={setName ?? ''}>
                  {setName}
                </option>
              ))}
            </select>
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as SortOption)}
              className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/40"
            >
              <option value="price_desc">Price: high to low</option>
              <option value="price_asc">Price: low to high</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
            </select>
            <select
              value={colorFilter}
              onChange={(event) => setColorFilter(event.target.value as ColorFilter)}
              className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/40"
            >
              <option value="all">All colors</option>
              <option value="w">White</option>
              <option value="u">Blue</option>
              <option value="b">Black</option>
              <option value="r">Red</option>
              <option value="g">Green</option>
              <option value="multicolor">Multicolor</option>
              <option value="colorless">Colorless</option>
            </select>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value) as PageSizeOption)}
              className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/40"
            >
              <option value={6}>6 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
              <option value={150}>150 / page</option>
            </select>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-medium text-white">Cards per row</div>
                <div className="mt-1 text-sm text-zinc-400">
                  Increase the grid density without changing pagination.
                </div>
              </div>
              <div className="flex min-w-[16rem] items-center gap-3">
                <span className="text-xs text-zinc-500">2</span>
                <input
                  type="range"
                  min={2}
                  max={5}
                  step={1}
                  value={cardsPerRow}
                  onChange={(event) => setCardsPerRow(Number(event.target.value) as CardsPerRowOption)}
                  className="h-2 w-full cursor-pointer accent-emerald-400"
                  aria-label="Cards per row"
                />
                <span className="text-xs text-zinc-500">5</span>
                <div className="min-w-14 rounded-2xl border border-white/10 bg-zinc-950 px-3 py-2 text-center text-sm font-medium text-white">
                  {cardsPerRow}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`mx-auto max-w-7xl px-6 py-10 ${desktopCartWidthClass}`}>
        {filteredListings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center text-zinc-300">
            No singles match that filter set yet.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-white">
                  Showing {pageStart + 1}-{Math.min(pageEnd, filteredListings.length)} of {filteredListings.length} listings
                </div>
                <div className="mt-1 text-sm text-zinc-400">
                  Search and filters apply before pagination so it is easy to browse large public inventory drops.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-zinc-300">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>

            <div className={`grid gap-6 ${CARDS_PER_ROW_CLASSES[cardsPerRow]}`}>
              {visibleListings.map((listing) => {
                const quantityInCart = getListingQuantity(listing.id)
                const availableQuantity = Number(listing.marketplace_quantity_available ?? 0)
                const priceLabel = formatCurrencyAmount(Number(listing.marketplace_price_usd ?? 0), 'USD')

                return (
                  <article
                    key={listing.id}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/80 shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedListingId(listing.id)}
                      className="block w-full text-left"
                    >
                      <div
                        className={`relative aspect-[4/5] overflow-hidden border-b border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 ${
                          listing.foil ? 'foil-card-shell' : ''
                        }`}
                      >
                        {listing.image_url ? (
                          <img
                            src={listing.image_url}
                            alt={listing.card_name}
                            className="h-full w-full object-cover object-top transition duration-300 hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                            No image
                          </div>
                        )}
                        <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                          {listing.foil ? 'Foil' : 'Non-foil'}
                        </div>
                        <div className="absolute right-4 top-4 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200 backdrop-blur">
                          Qty {availableQuantity}
                        </div>
                      </div>
                    </button>

                    <div className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-xl font-semibold text-white">{listing.card_name}</h2>
                          <p className="mt-1 truncate text-sm text-zinc-400">
                            {listing.set_name || 'Unknown set'}
                            {listing.collector_number ? ` #${listing.collector_number}` : ''}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-right">
                          <div className="text-[10px] uppercase tracking-wide text-emerald-300/80">Price</div>
                          <div className="text-lg font-semibold text-emerald-300">{priceLabel}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          {formatSingleCondition(listing.condition)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          {String(listing.language ?? 'en').toUpperCase()}
                        </span>
                        {listing.set_code ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                            {String(listing.set_code).toUpperCase()}
                          </span>
                        ) : null}
                      </div>

                      {quantityInCart > 0 ? (
                        <div className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setListingQuantity(listing, quantityInCart - 1)}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xl text-white transition hover:bg-white/10"
                          >
                            -
                          </button>
                          <div className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-center">
                            <div className="text-lg font-semibold text-white">{quantityInCart}</div>
                            <div className="text-xs text-zinc-500">in cart</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setListingQuantity(listing, quantityInCart + 1)}
                            disabled={quantityInCart >= availableQuantity}
                            className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xl text-emerald-100 transition hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setListingQuantity(listing, 1)}
                          className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-medium text-zinc-950 transition hover:opacity-90"
                        >
                          Add to cart
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {hasDesktopCart ? (
        <aside
          className={`fixed right-0 top-16 hidden h-[calc(100vh-4rem)] border-l border-white/10 bg-zinc-950/95 backdrop-blur lg:flex lg:flex-col ${
            cartPanelCollapsed ? 'w-[5.5rem] p-3' : 'w-[24rem] p-5'
          }`}
        >
          {cartPanelCollapsed ? (
            <div className="flex h-full flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => setCartPanelCollapsed(false)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-2 py-3 text-center text-xs font-medium text-white transition hover:bg-white/10"
                aria-label="Expand singles cart"
              >
                Open cart
              </button>
              <div className="w-full rounded-2xl border border-white/10 bg-white/5 px-2 py-3 text-center">
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Items</div>
                <div className="mt-2 text-2xl font-semibold text-white">{totalItems}</div>
              </div>
              <div className="w-full rounded-2xl border border-white/10 bg-white/5 px-2 py-3 text-center">
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Total</div>
                <div className="mt-2 text-sm font-semibold text-emerald-300">
                  {formatCurrencyAmount(quote.pricing.grandTotal, 'USD')}
                </div>
              </div>
              <div className="mt-auto w-full">
                <Button
                  variant="ghost"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-2 py-3 text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
                  onClick={() => setCartItems([])}
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Singles cart</div>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {totalItems} item{totalItems === 1 ? '' : 's'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCartPanelCollapsed(true)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/10"
                  >
                    Slim
                  </button>
                  <button
                    type="button"
                    onClick={() => setCartItems([])}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/10"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
                {quote.items.map((item) => {
                  const listing = listingMap.get(item.listingId)
                  if (!listing) return null

                  return (
                    <div key={item.listingId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-16 w-12 overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.cardName} className="h-full w-full object-cover object-top" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-white">{item.cardName}</div>
                          <div className="mt-1 text-xs text-zinc-400">
                            {item.setName || 'Unknown set'}
                            {item.collectorNumber ? ` #${item.collectorNumber}` : ''}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {[item.foil ? 'Foil' : 'Non-foil', formatSingleCondition(item.condition)].join(' · ')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-emerald-300">
                            {formatCurrencyAmount(item.lineSubtotalUsd, 'USD')}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {formatCurrencyAmount(item.unitPriceUsd, 'USD')} each
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setListingQuantity(listing, item.quantity - 1)}
                          className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white transition hover:bg-white/10"
                        >
                          -
                        </button>
                        <div className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-center text-sm text-white">
                          {item.quantity}
                        </div>
                        <button
                          type="button"
                          onClick={() => setListingQuantity(listing, item.quantity + 1)}
                          disabled={item.quantity >= item.availableQuantity}
                          className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-emerald-100 transition hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="space-y-3 text-sm text-zinc-300">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrencyAmount(quote.pricing.subtotal, 'USD')}</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-200">
                    <span>{quote.pricing.tierLabel}</span>
                    <span>-{formatCurrencyAmount(quote.pricing.discountAmount, 'USD')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{quote.pricing.shippingLabel}</span>
                    <span>{formatCurrencyAmount(quote.pricing.shippingAmount, 'USD')}</span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-zinc-400">
                    {quote.pricing.shippingDescription}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tax</span>
                    <span>{formatCurrencyAmount(quote.pricing.taxAmount, 'USD')}</span>
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between text-base font-semibold text-white">
                      <span>Grand total</span>
                      <span>{formatCurrencyAmount(quote.pricing.grandTotal, 'USD')}</span>
                    </div>
                  </div>
                </div>

                {thresholdHint ? (
                  <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                    Add {formatCurrencyAmount(thresholdHint.amountNeeded, 'USD')} more to unlock{' '}
                    {thresholdHint.label}.
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                    Your cart is already in the top volume tier.
                  </div>
                )}

                <div className="mt-4">
                  <Button asChild className="w-full rounded-2xl bg-emerald-400 text-zinc-950 hover:bg-emerald-300">
                    <Link href={isSignedIn ? '/singles/checkout' : '/sign-in?next=/singles/checkout'}>
                      {isSignedIn ? 'Checkout singles' : 'Sign in to checkout'}
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </aside>
      ) : null}

      {quote.items.length > 0 ? (
        <button
          type="button"
          onClick={() => setCartSheetOpen(true)}
          className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-2xl bg-emerald-400 px-5 py-4 text-left text-zinc-950 shadow-[0_20px_40px_rgba(0,0,0,0.25)] lg:hidden"
        >
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-700">Singles cart</div>
            <div className="text-lg font-semibold">
              {totalItems} item{totalItems === 1 ? '' : 's'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">
              {formatCurrencyAmount(quote.pricing.grandTotal, 'USD')}
            </div>
            <div className="text-xs text-zinc-700">View cart</div>
          </div>
        </button>
      ) : null}

      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-[2rem] border-white/10 bg-zinc-950 p-0 text-white lg:hidden">
          <SheetHeader className="border-b border-white/10 px-6 py-5">
            <SheetTitle className="text-white">Singles cart</SheetTitle>
            <SheetDescription className="text-zinc-400">
              {totalItems} item{totalItems === 1 ? '' : 's'} ready for checkout.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-6 py-5">
            {quote.items.map((item) => {
              const listing = listingMap.get(item.listingId)
              if (!listing) return null

              return (
                <div key={item.listingId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">{item.cardName}</div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {item.setName || 'Unknown set'}
                        {item.collectorNumber ? ` #${item.collectorNumber}` : ''}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-emerald-300">
                      {formatCurrencyAmount(item.lineSubtotalUsd, 'USD')}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setListingQuantity(listing, item.quantity - 1)}
                      className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
                    >
                      -
                    </button>
                    <div className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-center text-sm text-white">
                      {item.quantity}
                    </div>
                    <button
                      type="button"
                      onClick={() => setListingQuantity(listing, item.quantity + 1)}
                      disabled={item.quantity >= item.availableQuantity}
                      className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-emerald-100 disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="space-y-3 text-sm text-zinc-300">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrencyAmount(quote.pricing.subtotal, 'USD')}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-200">
                  <span>{quote.pricing.tierLabel}</span>
                  <span>-{formatCurrencyAmount(quote.pricing.discountAmount, 'USD')}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold text-white">
                  <span>Grand total</span>
                  <span>{formatCurrencyAmount(quote.pricing.grandTotal, 'USD')}</span>
                </div>
                <div className="text-xs text-zinc-500">
                  {quote.pricing.shippingLabel}: {quote.pricing.shippingDescription}
                </div>
              </div>
              <div className="mt-4">
                <Button asChild className="w-full rounded-2xl bg-emerald-400 text-zinc-950 hover:bg-emerald-300">
                  <Link href={isSignedIn ? '/singles/checkout' : '/sign-in?next=/singles/checkout'}>
                    {isSignedIn ? 'Checkout singles' : 'Sign in to checkout'}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={selectedListing != null}
        onOpenChange={(open) => setSelectedListingId(open ? selectedListingId : null)}
      >
        <DialogContent className="max-w-4xl border-white/10 bg-zinc-950 p-0 text-white sm:max-w-4xl">
          {selectedListing ? (
            <div className="grid gap-0 md:grid-cols-[22rem_minmax(0,1fr)]">
              <div
                className={`border-b border-white/10 bg-zinc-900 md:border-b-0 md:border-r ${
                  selectedListing.foil ? 'foil-card-shell' : ''
                }`}
              >
                {selectedListing.image_url ? (
                  <img src={selectedListing.image_url} alt={selectedListing.card_name} className="h-full w-full object-cover object-top" />
                ) : (
                  <div className="flex h-full min-h-72 items-center justify-center text-zinc-500">No image</div>
                )}
              </div>
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-white">{selectedListing.card_name}</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    {selectedListing.set_name || 'Unknown set'}
                    {selectedListing.collector_number ? ` #${selectedListing.collector_number}` : ''}
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-6 flex flex-wrap gap-2 text-xs text-zinc-300">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    {selectedListing.foil ? 'Foil' : 'Non-foil'}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    {formatSingleCondition(selectedListing.condition)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    Qty {Number(selectedListing.marketplace_quantity_available ?? 0)}
                  </span>
                </div>

                {selectedListing.type_line ? (
                  <div className="mt-6 text-sm text-zinc-300">{selectedListing.type_line}</div>
                ) : null}

                {selectedListing.oracle_text ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-zinc-300">
                    {selectedListing.oracle_text}
                  </div>
                ) : null}

                {selectedListing.marketplace_notes ? (
                  <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                    {selectedListing.marketplace_notes}
                  </div>
                ) : null}

                <div className="mt-6 flex items-end justify-between gap-4 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-emerald-300/80">Unit price</div>
                    <div className="mt-1 text-3xl font-semibold text-emerald-300">
                      {formatCurrencyAmount(Number(selectedListing.marketplace_price_usd ?? 0), 'USD')}
                    </div>
                  </div>
                  <div className="w-full max-w-44">
                    {getListingQuantity(selectedListing.id) > 0 ? (
                      <div className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setListingQuantity(selectedListing, getListingQuantity(selectedListing.id) - 1)}
                          className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-xl text-white"
                        >
                          -
                        </button>
                        <div className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-center text-white">
                          {getListingQuantity(selectedListing.id)}
                        </div>
                        <button
                          type="button"
                          onClick={() => setListingQuantity(selectedListing, getListingQuantity(selectedListing.id) + 1)}
                          disabled={getListingQuantity(selectedListing.id) >= Number(selectedListing.marketplace_quantity_available ?? 0)}
                          className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xl text-emerald-100 disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setListingQuantity(selectedListing, 1)}
                        className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
                      >
                        Add to cart
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
