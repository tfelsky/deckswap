import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import { isAuctionSchemaMissing } from '@/lib/auction/foundation'
import { getTrendWatcherReport } from '@/lib/admin/trend-watcher'
import { isGuestImportSchemaMissing } from '@/lib/guest-import'
import { isProfileSchemaMissing } from '@/lib/profiles'
import { isEscrowSchemaMissing } from '@/lib/escrow/foundation'
import { createClient } from '@/lib/supabase/server'
import { isTradeOffersSchemaMissing } from '@/lib/trade-offers'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type DeckRow = {
  id: number
  user_id?: string | null
  source_type?: string | null
  imported_at?: string | null
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

type ReputationSummaryRow = {
  user_id: string
  internal_validation_score?: number | null
  internal_validation_tier?: string | null
  banned_status?: string | null
}

type PublicProfileRow = {
  user_id: string
  display_name?: string | null
  username?: string | null
}

type TradeOfferMetricsRow = {
  id: number
  offered_by_user_id: string
  requested_user_id: string
  status: string
  accepted_trade_transaction_id?: number | null
}

type TradeTransactionMetricsRow = {
  id: number
  status: string
  platform_gross_usd?: number | null
}

type TradeParticipantMetricsRow = {
  transaction_id: number
  user_id?: string | null
}

type AuctionListingMetricsRow = {
  seller_user_id: string
  winner_user_id?: string | null
  status: string
  final_bid_usd?: number | null
}

type AdminUserLeaderboardRow = {
  userId: string
  displayName: string
  username: string | null
  deckCount: number
  deckValue: number
  offersSent: number
  offersReceived: number
  acceptedOffers: number
  tradeCount: number
  completedTradeCount: number
  openTradeCount: number
  salesCount: number | null
  salesVolume: number | null
  internalValidationScore: number | null
  internalValidationTier: string | null
  bannedStatus: string | null
  activityScore: number
}

function formatPct(value: number, total: number) {
  if (total === 0) return '0%'
  return `${((value / total) * 100).toFixed(0)}%`
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`
}

function formatWholeNumber(value: number) {
  return new Intl.NumberFormat('en-CA').format(value)
}

function formatUserLabel(profile: PublicProfileRow | undefined, userId: string) {
  if (profile?.display_name?.trim()) return profile.display_name.trim()
  if (profile?.username?.trim()) return `@${profile.username.trim()}`
  return `${userId.slice(0, 8)}…`
}

function formatStatusLabel(value?: string | null) {
  if (!value) return 'Active'
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function isDeckPriceHistorySchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.deck_price_history'") ||
    message.includes('relation "public.deck_price_history"') ||
    message.includes("Could not find the relation 'public.deck_price_history'")
  )
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const trendReport = await getTrendWatcherReport()

  const { data: decksData, error: decksError } = await supabase
    .from('decks')
    .select('id, user_id, source_type, imported_at, is_valid, commander, image_url, price_total_usd_foil')
    .order('id', { ascending: true })

  const { data: reputationData } = await supabase
    .from('profile_reputation_summary')
    .select('user_id, internal_validation_score, internal_validation_tier, banned_status')

  const [guestDraftsResult, priceHistoryResult] = await Promise.all([
    supabase
      .from('guest_import_drafts')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('deck_price_history')
      .select('deck_id', { count: 'exact', head: true }),
  ])

  const [
    tradeOffersResult,
    tradeTransactionsResult,
    tradeParticipantsResult,
    auctionListingsResult,
    profilesResult,
  ] = await Promise.all([
    supabase
      .from('trade_offers')
      .select(
        'id, offered_by_user_id, requested_user_id, status, accepted_trade_transaction_id'
      ),
    supabase.from('trade_transactions').select('id, status, platform_gross_usd'),
    supabase
      .from('trade_transaction_participants')
      .select('transaction_id, user_id'),
    supabase
      .from('auction_listings')
      .select('seller_user_id, winner_user_id, status, final_bid_usd'),
    supabase.from('profiles').select('user_id, display_name, username'),
  ])

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
  const reputationSummaries = (reputationData ?? []) as ReputationSummaryRow[]
  const scoredUsers = reputationSummaries.filter(
    (summary) => typeof summary.internal_validation_score === 'number'
  )
  const avgInternalValidationScore =
    scoredUsers.length > 0
      ? scoredUsers.reduce(
          (sum, summary) => sum + Number(summary.internal_validation_score ?? 0),
          0
        ) / scoredUsers.length
      : 0
  const needsReviewUsers = reputationSummaries.filter(
    (summary) =>
      summary.internal_validation_tier === 'Needs Review' ||
      summary.banned_status === 'watchlist' ||
      summary.banned_status === 'restricted' ||
      summary.banned_status === 'banned'
  ).length

  const importedDecks = decks.filter(
    (deck) => (deck.source_type ?? '').trim() !== '' && deck.source_type !== 'text'
  ).length
  const moxfieldDecks = decks.filter((deck) => deck.source_type === 'moxfield').length
  const archidektDecks = decks.filter((deck) => deck.source_type === 'archidekt').length
  const textDecks = decks.filter(
    (deck) => !deck.source_type || deck.source_type === 'text'
  ).length
  const validDecks = decks.filter((deck) => deck.is_valid === true).length
  const invalidDecks = decks.filter((deck) => deck.is_valid === false).length
  const withCommander = decks.filter((deck) => !!deck.commander?.trim()).length
  const withImage = decks.filter((deck) => !!deck.image_url?.trim()).length
  const withPricing = decks.filter((deck) => Number(deck.price_total_usd_foil ?? 0) > 0).length
  const recentImports = decks.filter((deck) => {
    const importedAt = (deck as { imported_at?: string | null }).imported_at
    if (!importedAt) return false
    return Date.now() - new Date(importedAt).getTime() <= 1000 * 60 * 60 * 24 * 7
  }).length
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
  const guestDraftsSchemaReady = !isGuestImportSchemaMissing(guestDraftsResult.error?.message)
  const guestDraftsCount = guestDraftsSchemaReady ? Number(guestDraftsResult.count ?? 0) : null
  const deckPriceHistoryReady = !isDeckPriceHistorySchemaMissing(priceHistoryResult.error?.message)
  const deckPriceHistoryCount = deckPriceHistoryReady
    ? Number(priceHistoryResult.count ?? 0)
    : null
  const tradeOffersSchemaReady = !isTradeOffersSchemaMissing(tradeOffersResult.error?.message)
  const escrowSchemaReady =
    !isEscrowSchemaMissing(tradeTransactionsResult.error?.message) &&
    !isEscrowSchemaMissing(tradeParticipantsResult.error?.message)
  const auctionSchemaReady = !isAuctionSchemaMissing(auctionListingsResult.error?.message)
  const profileSchemaReady = !isProfileSchemaMissing(profilesResult.error?.message)

  const bracketCounts = new Map<number, number>()

  for (const deck of decks) {
    const bracket = getCommanderBracketSummary(cardsByDeck.get(deck.id) ?? []).bracket
    if (bracket == null) continue
    bracketCounts.set(bracket, (bracketCounts.get(bracket) ?? 0) + 1)
  }

  const profiles = new Map<string, PublicProfileRow>(
    profileSchemaReady
      ? ((profilesResult.data ?? []) as PublicProfileRow[]).map((profile) => [
          profile.user_id,
          profile,
        ])
      : []
  )
  const reputationByUser = new Map<string, ReputationSummaryRow>(
    reputationSummaries.map((summary) => [summary.user_id, summary])
  )
  const leaderboardByUser = new Map<
    string,
    Omit<AdminUserLeaderboardRow, 'activityScore'>
  >()

  function ensureLeaderboardRow(userId: string) {
    let row = leaderboardByUser.get(userId)
    if (row) return row

    const profile = profiles.get(userId)
    const reputation = reputationByUser.get(userId)

    row = {
      userId,
      displayName: formatUserLabel(profile, userId),
      username: profile?.username?.trim() || null,
      deckCount: 0,
      deckValue: 0,
      offersSent: 0,
      offersReceived: 0,
      acceptedOffers: 0,
      tradeCount: 0,
      completedTradeCount: 0,
      openTradeCount: 0,
      salesCount: auctionSchemaReady ? 0 : null,
      salesVolume: auctionSchemaReady ? 0 : null,
      internalValidationScore:
        typeof reputation?.internal_validation_score === 'number'
          ? Number(reputation.internal_validation_score)
          : null,
      internalValidationTier: reputation?.internal_validation_tier ?? null,
      bannedStatus: reputation?.banned_status ?? null,
    }

    leaderboardByUser.set(userId, row)
    return row
  }

  for (const deck of decks) {
    if (!deck.user_id) continue
    const row = ensureLeaderboardRow(deck.user_id)
    row.deckCount += 1
    row.deckValue += Number(deck.price_total_usd_foil ?? 0)
  }

  if (tradeOffersSchemaReady) {
    const tradeOffers = (tradeOffersResult.data ?? []) as TradeOfferMetricsRow[]

    for (const offer of tradeOffers) {
      const sender = ensureLeaderboardRow(offer.offered_by_user_id)
      sender.offersSent += 1
      if (offer.status === 'accepted') {
        sender.acceptedOffers += 1
      }

      const receiver = ensureLeaderboardRow(offer.requested_user_id)
      receiver.offersReceived += 1
    }
  }

  if (escrowSchemaReady) {
    const transactions = new Map<number, TradeTransactionMetricsRow>(
      ((tradeTransactionsResult.data ?? []) as TradeTransactionMetricsRow[]).map(
        (transaction) => [transaction.id, transaction]
      )
    )
    const tradeIdsByUser = new Map<string, Set<number>>()
    const completedTradeIdsByUser = new Map<string, Set<number>>()
    const openTradeIdsByUser = new Map<string, Set<number>>()

    for (const participant of (tradeParticipantsResult.data ?? []) as TradeParticipantMetricsRow[]) {
      if (!participant.user_id) continue

      const transaction = transactions.get(participant.transaction_id)
      if (!transaction) continue

      const totalTrades = tradeIdsByUser.get(participant.user_id) ?? new Set<number>()
      totalTrades.add(participant.transaction_id)
      tradeIdsByUser.set(participant.user_id, totalTrades)

      if (transaction.status === 'completed') {
        const completedTrades =
          completedTradeIdsByUser.get(participant.user_id) ?? new Set<number>()
        completedTrades.add(participant.transaction_id)
        completedTradeIdsByUser.set(participant.user_id, completedTrades)
      } else if (transaction.status !== 'cancelled') {
        const openTrades = openTradeIdsByUser.get(participant.user_id) ?? new Set<number>()
        openTrades.add(participant.transaction_id)
        openTradeIdsByUser.set(participant.user_id, openTrades)
      }
    }

    for (const [userId, tradeIds] of tradeIdsByUser) {
      const row = ensureLeaderboardRow(userId)
      row.tradeCount = tradeIds.size
      row.completedTradeCount = completedTradeIdsByUser.get(userId)?.size ?? 0
      row.openTradeCount = openTradeIdsByUser.get(userId)?.size ?? 0
    }
  }

  if (auctionSchemaReady) {
    for (const auction of (auctionListingsResult.data ?? []) as AuctionListingMetricsRow[]) {
      const row = ensureLeaderboardRow(auction.seller_user_id)
      if (auction.status === 'payout_released') {
        row.salesCount = Number(row.salesCount ?? 0) + 1
        row.salesVolume = Number(row.salesVolume ?? 0) + Number(auction.final_bid_usd ?? 0)
      }

      if (auction.winner_user_id) {
        ensureLeaderboardRow(auction.winner_user_id)
      }
    }
  }

  for (const reputation of reputationSummaries) {
    ensureLeaderboardRow(reputation.user_id)
  }

  const leaderboardRows: AdminUserLeaderboardRow[] = [...leaderboardByUser.values()]
    .map((row) => ({
      ...row,
      activityScore:
        row.deckCount +
        row.acceptedOffers * 2 +
        row.tradeCount * 4 +
        row.completedTradeCount * 6 +
        Number(row.salesCount ?? 0) * 8,
    }))
    .sort((left, right) => {
      return (
        right.activityScore - left.activityScore ||
        Number(right.salesCount ?? 0) - Number(left.salesCount ?? 0) ||
        right.completedTradeCount - left.completedTradeCount ||
        right.tradeCount - left.tradeCount ||
        right.deckCount - left.deckCount ||
        right.deckValue - left.deckValue ||
        left.displayName.localeCompare(right.displayName)
      )
    })

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
              <Link
                href="/admin/verifications"
                className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
              >
                <div className="text-sm text-zinc-400">Verification Queue</div>
                <div className="mt-2 text-2xl font-semibold text-emerald-300">
                  Review Requests
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  Open the new seller and identity verification review flow.
                </p>
              </Link>
              <Link
                href="/admin/approvals"
                className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
              >
                <div className="text-sm text-zinc-400">User Approval Queue</div>
                <div className="mt-2 text-2xl font-semibold text-emerald-300">
                  Review New Users
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  Approve or deny new signups with profile, shipping, verification, and activity context.
                </p>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Import Health</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Source mix, migration readiness, and recovery paths for guest and authenticated imports.
                </p>
              </div>
              <Link
                href="/import-deck"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
              >
                Open import flow
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Recent Imports</div>
                <div className="mt-2 text-3xl font-semibold">{recentImports}</div>
                <div className="mt-1 text-sm text-zinc-500">Last 7 days</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Moxfield</div>
                <div className="mt-2 text-3xl font-semibold">{moxfieldDecks}</div>
                <div className="mt-1 text-sm text-zinc-500">Link imports</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Archidekt</div>
                <div className="mt-2 text-3xl font-semibold">{archidektDecks}</div>
                <div className="mt-1 text-sm text-zinc-500">Structured text/file imports</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Text or File</div>
                <div className="mt-2 text-3xl font-semibold">{textDecks}</div>
                <div className="mt-1 text-sm text-zinc-500">Manual or uploaded lists</div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Schema Readiness</div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                    <span className="text-zinc-300">Guest draft recovery</span>
                    <span className={guestDraftsSchemaReady ? 'text-emerald-300' : 'text-yellow-300'}>
                      {guestDraftsSchemaReady ? `Ready${guestDraftsCount != null ? ` • ${guestDraftsCount} drafts` : ''}` : 'Migration needed'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                    <span className="text-zinc-300">Deck price history</span>
                    <span className={deckPriceHistoryReady ? 'text-emerald-300' : 'text-yellow-300'}>
                      {deckPriceHistoryReady ? `Ready${deckPriceHistoryCount != null ? ` • ${deckPriceHistoryCount} snapshots` : ''}` : 'Migration needed'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                    <span className="text-zinc-300">Import recovery coverage</span>
                    <span className="text-emerald-300">
                      {withPricing < decks.length || withImage < decks.length ? 'Recovery tools available' : 'Healthy'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Quick Read</div>
                <div className="mt-3 space-y-2 text-sm text-zinc-300">
                  <p>
                    {withPricing < decks.length
                      ? `${decks.length - withPricing} decks still need pricing coverage or a retry pass.`
                      : 'Pricing coverage is healthy across current decks.'}
                  </p>
                  <p>
                    {withCommander < decks.length
                      ? `${decks.length - withCommander} decks are missing commander identity and may need repair or better source metadata.`
                      : 'Commander identity is present on current listings.'}
                  </p>
                  <p>
                    {guestDraftsSchemaReady
                      ? 'Guest preview recovery is backed by server-side draft tokens.'
                      : 'Guest preview still needs the guest draft migration before recovery works server-side.'}
                  </p>
                </div>
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

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Avg. Internal Validation</div>
                <div className="mt-2 text-2xl font-semibold text-emerald-300">
                  {scoredUsers.length > 0 ? avgInternalValidationScore.toFixed(0) : 'N/A'}
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  Internal trust score across profiled users with review data.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Users Needing Review</div>
                <div className="mt-2 text-2xl font-semibold text-yellow-300">
                  {needsReviewUsers}
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  Includes watchlist, restricted, banned, or low-confidence internal scores.
                </p>
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

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">User Leaderboard</h2>
                <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                  Internal ranking of who is listing inventory and moving through offers, trades,
                  and sale settlements.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-300">
                  {formatWholeNumber(leaderboardRows.length)} tracked users
                </span>
                <span
                  className={`rounded-full border px-3 py-1 ${
                    tradeOffersSchemaReady
                      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                      : 'border-yellow-400/20 bg-yellow-400/10 text-yellow-100'
                  }`}
                >
                  Offers {tradeOffersSchemaReady ? 'live' : 'offline'}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 ${
                    escrowSchemaReady
                      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                      : 'border-yellow-400/20 bg-yellow-400/10 text-yellow-100'
                  }`}
                >
                  Trades {escrowSchemaReady ? 'live' : 'offline'}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 ${
                    auctionSchemaReady
                      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                      : 'border-yellow-400/20 bg-yellow-400/10 text-yellow-100'
                  }`}
                >
                  Sales {auctionSchemaReady ? 'live' : 'offline'}
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Decks In Leaderboard</div>
                <div className="mt-2 text-3xl font-semibold">
                  {formatWholeNumber(
                    leaderboardRows.reduce((sum, row) => sum + row.deckCount, 0)
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Offers Tracked</div>
                <div className="mt-2 text-3xl font-semibold">
                  {tradeOffersSchemaReady
                    ? formatWholeNumber(
                        leaderboardRows.reduce(
                          (sum, row) => sum + row.offersSent + row.offersReceived,
                          0
                        ) / 2
                      )
                    : 'N/A'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Trades Tracked</div>
                <div className="mt-2 text-3xl font-semibold">
                  {escrowSchemaReady
                    ? formatWholeNumber(
                        leaderboardRows.reduce((sum, row) => sum + row.tradeCount, 0)
                      )
                    : 'N/A'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Sales Settled</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-300">
                  {auctionSchemaReady
                    ? formatWholeNumber(
                        leaderboardRows.reduce(
                          (sum, row) => sum + Number(row.salesCount ?? 0),
                          0
                        )
                      )
                    : 'N/A'}
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.2em] text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3 text-right">Decks</th>
                    <th className="px-4 py-3 text-right">Listed Value</th>
                    <th className="px-4 py-3 text-right">Sales</th>
                    <th className="px-4 py-3 text-right">Sales Volume</th>
                    <th className="px-4 py-3 text-right">Trades</th>
                    <th className="px-4 py-3 text-right">Completed</th>
                    <th className="px-4 py-3 text-right">Offers</th>
                    <th className="px-4 py-3">Trust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 bg-zinc-950/40">
                  {leaderboardRows.length > 0 ? (
                    leaderboardRows.slice(0, 50).map((row, index) => (
                      <tr key={row.userId} className="align-top">
                        <td className="px-4 py-4 font-medium text-white">#{index + 1}</td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-white">
                            {row.username ? (
                              <Link href={`/u/${row.username}`} className="hover:text-emerald-300">
                                {row.displayName}
                              </Link>
                            ) : (
                              row.displayName
                            )}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {row.username ? `@${row.username}` : row.userId}
                          </div>
                          <div className="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">
                            {formatStatusLabel(row.bannedStatus)}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right text-zinc-200">
                          {formatWholeNumber(row.deckCount)}
                        </td>
                        <td className="px-4 py-4 text-right text-emerald-300">
                          {formatUsd(row.deckValue)}
                        </td>
                        <td className="px-4 py-4 text-right text-zinc-200">
                          {row.salesCount == null ? '—' : formatWholeNumber(row.salesCount)}
                        </td>
                        <td className="px-4 py-4 text-right text-emerald-300">
                          {row.salesVolume == null ? '—' : formatUsd(row.salesVolume)}
                        </td>
                        <td className="px-4 py-4 text-right text-zinc-200">
                          {escrowSchemaReady ? formatWholeNumber(row.tradeCount) : '—'}
                        </td>
                        <td className="px-4 py-4 text-right text-zinc-200">
                          {escrowSchemaReady
                            ? formatWholeNumber(row.completedTradeCount)
                            : '—'}
                        </td>
                        <td className="px-4 py-4 text-right text-zinc-200">
                          {tradeOffersSchemaReady
                            ? formatWholeNumber(row.offersSent + row.offersReceived)
                            : '—'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-white">
                            {row.internalValidationScore != null
                              ? `${row.internalValidationScore}/100`
                              : 'N/A'}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {row.internalValidationTier ?? 'No tier yet'}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-zinc-400">
                        No user activity has been recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {(!tradeOffersSchemaReady || !escrowSchemaReady || !auctionSchemaReady) && (
              <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                Missing schemas stay visible as unavailable instead of defaulting to fake zeros.
                Offers use <code>trade_offers</code>, trades use the escrow transaction tables, and
                sales use settled <code>auction_listings</code>.
              </div>
            )}
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
              <Link
                href="/admin/email"
                className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-medium text-white hover:bg-white/10"
              >
                Open email operations console
              </Link>
              <Link
                href="/admin/logistics"
                className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-medium text-white hover:bg-white/10"
              >
                Open logistics map and transit feed
              </Link>
              <Link
                href="/admin/arbitration"
                className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-medium text-white hover:bg-white/10"
              >
                Open self-cleared auction arbitration queue
              </Link>
              <Link
                href="/admin/paper-power-9"
                className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-medium text-white hover:bg-white/10"
              >
                Open Personal Power 9 script and PNG studio
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
