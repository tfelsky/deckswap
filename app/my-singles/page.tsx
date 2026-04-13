import AppHeader from '@/components/app-header'
import FormActionButton from '@/components/form-action-button'
import { formatCurrencyAmount, normalizeSupportedCurrency } from '@/lib/currency'
import { createClient } from '@/lib/supabase/server'
import {
  getSingleInventoryStatusBadgeClass,
  getSingleInventoryStatusDescription,
  getSingleInventoryStatusLabel,
} from '@/lib/singles/inventory-status'
import Link from 'next/link'
import { backfillSinglesEnrichmentAction, publishAllStagedSinglesAction } from './actions'

export const dynamic = 'force-dynamic'

const PAGE_SIZE_OPTIONS = [50, 100, 150] as const

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

function buildInventoryUrl(params: {
  page?: number
  pageSize: number
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
  const params = (await searchParams) ?? {}
  const page = parsePageParam(params.page)
  const pageSize = parsePageSize(params.pageSize)
  const filters: InventoryFilters = {
    queryText: sanitizeSearchTerm(parseStringParam(params.q)),
    status: normalizeFilterValue(params.status, STATUS_FILTER_OPTIONS, 'all'),
    finish: normalizeFilterValue(params.finish, FINISH_FILTER_OPTIONS, 'all'),
    warnings: normalizeFilterValue(params.warnings, WARNING_FILTER_OPTIONS, 'all'),
  }
  const currentUrl = buildInventoryUrl({
    page,
    pageSize,
    queryText: filters.queryText,
    status: filters.status,
    finish: filters.finish,
    warnings: filters.warnings,
  })

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
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
        'id, card_name, quantity, foil, condition, language, set_code, set_name, collector_number, inventory_status, image_url, price_usd, price_usd_foil, buy_now_price_usd, buy_now_currency, source_collection_name, source_collection_url, import_warning'
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
  const totalCopies = summaryRows.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0)
  const totalValue = summaryRows.reduce((sum, row) => {
    const unitValue = row.foil
      ? Number(row.price_usd_foil ?? row.price_usd ?? 0)
      : Number(row.price_usd ?? row.price_usd_foil ?? 0)
    return sum + unitValue * Number(row.quantity ?? 0)
  }, 0)
  const warningCount = summaryRows.filter((row) => row.import_warning).length
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
      <AppHeader current="my-singles" isSignedIn />

      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                Private Inventory
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                My Singles
              </h1>
              <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
                Search your inventory, retry Scryfall enrichment, and push staged singles into the public marketplace when they are ready.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Singles Rows</div>
              <div className="mt-2 text-3xl font-semibold">{safeTotalRows}</div>
              <div className="mt-2 text-xs text-zinc-500">
                Showing {showingStart}-{showingEnd} on this page.
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Total Copies</div>
              <div className="mt-2 text-3xl font-semibold">{totalCopies}</div>
              <div className="mt-2 text-xs text-zinc-500">Aggregated quantity across the filtered singles set.</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Estimated Value</div>
              <div className="mt-2 text-3xl font-semibold text-emerald-300">
                {formatCurrencyAmount(totalValue, 'USD')}
              </div>
              <div className="mt-2 text-xs text-zinc-500">Snapshot value from imported pricing fields.</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Warnings / Live</div>
              <div className="mt-2 text-3xl font-semibold text-amber-200">
                {warningCount} / {liveCount}
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                {uniqueSources} source{uniqueSources === 1 ? '' : 's'} represented in the current filter.
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/import-library?scope=singles"
              className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
            >
              Import more singles
            </Link>
            <Link
              href="/singles"
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
            >
              Open singles marketplace
            </Link>
            <Link
              href="/my-decks"
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
            >
              Back to decks
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
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
          <form method="get" className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_12rem_12rem_12rem_10rem_auto]">
              <input
                type="search"
                name="q"
                defaultValue={filters.queryText}
                placeholder="Search cards, sets, collector number, source..."
                className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/40"
              />
              <select
                name="status"
                defaultValue={filters.status}
                className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/40"
              >
                <option value="all">All statuses</option>
                <option value="staged">Staged</option>
                <option value="buy_it_now_live">Live</option>
                <option value="checked_out">Checked out</option>
                <option value="completed">Completed</option>
              </select>
              <select
                name="finish"
                defaultValue={filters.finish}
                className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/40"
              >
                <option value="all">All finishes</option>
                <option value="foil">Foil</option>
                <option value="nonfoil">Non-foil</option>
              </select>
              <select
                name="warnings"
                defaultValue={filters.warnings}
                className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/40"
              >
                <option value="all">All warnings</option>
                <option value="only">Warnings only</option>
                <option value="clean">Clean rows only</option>
              </select>
              <select
                name="pageSize"
                defaultValue={String(pageSize)}
                className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/40"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} / page
                  </option>
                ))}
              </select>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
                >
                  Apply
                </button>
                <Link
                  href="/my-singles"
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
                >
                  Reset
                </Link>
              </div>
            </div>
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
            <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-white">
                  Showing {showingStart}-{showingEnd} of {safeTotalRows} singles rows
                </div>
                <div className="mt-1 text-sm text-zinc-400">
                  Large imports are split across pages so the inventory view stays responsive.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={
                    currentPage > 1
                      ? buildInventoryUrl({
                          page: currentPage - 1,
                          pageSize,
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

            {rows.map((row) => {
              const unitValue = row.foil
                ? Number(row.price_usd_foil ?? row.price_usd ?? 0)
                : Number(row.price_usd ?? row.price_usd_foil ?? 0)
              const totalRowValue = unitValue * Number(row.quantity ?? 0)

              return (
                <article
                  key={row.id}
                  className="grid gap-4 rounded-3xl border border-white/10 bg-zinc-900/80 p-4 lg:grid-cols-[5rem_minmax(0,1fr)_14rem]"
                >
                  <div
                    className={`overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 ${
                      row.foil ? 'foil-card-shell ring-1 ring-amber-300/25' : ''
                    }`}
                  >
                    {row.image_url ? (
                      <img src={row.image_url} alt={row.card_name} className="h-28 w-full object-cover" />
                    ) : (
                      <div className="flex h-28 items-center justify-center text-xs text-zinc-500">No image</div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-white">{row.card_name}</h2>
                      <span className={`rounded-full border px-3 py-1 text-xs ${getSingleInventoryStatusBadgeClass(row.inventory_status)}`}>
                        {getSingleInventoryStatusLabel(row.inventory_status)}
                      </span>
                      {row.foil ? (
                        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
                          Foil
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-300">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        Qty {Number(row.quantity ?? 0)}
                      </span>
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
                      {row.set_name || 'Unknown printing'}
                      {row.source_collection_name ? ` - Imported from ${row.source_collection_name}` : ''}
                    </div>

                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-zinc-400">
                      {getSingleInventoryStatusDescription(row.inventory_status)}
                    </div>

                    {row.import_warning ? (
                      <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                        {row.import_warning}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500">Row value</div>
                    <div className="mt-1 text-2xl font-semibold text-emerald-300">
                      {formatCurrencyAmount(totalRowValue, 'USD')}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
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

                    {row.source_collection_url ? (
                      <a
                        href={row.source_collection_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 block text-sm text-emerald-300 hover:text-emerald-200"
                      >
                        Open source record
                      </a>
                    ) : null}
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
