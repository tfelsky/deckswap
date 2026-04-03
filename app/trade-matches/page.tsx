import AppHeader from '@/components/app-header'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import { getDeckFormatLabel, normalizeDeckFormat } from '@/lib/decks/formats'
import { getUnreadNotificationsCount } from '@/lib/notifications'
import { isProfileSchemaMissing, type PublicProfile, type ReputationSummary } from '@/lib/profiles'
import { createClient } from '@/lib/supabase/server'
import { calculateTradeMatch, type TradeMatchDeck } from '@/lib/trade-matches'
import { isUnreadTradeOffer, type TradeOfferRow } from '@/lib/trade-offers'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type DeckRow = {
  id: number
  user_id: string
  name: string
  commander?: string | null
  format?: string | null
  price_total_usd_foil?: number | null
  image_url?: string | null
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

function matchTone(score: number) {
  if (score >= 80) return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
  if (score >= 65) return 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200'
  if (score >= 50) return 'border-amber-400/20 bg-amber-400/10 text-amber-200'
  return 'border-white/10 bg-white/5 text-zinc-200'
}

function toTradeMatchDeck(
  deck: DeckRow,
  cardsByDeck: Map<number, DeckCardForBracket[]>,
  profilesByUser: Map<string, PublicProfile>,
  summariesByUser: Map<string, ReputationSummary>
): TradeMatchDeck {
  const bracket = getCommanderBracketSummary(cardsByDeck.get(deck.id) ?? [])
  const ownerProfile = profilesByUser.get(deck.user_id)
  const ownerSummary = summariesByUser.get(deck.user_id)

  return {
    ...deck,
    format: normalizeDeckFormat(deck.format),
    bracket: bracket.bracket,
    bracketLabel: bracket.label,
    owner_display_name: ownerProfile?.display_name ?? null,
    owner_location_country: ownerProfile?.location_country ?? null,
    owner_can_ship_international: ownerProfile?.can_ship_international ?? null,
    owner_completed_trades_count: ownerSummary?.completed_trades_count ?? null,
  }
}

export default async function TradeMatchesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 pt-32 text-white">
        <AppHeader current="trade-matches" isSignedIn={false} />
        <section className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-8">
            <h1 className="text-3xl font-semibold">Trade Matches</h1>
            <p className="mt-3 text-zinc-400">
              Sign in to compare your decks against live marketplace listings and surface the closest fits.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/sign-in"
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
              >
                Sign in
              </Link>
              <Link
                href="/decks"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                Browse marketplace
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  const access = await getAdminAccessForUser(user)
  const { data: tradeOffersData } = await supabase
    .from('trade_offers')
    .select('id, offered_by_user_id, requested_user_id, offered_deck_id, requested_deck_id, cash_equalization_usd, status, message, accepted_trade_transaction_id, last_action_by_user_id, offered_by_viewed_at, requested_user_viewed_at, created_at, updated_at')
    .or(`offered_by_user_id.eq.${user.id},requested_user_id.eq.${user.id}`)
  const unreadTradeOffers = ((tradeOffersData ?? []) as TradeOfferRow[]).filter((offer) =>
    isUnreadTradeOffer(offer, user.id)
  ).length
  const unreadNotifications = await getUnreadNotificationsCount(supabase, user.id)

  const { data: myDeckRows } = await supabase
    .from('decks')
    .select('id, user_id, name, commander, format, price_total_usd_foil, image_url, color_identity')
    .eq('user_id', user.id)
    .order('id', { ascending: false })

  const myDecks = (myDeckRows ?? []) as DeckRow[]

  if (myDecks.length === 0) {
    return (
      <main className="min-h-screen bg-zinc-950 pt-32 text-white">
        <AppHeader
          current="trade-matches"
          isSignedIn
          isAdmin={access.isAdmin}
          unreadTradeOffers={unreadTradeOffers}
          unreadNotifications={unreadNotifications}
        />
        <section className="mx-auto max-w-4xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-8">
            <h1 className="text-3xl font-semibold">Trade Matches</h1>
            <p className="mt-3 text-zinc-400">
              Import or create at least one deck first so DeckSwap can compare your inventory against the marketplace.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/import-deck"
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
              >
                Import a deck
              </Link>
              <Link
                href="/create-deck"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                Create manually
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  const { data: otherDeckRows } = await supabase
    .from('decks')
    .select('id, user_id, name, commander, format, price_total_usd_foil, image_url, color_identity')
    .neq('user_id', user.id)
    .order('id', { ascending: false })
    .limit(80)

  const otherDecks = ((otherDeckRows ?? []) as DeckRow[]).filter(
    (deck) => Number(deck.price_total_usd_foil ?? 0) > 0
  )

  const allDeckIds = [...new Set([...myDecks, ...otherDecks].map((deck) => deck.id))]
  const { data: deckCardsRows } = allDeckIds.length
    ? await supabase
        .from('deck_cards')
        .select('deck_id, section, quantity, card_name, cmc, mana_cost')
        .in('deck_id', allDeckIds)
    : { data: [] as DeckCardForBracket[] }

  const cardsByDeck = new Map<number, DeckCardForBracket[]>()
  for (const card of ((deckCardsRows ?? []) as DeckCardForBracket[])) {
    const existing = cardsByDeck.get(card.deck_id) ?? []
    existing.push(card)
    cardsByDeck.set(card.deck_id, existing)
  }

  const allUserIds = [...new Set(otherDecks.map((deck) => deck.user_id).concat(user.id))]
  const [profilesResult, summariesResult] = await Promise.all([
    supabase.from('profiles').select('*').in('user_id', allUserIds),
    supabase.from('profile_reputation_summary').select('*').in('user_id', allUserIds),
  ])

  const profileSchemaMissing = [profilesResult.error?.message, summariesResult.error?.message].some(
    (message) => isProfileSchemaMissing(message)
  )

  const profilesByUser = new Map<string, PublicProfile>(
    ((profilesResult.data ?? []) as PublicProfile[]).map((profile) => [profile.user_id, profile])
  )
  const summariesByUser = new Map<string, ReputationSummary>(
    ((summariesResult.data ?? []) as ReputationSummary[]).map((summary) => [summary.user_id, summary])
  )

  const myProfile = profilesByUser.get(user.id)
  const myMatchDecks = myDecks.map((deck) =>
    toTradeMatchDeck(deck, cardsByDeck, profilesByUser, summariesByUser)
  )
  const candidateDecks = otherDecks.map((deck) =>
    toTradeMatchDeck(deck, cardsByDeck, profilesByUser, summariesByUser)
  )

  const matchGroups = myMatchDecks
    .map((myDeck) => {
      const matches = candidateDecks
        .filter((candidate) => candidate.user_id !== myDeck.user_id)
        .map((candidate) => ({
          deck: candidate,
          result: calculateTradeMatch(myDeck, candidate, {
            myCountry: myProfile?.location_country ?? null,
          }),
        }))
        .sort((a, b) => b.result.score - a.result.score)
        .slice(0, 4)

      return { myDeck, matches }
    })
    .sort(
      (a, b) =>
        (b.matches[0]?.result.score ?? 0) - (a.matches[0]?.result.score ?? 0)
    )

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader
        current="trade-matches"
        isSignedIn
        isAdmin={access.isAdmin}
        unreadTradeOffers={unreadTradeOffers}
        unreadNotifications={unreadNotifications}
      />

      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                Deck Swap
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Best fits for the decks you already own
              </h1>
              <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
                Mythiverse Exchange compares your inventory against live listings using value proximity, color identity,
                format fit, bracket closeness, and shipping context where available.
              </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Your decks compared</div>
              <div className="mt-2 text-3xl font-semibold">{myMatchDecks.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Marketplace candidates</div>
              <div className="mt-2 text-3xl font-semibold">{candidateDecks.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Strongest current fit</div>
              <div className="mt-2 text-3xl font-semibold text-emerald-300">
                {matchGroups[0]?.matches[0]?.result.score ?? 0}
              </div>
            </div>
          </div>

          {profileSchemaMissing && (
            <div className="mt-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm text-yellow-100">
              Profile and trust tables are missing or incomplete, so shipping and seller context are partially unavailable in match scoring.
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="space-y-8">
          {matchGroups.map(({ myDeck, matches }) => (
            <div key={myDeck.id} className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-sm uppercase tracking-[0.2em] text-emerald-300/80">
                    Your deck
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{myDeck.name}</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    {myDeck.commander || 'Commander not set'} | {getDeckFormatLabel(myDeck.format)} | ${Number(myDeck.price_total_usd_foil ?? 0).toFixed(2)}
                  </p>
                </div>
                <Link
                  href={`/decks/${myDeck.id}`}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10"
                >
                  View my deck
                </Link>
              </div>

              {matches.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-zinc-400">
                  No strong marketplace fits yet. Import more decks or wait for more listings to improve matching.
                </div>
              ) : (
                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  {matches.map(({ deck, result }) => (
                    <div key={`${myDeck.id}-${deck.id}`} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${matchTone(result.score)}`}>
                            Match Score {result.score}
                          </div>
                          <h3 className="mt-3 text-xl font-semibold text-white">{deck.name}</h3>
                          <p className="mt-1 text-sm text-zinc-400">
                            {deck.commander || 'Commander not set'} | {getDeckFormatLabel(deck.format)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Value</div>
                          <div className="mt-1 text-lg font-semibold text-emerald-300">
                            ${Number(deck.price_total_usd_foil ?? 0).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-300">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          {deck.bracketLabel ?? 'Bracket pending'}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          Gap ${result.valueGapUsd.toFixed(2)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          {Math.round(result.valueGapPercent * 100)}% apart
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          {result.otherColorCode}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-zinc-400">
                        {result.reasons.slice(0, 3).map((reason) => (
                          <p key={reason}>{reason}</p>
                        ))}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          href={`/decks/${deck.id}`}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10"
                        >
                          View listing
                        </Link>
                        <Link
                          href={`/trade-offers/propose?deckId=${deck.id}`}
                          className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
                        >
                          Propose trade
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
