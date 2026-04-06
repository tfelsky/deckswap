import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AppHeader from '@/components/app-header'
import { importPreconAction } from '../actions'
import {
  getPreconDeck,
  getPreconSectionLabel,
  groupPreconCardsBySection,
} from '@/lib/precons/catalog'

export const dynamic = 'force-dynamic'

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

function sectionEntries(grouped: ReturnType<typeof groupPreconCardsBySection>) {
  return [
    { key: 'commander', label: getPreconSectionLabel('commander'), cards: grouped.commander },
    { key: 'mainboard', label: getPreconSectionLabel('mainboard'), cards: grouped.mainboard },
    { key: 'sideboard', label: getPreconSectionLabel('sideboard'), cards: grouped.sideboard },
    { key: 'token', label: getPreconSectionLabel('token'), cards: grouped.token },
  ].filter((section) => section.cards.length > 0)
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ fileName: string }>
}): Promise<Metadata> {
  const resolvedParams = await params
  const deck = await getPreconDeck(decodeURIComponent(resolvedParams.fileName))

  if (!deck) {
    return {
      title: 'Precon Not Found | Mythiverse Exchange',
    }
  }

  return {
    title: `${deck.name} | Precon Catalog`,
    description: `Canonical MTG precon list for ${deck.name}, including tokens and import-ready sections.`,
    alternates: {
      canonical: `/precons/${encodeURIComponent(deck.fileName)}`,
    },
  }
}

export default async function PreconDeckPage({
  params,
}: {
  params: Promise<{ fileName: string }>
}) {
  const resolvedParams = await params
  const deck = await getPreconDeck(decodeURIComponent(resolvedParams.fileName))

  if (!deck) {
    notFound()
  }

  const grouped = groupPreconCardsBySection(deck.cards)
  const sections = sectionEntries(grouped)

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="import" />
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/precons"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
            >
              {'<-'} Back to catalog
            </Link>
            <a
              href={deck.deckUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
            >
              Open MTGJSON source
            </a>
          </div>

          <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                Canonical Precon
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">{deck.name}</h1>
              <p className="mt-3 text-zinc-400">
                {deck.type ?? 'Deck product'} | {deck.code || 'Set code unavailable'} | {formatReleaseDate(deck.releaseDate)}
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-zinc-300">
                <span className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  {deck.commanderCount} commander
                </span>
                <span className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  {deck.mainboardCount} mainboard
                </span>
                {deck.sideboardCount > 0 ? (
                  <span className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    {deck.sideboardCount} sideboard
                  </span>
                ) : null}
                <span className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  {deck.tokenCount} token
                </span>
                <span className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  {deck.totalCardCount} total tracked items
                </span>
              </div>
            </div>
            <ImportButtons fileName={deck.fileName} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6">
          {sections.map((section) => (
            <section
              key={section.key}
              className="rounded-3xl border border-white/10 bg-zinc-900 p-6"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-white">{section.label}</h2>
                <div className="text-sm text-zinc-400">
                  {section.cards.reduce((sum, card) => sum + card.quantity, 0)} cards
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {section.cards.map((card, index) => (
                  <div
                    key={`${section.key}-${card.cardName}-${index}`}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div>
                      <div className="font-medium text-white">{card.cardName}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {[card.setCode?.toUpperCase(), card.collectorNumber, card.foil ? 'Foil' : null]
                          .filter(Boolean)
                          .join(' | ') || 'Canonical MTGJSON entry'}
                      </div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-zinc-950 px-3 py-1 text-sm text-zinc-300">
                      x{card.quantity}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  )
}
