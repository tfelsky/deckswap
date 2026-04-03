import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import { getTrendWatcherReport } from '@/lib/admin/trend-watcher'
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
  const trendReport = await getTrendWatcherReport()

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
  const tradeReadyDecks = decks.filter(
    (deck) =>
      deck.is_valid === true &&
      Number(deck.price_total_usd_foil ?? 0) > 0 &&
      !!deck.image_url?.trim()
  )
  const tradeReadyCount = tradeReadyDecks.length
  const tradeReadyValue = tradeReadyDecks.reduce(
    (sum, deck) => sum + Number(deck.price_total_usd_foil ?? 0),
    0
  )
  const escrowEligibleDecks = tradeReadyDecks.filter(
    (deck) => Number(deck.price_total_usd_foil ?? 0) >= 250
  )
  const escrowCandidateCount = escrowEligibleDecks.length
  const escrowCandidateValue = escrowEligibleDecks.reduce(
    (sum, deck) => sum + Number(deck.price_total_usd_foil ?? 0),
    0
  )
  const estimatedAverageTicket =
    tradeReadyCount > 0 ? tradeReadyValue / tradeReadyCount : 0
  const trackedSales = 0
  const completedTrades = 0
  const openEscrows = 0
  const escrowBalance = 0

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

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Ecommerce Operations</h2>
                <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                  A commerce-style view of live marketplace inventory, trade-ready supply, and the
                  escrow pipeline we can support once transactional ledger tables land.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                Sales, trade, and escrow counters are reserved now and switch to live values when
                the order ledger ships.
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Tracked Sales</div>
                <div className="mt-2 text-3xl font-semibold">{trackedSales}</div>
                <div className="mt-1 text-sm text-zinc-500">Pending sales model</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Completed Trades</div>
                <div className="mt-2 text-3xl font-semibold">{completedTrades}</div>
                <div className="mt-1 text-sm text-zinc-500">Pending trade ledger</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Open Escrows</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-300">{openEscrows}</div>
                <div className="mt-1 text-sm text-zinc-500">Pending escrow ledger</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Escrow Balance</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-300">
                  {formatUsd(escrowBalance)}
                </div>
                <div className="mt-1 text-sm text-zinc-500">Funds currently held</div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Trade-Ready Listings</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-300">
                  {tradeReadyCount}
                </div>
                <div className="mt-1 text-sm text-zinc-500">
                  Valid, priced, and imaged decks ready for matching
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Trade-Ready Value</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-300">
                  {formatUsd(tradeReadyValue)}
                </div>
                <div className="mt-1 text-sm text-zinc-500">
                  Live inventory value available for commerce
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Escrow Candidates</div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {escrowCandidateCount}
                </div>
                <div className="mt-1 text-sm text-zinc-500">
                  Trade-ready decks above the high-value threshold
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Avg. Ticket</div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {formatUsd(estimatedAverageTicket)}
                </div>
                <div className="mt-1 text-sm text-zinc-500">
                  Based on current trade-ready deck inventory
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Escrow Pipeline Capacity</div>
                <div className="mt-2 text-2xl font-semibold text-emerald-300">
                  {formatUsd(escrowCandidateValue)}
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  This is the current value of trade-ready decks at or above the high-value escrow
                  threshold. It is a useful operating proxy until live escrow balances exist.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Ops Readiness</div>
                <div className="mt-3 space-y-2 text-sm text-zinc-300">
                  <p>
                    {tradeReadyCount > 0
                      ? `${tradeReadyCount} listings are already in a shape that can support matching conversations.`
                      : 'No listings are fully trade-ready yet.'}
                  </p>
                  <p>
                    {escrowCandidateCount > 0
                      ? `${escrowCandidateCount} higher-value decks would benefit first from escrow, insurance, and shipping workflows.`
                      : 'Higher-value escrow candidates will show up here once more premium inventory is live.'}
                  </p>
                </div>
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
              <Link
                href="/admin/trends"
                className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-medium text-white hover:bg-white/10"
              >
                Open MTG trend watcher and content prompt builder
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Trend Watcher</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Current Magic news signals from Wizards and marketplace-adjacent sources.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Official Headlines</div>
                <div className="mt-2 text-3xl font-semibold">{trendReport.official.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Marketplace Headlines</div>
                <div className="mt-2 text-3xl font-semibold">{trendReport.marketplace.length}</div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {trendReport.official[0] && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-emerald-300/80">
                    Latest Official
                  </div>
                  <div className="mt-2 text-sm text-white">{trendReport.official[0].title}</div>
                </div>
              )}
              {trendReport.marketplace[0] && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-emerald-300/80">
                    Latest Marketplace
                  </div>
                  <div className="mt-2 text-sm text-white">
                    {trendReport.marketplace[0].title}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {trendReport.themes.slice(0, 4).map((theme) => (
                <span
                  key={theme}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300"
                >
                  {theme}
                </span>
              ))}
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
