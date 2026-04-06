import type { Metadata } from 'next'
import Link from 'next/link'
import AppHeader from '@/components/app-header'
import { importPreconAction } from './actions'
import { getPreconCatalogPage } from '@/lib/precons/catalog'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Precon Catalog | Mythiverse Exchange',
  description:
    'Browse MTG precons with canonical decklists and tokens, then import them as sealed or complete listings.',
  alternates: {
    canonical: '/precons',
  },
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function formatReleaseDate(value: string | null) {
  if (!value) return 'Release date unknown'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function CountPill({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300">
      <span className="text-white">{value}</span> {label}
    </div>
  )
}

function ImportButtons({ fileName }: { fileName: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <form action={importPreconAction}>
        <input type="hidden" name="file_name" value={fileName} />
        <input type="hidden" name="inventory_mode" value="sealed" />
        <button
          type="submit"
          className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15"
        >
          Import as sealed
        </button>
      </form>
      <form action={importPreconAction}>
        <input type="hidden" name="file_name" value={fileName} />
        <input type="hidden" name="inventory_mode" value="complete" />
        <button
          type="submit"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
        >
          Import as complete
        </button>
      </form>
    </div>
  )
}

export default async function PreconCatalogPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const query = getSingleSearchParam(resolvedSearchParams.q)?.trim() ?? ''
  const error = getSingleSearchParam(resolvedSearchParams.error)?.trim() ?? ''
  const { items, totalCount, visibleCount } = await getPreconCatalogPage(query, 36)

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="import" />
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/import-deck"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
            >
              {'<-'} Back to imports
            </Link>
            <Link
              href="/decks"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
            >
              Browse marketplace
            </Link>
          </div>

          <div className="mt-8 max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
              MTG Precon Catalog
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Import sealed or complete precons from a standard list
            </h1>
            <p className="mt-3 text-zinc-400">
              Search the MTGJSON precon catalog, inspect the canonical decklist, and import the exact mainboard, commander section, sideboard, and tokens without hunting down a deck export first.
            </p>
          </div>

          <form className="mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by deck name, set code, product type, or year"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
            />
            <button
              type="submit"
              className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
            >
              Search catalog
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-3 text-sm text-zinc-400">
            <span>{totalCount} matching products</span>
            <span>Showing {visibleCount}</span>
            <span>Sealed imports set both sealed and complete-precon flags</span>
            <span>Complete imports stay unsealed but marked complete</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-8 text-zinc-300">
            No precons matched that search yet. Try a broader deck name, set code, or product type.
          </div>
        ) : (
          <div className="grid gap-6">
            {items.map((item) => (
              <article
                key={item.fileName}
                className="rounded-3xl border border-white/10 bg-zinc-900 p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-semibold text-white">
                        <Link
                          href={`/precons/${encodeURIComponent(item.fileName)}`}
                          className="hover:text-emerald-200"
                        >
                          {item.name}
                        </Link>
                      </h2>
                      {item.type ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                          {item.type}
                        </span>
                      ) : null}
                      {item.code ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                          {item.code}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm text-zinc-400">
                      {formatReleaseDate(item.releaseDate)} | {item.totalCardCount} tracked items including tokens and sideboard when present.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <CountPill label="commander" value={item.commanderCount} />
                      <CountPill label="mainboard" value={item.mainboardCount} />
                      {item.sideboardCount > 0 ? (
                        <CountPill label="sideboard" value={item.sideboardCount} />
                      ) : null}
                      <CountPill label="tokens" value={item.tokenCount} />
                    </div>
                    <div className="mt-5 flex flex-wrap gap-4 text-sm">
                      <Link
                        href={`/precons/${encodeURIComponent(item.fileName)}`}
                        className="text-emerald-300 hover:text-emerald-200"
                      >
                        View canonical decklist
                      </Link>
                      <a
                        href={item.deckUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-400 hover:text-zinc-200"
                      >
                        Open MTGJSON source
                      </a>
                    </div>
                  </div>
                  <ImportButtons fileName={item.fileName} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
