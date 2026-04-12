import AppHeader from '@/components/app-header'
import { formatCurrencyAmount, normalizeSupportedCurrency } from '@/lib/currency'
import { createClient } from '@/lib/supabase/server'
import {
  getSingleInventoryStatusBadgeClass,
  getSingleInventoryStatusDescription,
  getSingleInventoryStatusLabel,
} from '@/lib/singles/inventory-status'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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

export default async function MySinglesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  const { data, error } = await supabase
    .from('single_inventory_items')
    .select(
      'id, card_name, quantity, foil, condition, language, set_code, set_name, collector_number, inventory_status, image_url, price_usd, price_usd_foil, buy_now_price_usd, buy_now_currency, source_collection_name, source_collection_url, import_warning'
    )
    .eq('user_id', user.id)
    .order('id', { ascending: false })

  const schemaMissing = isSingleInventorySchemaMissing(error?.message)
  const rows = schemaMissing ? [] : ((data ?? []) as SingleRow[])
  const totalCopies = rows.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0)
  const totalValue = rows.reduce((sum, row) => {
    const unitValue = row.foil
      ? Number(row.price_usd_foil ?? row.price_usd ?? 0)
      : Number(row.price_usd ?? row.price_usd_foil ?? 0)
    return sum + unitValue * Number(row.quantity ?? 0)
  }, 0)
  const warningCount = rows.filter((row) => row.import_warning).length
  const uniqueSources = new Set(
    rows.map((row) => row.source_collection_name || row.source_collection_url || '')
  ).size

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="my-singles" isSignedIn />

      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                Private Inventory
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                My Singles
              </h1>
              <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
                Review imported singles before any public marketplace launch. This surface stays private in phase 1.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/import-library?scope=singles"
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
              >
                Import more singles
              </Link>
              <Link
                href="/my-decks"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                Back to decks
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Singles Rows</div>
              <div className="mt-2 text-3xl font-semibold">{rows.length}</div>
              <div className="mt-2 text-xs text-zinc-500">Unique imported rows in private inventory.</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Total Copies</div>
              <div className="mt-2 text-3xl font-semibold">{totalCopies}</div>
              <div className="mt-2 text-xs text-zinc-500">Aggregated quantity across all imported singles.</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Estimated Value</div>
              <div className="mt-2 text-3xl font-semibold text-emerald-300">
                {formatCurrencyAmount(totalValue, 'USD')}
              </div>
              <div className="mt-2 text-xs text-zinc-500">Current snapshot value from imported pricing fields.</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Import Warnings</div>
              <div className="mt-2 text-3xl font-semibold text-amber-200">{warningCount}</div>
              <div className="mt-2 text-xs text-zinc-500">{uniqueSources} source{uniqueSources === 1 ? '' : 's'} currently represented.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {schemaMissing ? (
          <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-6 text-sm text-yellow-100">
            Run <code>docs/sql/single-inventory.sql</code> to enable private singles inventory before using this surface.
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <h3 className="text-xl font-semibold">No singles imported yet</h3>
            <p className="mt-2 text-zinc-400">
              Import a supported public binder or collection source to populate this private inventory view.
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
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
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
                      {row.source_collection_name ? ` • Imported from ${row.source_collection_name}` : ''}
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
                        Buy-now pricing is reserved for a later marketplace slice.
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
