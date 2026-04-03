import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type DeckRow = {
  id: number
  user_id?: string | null
  source_type?: string | null
  is_valid?: boolean | null
  commander?: string | null
  image_url?: string | null
  price_total_usd_foil?: number | null
}

type DeckCardForBracket = {
  deck_id: number
  section: 'commander' | 'mainboard' | 'token'
  quantity: number
  card_name: string
  cmc?: number | null
  mana_cost?: string | null
}

function formatPct(value: number, total: number) {
  if (total === 0) return '0%'
  return `${((value / total) * 100).toFixed(0)}%`
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const { data: decksData, error: decksError } = await supabase
    .from('decks')
    .select('id, user_id, source_type, is_valid, commander, image_url, price_total_usd_foil')
    .order('id', { ascending: true })

  if (decksError) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h2 className="text-2xl font-semibold text-red-300">Dashboard Error</h2>
          <p className="mt-3 text-sm text-zinc-300">{decksError.message}</p>
        </div>
      </section>
    )
  }

  const decks = (decksData ?? []) as DeckRow[]
  const deckIds = decks.map((deck) => deck.id)

  const { data: deckCardsData } = deckIds.length
    ? await supabase
        .from('deck_cards')
        .select('deck_id, section, quantity, card_name, cmc, mana_cost')
        .in('deck_id', deckIds)
    : { data: [] as DeckCardForBracket[] }

  const deckCards = (deckCardsData ?? []) as DeckCardForBracket[]
  const cardsByDeck = new Map<number, DeckCardForBracket[]>()

  for (const card of deckCards) {
    const existing = cardsByDeck.get(card.deck_id) ?? []
    existing.push(card)
    cardsByDeck.set(card.deck_id, existing)
  }

  const sellers = new Set(
    decks.map((deck) => deck.user_id).filter((value): value is string => !!value)
  )

  const importedDecks = decks.filter(
    (deck) => (deck.source_type ?? '').trim() !== '' && deck.source_type !== 'text'
  ).length
  const validDecks = decks.filter((deck) => deck.is_valid === true).length
  const invalidDecks = decks.filter((deck) => deck.is_valid === false).length
  const withCommander = decks.filter((deck) => !!deck.commander?.trim()).length
  const withImage = decks.filter((deck) => !!deck.image_url?.trim()).length
  const withPricing = decks.filter((deck) => Number(deck.price_total_usd_foil ?? 0) > 0).length
  const totalMarketplaceValue = decks.reduce(
    (sum, deck) => sum + Number(deck.price_total_usd_foil ?? 0),
    0
  )
  const avgDeckValue =
    decks.length > 0 ? totalMarketplaceValue / decks.length : 0

  const bracketCounts = new Map<number, number>()

  for (const deck of decks) {
    const bracket = getCommanderBracketSummary(cardsByDeck.get(deck.id) ?? []).bracket
    if (bracket == null) continue
    bracketCounts.set(bracket, (bracketCounts.get(bracket) ?? 0) + 1)
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Website Health</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Basic operational visibility across imports, data completeness, and deck readiness.
                </p>
              </div>
              <Link
                href="/admin/backfill-decks"
                className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:opacity-90"
              >
                Open Maintenance
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Total Decks</div>
                <div className="mt-2 text-3xl font-semibold">{decks.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Valid Decks</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-300">
                  {formatPct(validDecks, decks.length)}
                </div>
                <div className="mt-1 text-sm text-zinc-500">{validDecks} valid</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Decks With Images</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-300">
                  {formatPct(withImage, decks.length)}
                </div>
                <div className="mt-1 text-sm text-zinc-500">{withImage} decks</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Decks With Pricing</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-300">
                  {formatPct(withPricing, decks.length)}
                </div>
                <div className="mt-1 text-sm text-zinc-500">{withPricing} decks</div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Imported Decks</div>
                <div className="mt-2 text-2xl font-semibold">{importedDecks}</div>
                <p className="mt-2 text-sm text-zinc-400">
                  Decks that came from a structured import source instead of a plain manual listing.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Missing Commander Data</div>
                <div className="mt-2 text-2xl font-semibold text-yellow-300">
                  {decks.length - withCommander}
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  Listings missing commander identity or needing repair after import.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Business Health</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Marketplace inventory, seller participation, and value distribution.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Active Sellers</div>
                <div className="mt-2 text-3xl font-semibold">{sellers.size}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Marketplace Value</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-300">
                  {formatUsd(totalMarketplaceValue)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Avg. Deck Value</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-300">
                  {formatUsd(avgDeckValue)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Invalid Listings</div>
                <div className="mt-2 text-3xl font-semibold text-yellow-300">{invalidDecks}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Maintenance</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Access the heavy-lift admin tools from here.
            </p>

            <div className="mt-6 space-y-3">
              <Link
                href="/admin/backfill-decks"
                className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-medium text-white hover:bg-white/10"
              >
                Open re-enrich and commander backfill tools
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Bracket Distribution</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Current estimated spread of marketplace decks by Commander bracket.
            </p>

            <div className="mt-5 space-y-3">
              {[1, 2, 3, 4, 5].map((bracket) => (
                <div
                  key={bracket}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="text-sm text-zinc-300">Bracket {bracket}</div>
                  <div className="text-lg font-semibold text-white">
                    {bracketCounts.get(bracket) ?? 0}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Quick Read</h2>
            <div className="mt-4 space-y-3 text-sm text-zinc-300">
              <p>
                {withPricing < decks.length
                  ? `${decks.length - withPricing} decks are still missing pricing coverage and may benefit from re-enrichment.`
                  : 'All current decks have blended pricing coverage.'}
              </p>
              <p>
                {invalidDecks > 0
                  ? `${invalidDecks} deck listings are currently invalid and may need commander repair or better source data.`
                  : 'No invalid deck listings are currently flagged.'}
              </p>
              <p>
                {importedDecks > 0
                  ? `${formatPct(importedDecks, decks.length)} of listings came from structured imports.`
                  : 'No structured imports are currently recorded.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
