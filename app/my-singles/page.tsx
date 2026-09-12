import AppHeader from '@/components/app-header'
import FormActionButton from '@/components/form-action-button'
import { formatCurrencyAmount, normalizeSupportedCurrency } from '@/lib/currency'
import { getUnreadNotificationsCount } from '@/lib/notifications'
import { createClient } from '@/lib/supabase/server'
import {
  getSingleInventoryStatusBadgeClass,
  getSingleInventoryStatusDescription,
  getSingleInventoryStatusLabel,
} from '@/lib/singles/inventory-status'
import { computeCardValueSignals, getValueSignalBadgeClass } from '@/lib/singles/value-signals'
import { getCommanderStapleDataByOracleId } from '@/lib/singles/value-signals-data'
import Link from 'next/link'
import { backfillSinglesEnrichmentAction, publishAllStagedSinglesAction } from './actions'

export const dynamic = 'force-dynamic'

const PAGE_SIZE_OPTIONS = [50, 100, 150] as const
const CARDS_PER_ROW_OPTIONS = [2, 3, 4, 5] as const

type SingleRow = {
  id: number
  card_name: string
  quantity?: number | null
  foil?: boolean | null
  condition?: string | null
  language?: string | null
  set_code?: string | null
  set_name?: string | null
  collector_number?: string | null
  oracle_id?: string | null
  released_at?: string | null
  rarity?: string | null
  oracle_text?: string | null
  type_line?: string | null
  keywords?: string[] | null
  cmc?: number | null
  finishes?: string[] | null
  inventory_status?: string | null
  image_url?: string | null
  price_usd?: number | null
  price_usd_foil?: number | null
  buy_now_price_usd?: number | null
  buy_now_currency?: string | null
  source_collection_name?: string | null
  source_collection_url?: string | null
  import_warning?: string | null
}

type InventoryFilters = {
  queryText: string
  status: string
  finish: string
  warnings: string
}

const STATUS_FILTER_OPTIONS = ['all', 'staged', 'buy_it_now_live', 'checked_out', 'completed'] as const
const FINISH_FILTER_OPTIONS = ['all', 'foil', 'nonfoil'] as const
const WARNING_FILTER_OPTIONS = ['all', 'only', 'clean'] as const

function isSingleInventorySchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.single_inventory_items'") ||
    message.includes('relation "public.single_inventory_items"')
  )
}

function formatCondition(value?: string | null) {
  switch (String(value ?? '').trim()) {
    case 'light_play':
      return 'LP'
    case 'moderate_play':
      return 'MP'
    case 'heavy_play':
      return 'HP'
    case 'damaged':
      return 'DMG'
    default:
      return 'NM'
  }
}

function parseStringParam(value: string | string[] | undefined, fallback = '') {
  if (Array.isArray(value)) {
    return String(value[0] ?? fallback).trim()
  }

  return String(value ?? fallback).trim()
}

function normalizeFilterValue<T extends readonly string[]>(
  value: string | string[] | undefined,
  allowed: T,
  fallback: T[number]
) {
  const candidate = parseStringParam(value, fallback).toLowerCase()
  return allowed.includes(candidate as T[number]) ? (candidate as T[number]) : fallback
}

function sanitizeSearchTerm(value: string) {
  return value
    .replace(/[^a-z0-9\s#\-']/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

function parsePageParam(value: string | string[] | undefined) {
  const parsed = Number.parseInt(parseStringParam(value, '1'), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function parsePageSize(value: string | string[] | undefined) {
  const parsed = Number.parseInt(parseStringParam(value, '50'), 10)
  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number]) ? parsed : 50
}

function parseCardsPerRow(value: string | string[] | undefined) {
  const parsed = Number.parseInt(parseStringParam(value, '5'), 10)
  return CARDS_PER_ROW_OPTIONS.includes(parsed as (typeof CARDS_PER_ROW_OPTIONS)[number]) ? parsed : 5
}

function buildInventoryUrl(params: {
  page?: number
  pageSize: number
  cardsPerRow: number
  queryText: string
  status: string
  finish: string
  warnings: string
}) {
  const search = new URLSearchParams()

  if (params.page && params.page > 1) {
    search.set('page', String(params.page))
  }

  if (params.pageSize !== 50) {
    search.set('pageSize', String(params.pageSize))
  }

  if (params.cardsPerRow !== 5) {
    search.set('cardsPerRow', String(params.cardsPerRow))
  }

  if (params.queryText) {
    search.set('q', params.queryText)
  }

  if (params.status !== 'all') {
    search.set('status', params.status)
  }

  if (params.finish !== 'all') {
    search.set('finish', params.finish)
  }

  if (params.warnings !== 'all') {
    search.set('warnings', params.warnings)
  }

  const query = search.toString()
  return query ? `/my-singles?${query}` : '/my-singles'
}

function applyInventoryFilters(query: any, userId: string, filters: InventoryFilters) {
  let next = query.eq('user_id', userId)

  if (filters.status !== 'all') {
    next = next.eq('inventory_status', filters.status)
  }

  if (filters.finish === 'foil') {
    next = next.eq('foil', true)
  }

  if (filters.finish === 'nonfoil') {
    next = next.eq('foil', false)
  }

  if (filters.warnings === 'only') {
    next = next.not('import_warning', 'is', null)
  }

  if (filters.warnings === 'clean') {
    next = next.is('import_warning', null)
  }

  if (filters.queryText) {
    const escaped = sanitizeSearchTerm(filters.queryText).replace(/[%_,]/g, ' ')
    next = next.or(
      `card_name.ilike.%${escaped}%,set_name.ilike.%${escaped}%,set_code.ilike.%${escaped}%,collector_number.ilike.%${escaped}%,source_collection_name.ilike.%${escaped}%`
    )
  }

  return next
}

function renderErrorState(message: string) {
  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
        <h1 className="text-2xl font-semibold text-red-300">My Singles Error</h1>
        <p className="mt-3 text-sm text-zinc-200">{message}</p>
      </div>
    </main>
  )
}

export default async function MySinglesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const unreadNotifications = user ? await getUnreadNotificationsCount(supabase, user.id) : 0
  const params = (await searchParams) ?? {}
  const page = parsePageParam(params.page)
  const pageSize = parsePageSize(params.pageSize)
  const cardsPerRow = parseCardsPerRow(params.cardsPerRow)
  const filters: InventoryFilters = {
    queryText: sanitizeSearchTerm(parseStringParam(params.q)),
    status: normalizeFilterValue(params.status, STATUS_FILTER_OPTIONS, 'all'),
    finish: normalizeFilterValue(params.finish, FINISH_FILTER_OPTIONS, 'all'),
    warnings: normalizeFilterValue(params.warnings, WARNING_FILTER_OPTIONS, 'all'),
  }
  const currentUrl = buildInventoryUrl({
    page,
    pageSize,
    cardsPerRow,
    queryText: filters.queryText,
    status: filters.status,
    finish: filters.finish,
    warnings: filters.warnings,
  })

  const cardsPerRowClass =
    cardsPerRow === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : cardsPerRow === 3
        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
        : cardsPerRow === 4
          ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
          : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-5'

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 pt-32 text-white">
        <AppHeader current="my-singles" isSignedIn={false} />
        <section className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-8">
            <h1 className="text-3xl font-semibold">My Singles</h1>
            <p className="mt-3 text-zinc-400">You need to sign in to view your private singles inventory.</p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/sign-in"
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
              >
                Sign in
              </Link>
              <Link
                href="/import-library?scope=singles"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                Back to singles import
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  const { count: totalRows, error: totalRowsError } = await applyInventoryFilters(
    supabase.from('single_inventory_items').select('id', { count: 'exact', head: true }),
    user.id,
    filters
  )

  const schemaMissing = isSingleInventorySchemaMissing(totalRowsError?.message)

  if (totalRowsError && !schemaMissing) {
    return renderErrorState(totalRowsError.message)
  }

  const safeTotalRows = schemaMissing ? 0 : Number(totalRows ?? 0)
  const totalPages = Math.max(1, Math.ceil(safeTotalRows / pageSize))
  const currentPage = Math.min(page, totalPages)
  const rangeStart = (currentPage - 1) * pageSize
  const rangeEnd = rangeStart + pageSize - 1

  const summaryFields =
    'quantity, foil, price_usd, price_usd_foil, import_warning, source_collection_name, source_collection_url, inventory_status'
  const summaryRows: Array<
    Pick<
      SingleRow,
      | 'quantity'
      | 'foil'
      | 'price_usd'
      | 'price_usd_foil'
      | 'import_warning'
      | 'source_collection_name'
      | 'source_collection_url'
      | 'inventory_status'
    >
  > = []

  if (!schemaMissing && safeTotalRows > 0) {
    for (let start = 0; start < safeTotalRows; start += 1000) {
      const end = Math.min(start + 999, safeTotalRows - 1)
      const { data: summaryBatch, error: summaryError } = await applyInventoryFilters(
        supabase.from('single_inventory_items').select(summaryFields),
        user.id,
        filters
      )
        .order('id', { ascending: false })
        .range(start, end)

      if (summaryError) {
        return renderErrorState(summaryError.message)
      }

      summaryRows.push(...((summaryBatch ?? []) as typeof summaryRows))
    }
  }

  const { data, error } = await applyInventoryFilters(
    supabase
      .from('single_inventory_items')
      .select(
        'id, card_name, quantity, foil, condition, language, set_code, set_name, collector_number, oracle_id, released_at, rarity, oracle_text, type_line, keywords, cmc, finishes, inventory_status, image_url, price_usd, price_usd_foil, buy_now_price_usd, buy_now_currency, source_collection_name, source_collection_url, import_warning'
      ),
    user.id,
    filters
  )
    .order('id', { ascending: false })
    .range(rangeStart, rangeEnd)

  if (error && !schemaMissing) {
    return renderErrorState(error.message)
  }

  const rows = schemaMissing ? [] : ((data ?? []) as SingleRow[])
  const commanderStaples = await getCommanderStapleDataByOracleId(
    rows.map((row) => row.oracle_id ?? '').filter(Boolean)
  )
  const totalCopies = summaryRows.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0)
  const totalValue = summaryRows.reduce((sum, row) => {
    const unitValue = row.foil
      ? Number(row.price_usd_foil ?? row.price_usd ?? 0)
      : Number(row.price_usd ?? row.price_usd_foil ?? 0)
    return sum + unitValue * Number(row.quantity ?? 0)
  }, 0)
  const warningCount = summaryRows.filter((row) => row.import_warning).length
  const stagedCount = summaryRows.filter((row) => row.inventory_status === 'staged').length
  const liveCount = summaryRows.filter((row) => row.inventory_status === 'buy_it_now_live').length
  const uniqueSources = new Set(
    summaryRows.map((row) => row.source_collection_name || row.source_collection_url || '')
  ).size
  const showingStart = rows.length > 0 ? rangeStart + 1 : 0
  const showingEnd = rangeStart + rows.length
  const backfillUpdated = Number(parseStringParam(params.backfillUpdated, '0'))
  const backfillUnmatched = Number(parseStringParam(params.backfillUnmatched, '0'))
  const backfillFailed = Number(parseStringParam(params.backfillFailed, '0'))
  const publishCount = Number(parseStringParam(params.publishCount, '0'))
  const publishSkipped = Number(parseStringParam(params.publishSkipped, '0'))
  const actionError = parseStringParam(params.actionError)

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="my-singles" isSignedIn unreadNotifications={unreadNotifications} />

      <section className="border-b border-white/10 bg-zinc-900/50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">My Singles</h1>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300">Private</span>
            </div>
            <Link href="/import-library?scope=singles" className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:opacity-90">Import singles</Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-zinc-400" aria-label="Filtered inventory summary">
            <span><strong className="font-medium text-white">{safeTotalRows}</strong> rows</span>
            <span><strong className="font-medium text-white">{totalCopies}</strong> copies</span>
            <span title="Estimated snapshot value from imported pricing"><strong className="font-medium text-emerald-300">{formatCurrencyAmount(totalValue, 'USD')}</strong> est. value</span>
            <span><strong className="font-medium text-amber-200">{stagedCount}</strong> staged / <strong className="font-medium text-white">{liveCount}</strong> live</span>
          </div>
          <details className="mt-3">
            <summary className="w-fit cursor-pointer rounded text-sm text-zinc-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">Inventory actions</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <form action={backfillSinglesEnrichmentAction} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <input type="hidden" name="return_to" value={currentUrl} />
                <div className="text-sm font-medium text-white">Retry Scryfall backfill</div>
                <p className="mt-2 text-sm text-zinc-400">
                  Re-attempt enrichment for singles that are missing a Scryfall match or still carrying import warnings.
                </p>
                <FormActionButton
                  pendingLabel="Retrying enrichment..."
                  className="mt-4 w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
                >
                  Retry enrichment
                </FormActionButton>
              </form>

              <form action={publishAllStagedSinglesAction} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <input type="hidden" name="return_to" value={currentUrl} />
                <div className="text-sm font-medium text-white">Push staged singles live</div>
                <p className="mt-2 text-sm text-zinc-400">
                  Publish staged rows with a positive price. Buy-now price is used first, then the latest Scryfall snapshot if available.
                </p>
                <FormActionButton
                  pendingLabel="Publishing singles..."
                  className="mt-4 w-full rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-100 hover:bg-amber-400/15"
                >
                  Push all staged to market
                </FormActionButton>
              </form>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <Link href="/singles" className="text-emerald-300 hover:underline">Singles marketplace</Link>
              <Link href="/my-decks" className="text-zinc-300 hover:underline">Back to decks</Link>
              <span className="text-zinc-400">{warningCount} warning{warningCount === 1 ? '' : 's'} across {uniqueSources} source{uniqueSources === 1 ? '' : 's'} in this view.</span>
            </div>
          </details>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        {schemaMissing ? (
          <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-6 text-sm text-yellow-100">
            Run <code>docs/sql/single-inventory.sql</code> to enable private singles inventory before using this surface.
          </div>
        ) : null}

        {!schemaMissing && actionError ? (
          <div className="mb-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">
            {actionError}
          </div>
        ) : null}

        {!schemaMissing && (backfillUpdated > 0 || backfillUnmatched > 0 || backfillFailed > 0) ? (
          <div className="mb-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm text-emerald-100">
            Enrichment retry finished. Updated {backfillUpdated} row{backfillUpdated === 1 ? '' : 's'}, left {backfillUnmatched} unmatched, and hit temporary enrichment errors on {backfillFailed} row{backfillFailed === 1 ? '' : 's'}.
          </div>
        ) : null}

        {!schemaMissing && (publishCount > 0 || publishSkipped > 0) ? (
          <div className="mb-6 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm text-amber-100">
            Published {publishCount} staged row{publishCount === 1 ? '' : 's'} to the singles marketplace. Skipped {publishSkipped} row{publishSkipped === 1 ? '' : 's'} without a positive sell price or usable quantity.
          </div>
        ) : null}

        {!schemaMissing ? (
          <form method="get" className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2">
              <input type="search" name="q" defaultValue={filters.queryText} aria-label="Search inventory" placeholder="Search cards, sets, or sources…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40" />
              <button type="submit" className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:opacity-90">Apply</button>
              {filters.queryText || filters.status !== 'all' || filters.finish !== 'all' || filters.warnings !== 'all' || pageSize !== 50 || cardsPerRow !== 5 ? (
                <Link href="/my-singles" className="rounded-xl px-2 py-2 text-sm text-zinc-300 hover:text-white">Reset</Link>
              ) : null}
            </div>
            <details className="mt-2">
              <summary className="w-fit cursor-pointer rounded py-1 text-sm text-zinc-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">
                Filters & display
                {filters.status !== 'all' || filters.finish !== 'all' || filters.warnings !== 'all' ? (
                  <span className="ml-2 text-emerald-300">{[filters.status !== 'all' ? getSingleInventoryStatusLabel(filters.status) : '', filters.finish === 'foil' ? 'Foil' : filters.finish === 'nonfoil' ? 'Non-foil' : '', filters.warnings === 'only' ? 'Warnings only' : filters.warnings === 'clean' ? 'Clean rows' : ''].filter(Boolean).join(' · ')}</span>
                ) : null}
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-5">
              <select
                aria-label="Status" name="status"
                defaultValue={filters.status}
                className="w-full min-w-0 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/40"
              >
                <option value="all">All statuses</option>
                <option value="staged">Staged</option>
                <option value="buy_it_now_live">Live</option>
                <option value="checked_out">Checked out</option>
                <option value="completed">Completed</option>
              </select>
              <select
                aria-label="Finish" name="finish"
                defaultValue={filters.finish}
                className="w-full min-w-0 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/40"
              >
                <option value="all">All finishes</option>
                <option value="foil">Foil</option>
                <option value="nonfoil">Non-foil</option>
              </select>
              <select
                aria-label="Import warnings" name="warnings"
                defaultValue={filters.warnings}
                className="w-full min-w-0 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/40"
              >
                <option value="all">All warnings</option>
                <option value="only">Warnings only</option>
                <option value="clean">Clean rows only</option>
              </select>
              <select
                aria-label="Cards per page" name="pageSize"
                defaultValue={String(pageSize)}
                className="w-full min-w-0 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/40"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} / page
                  </option>
                ))}
              </select>
                <select name="cardsPerRow" defaultValue={String(cardsPerRow)} aria-label="Cards per row" className="w-full min-w-0 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40">
                  {CARDS_PER_ROW_OPTIONS.map((option) => <option key={option} value={option}>{option} cards / row</option>)}
                </select>
              </div>
            </details>
          </form>
        ) : null}

        {schemaMissing ? null : rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <h3 className="text-xl font-semibold">No singles match this view yet</h3>
            <p className="mt-2 text-zinc-400">
              Adjust the filters above or import another collection source to populate this inventory view.
            </p>
            <Link
              href="/import-library?scope=singles"
              className="mt-6 inline-block rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
            >
              Start singles import
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium text-white">
                  Showing {showingStart}-{showingEnd} of {safeTotalRows} singles rows
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={
                    currentPage > 1
                      ? buildInventoryUrl({
                          page: currentPage - 1,
                          pageSize,
                          cardsPerRow,
                          queryText: filters.queryText,
                          status: filters.status,
                          finish: filters.finish,
                          warnings: filters.warnings,
                        })
                      : currentUrl
                  }
                  className={`rounded-2xl border px-4 py-2 text-sm font-medium ${
                    currentPage > 1
                      ? 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                      : 'pointer-events-none border-white/5 bg-white/[0.03] text-zinc-600'
                  }`}
                >
                  Previous
                </Link>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-zinc-300">
                  Page {currentPage} of {totalPages}
                </div>
                <Link
                  href={
                    currentPage < totalPages
                      ? buildInventoryUrl({
                          page: currentPage + 1,
                          pageSize,
                          cardsPerRow,
                          queryText: filters.queryText,
                          status: filters.status,
                          finish: filters.finish,
                          warnings: filters.warnings,
                        })
                      : currentUrl
                  }
                  className={`rounded-2xl border px-4 py-2 text-sm font-medium ${
                    currentPage < totalPages
                      ? 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                      : 'pointer-events-none border-white/5 bg-white/[0.03] text-zinc-600'
                  }`}
                >
                  Next
                </Link>
              </div>
            </div>

            <div className={`grid gap-6 ${cardsPerRowClass}`}>
            {rows.map((row) => {
              const unitValue = row.foil
                ? Number(row.price_usd_foil ?? row.price_usd ?? 0)
                : Number(row.price_usd ?? row.price_usd_foil ?? 0)
              const totalRowValue = unitValue * Number(row.quantity ?? 0)
              const valueSignals = computeCardValueSignals({
                cardName: row.card_name,
                setCode: row.set_code,
                setName: row.set_name,
                releasedAt: row.released_at,
                rarity: row.rarity,
                foil: row.foil,
                finishes: row.finishes,
                oracleText: row.oracle_text,
                typeLine: row.type_line,
                keywords: row.keywords,
                cmc: row.cmc == null ? null : Number(row.cmc),
                condition: row.condition,
                language: row.language,
                priceUsd: row.price_usd == null ? null : Number(row.price_usd),
                priceUsdFoil: row.price_usd_foil == null ? null : Number(row.price_usd_foil),
                commanderData: row.oracle_id ? commanderStaples.get(row.oracle_id) ?? null : null,
              })

              return (
                <article
                  key={row.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/80 shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
                >
                  <div
                    className={`relative aspect-[4/5] overflow-hidden border-b border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 ${
                      row.foil ? 'foil-card-shell' : ''
                    }`}
                  >
                    {row.image_url ? (
                      <img src={row.image_url} alt={row.card_name} className="h-full w-full object-cover object-top" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-zinc-500">No image</div>
                    )}
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs ${getSingleInventoryStatusBadgeClass(row.inventory_status)}`}>
                        {getSingleInventoryStatusLabel(row.inventory_status)}
                      </span>
                      {row.foil ? (
                        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
                          Foil
                        </span>
                      ) : null}
                    </div>
                    <div className="absolute right-4 top-4 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200 backdrop-blur">
                      Qty {Number(row.quantity ?? 0)}
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-semibold text-white">{row.card_name}</h2>
                        <p className="mt-1 truncate text-sm text-zinc-400">
                          {row.set_name || 'Unknown printing'}
                          {row.collector_number ? ` #${row.collector_number}` : ''}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-right">
                        <div className="text-[10px] uppercase tracking-wide text-emerald-300/80">Row value</div>
                        <div className="text-lg font-semibold text-emerald-300">
                          {formatCurrencyAmount(totalRowValue, 'USD')}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        {formatCondition(row.condition)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        {String(row.language ?? 'en').toUpperCase()}
                      </span>
                      {row.set_code ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          {String(row.set_code).toUpperCase()}
                          {row.collector_number ? ` #${row.collector_number}` : ''}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 text-sm text-zinc-400">
                      {row.source_collection_name ? ` - Imported from ${row.source_collection_name}` : ''}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-zinc-400">
                      {getSingleInventoryStatusDescription(row.inventory_status)}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                        AI value signals
                      </div>
                      {valueSignals.signals.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {valueSignals.signals.map((signal) => (
                            <span
                              key={signal.kind}
                              title={signal.detail}
                              className={`cursor-help rounded-full border px-3 py-1 text-xs ${getValueSignalBadgeClass(signal.strength)}`}
                            >
                              {signal.label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {valueSignals.cons.length > 0 ? (
                        <ul className="mt-3 space-y-1.5">
                          {valueSignals.cons.map((con) => (
                            <li key={con.label} title={con.detail} className="flex cursor-help items-start gap-2 text-xs text-zinc-400">
                              <span className="mt-0.5 shrink-0 text-amber-400/80" aria-hidden>
                                &minus;
                              </span>
                              <span>
                                <span className="font-medium text-amber-200/90">{con.label}.</span>{' '}
                                {con.detail}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    {row.import_warning ? (
                      <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                        {row.import_warning}
                      </div>
                    ) : null}
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-zinc-400">
                      Unit {formatCurrencyAmount(unitValue, 'USD')}
                    </div>

                    {Number(row.buy_now_price_usd ?? 0) > 0 ? (
                      <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-3">
                        <div className="text-[10px] uppercase tracking-wide text-amber-200/80">Buy It Now</div>
                        <div className="mt-1 text-lg font-semibold text-amber-200">
                          {formatCurrencyAmount(
                            Number(row.buy_now_price_usd ?? 0),
                            normalizeSupportedCurrency(row.buy_now_currency)
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-zinc-400">
                        No buy-now price is attached to this row yet.
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {row.source_collection_url ? (
                        <a
                          href={row.source_collection_url}
                          target="_blank"
                        rel="noreferrer"
                        className="text-sm text-emerald-300 hover:text-emerald-200"
                        >
                          Open source record
                        </a>
                      ) : null}
                      {row.inventory_status === 'buy_it_now_live' ? (
                        <Link href="/singles" className="text-sm text-emerald-300 hover:text-emerald-200">
                          View in marketplace
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
