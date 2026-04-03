import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { formatSupportsCommanderRules, getDeckFormatLabel, normalizeDeckFormat } from '@/lib/decks/formats'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type Deck = {
  id: number
  name: string
  commander?: string | null
  format?: string | null
  price_total_usd_foil?: number | null
  image_url?: string | null
}

type DeckCardForBracket = {
  deck_id: number
  section: 'commander' | 'mainboard' | 'token'
  quantity: number
  card_name: string
  cmc?: number | null
  mana_cost?: string | null
}

export default async function MyDecksPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <section className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-8">
            <h1 className="text-3xl font-semibold">My Decks</h1>
            <p className="mt-3 text-zinc-400">You need to sign in to view your decks.</p>

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
                Back to marketplace
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  const { data, error } = await supabase
    .from('decks')
    .select('id, name, commander, format, price_total_usd_foil, image_url')
    .eq('user_id', user.id)
    .order('id', { ascending: false })

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-400">My Decks Error</h1>
          <p className="mt-3 text-sm text-zinc-300">{error.message}</p>
        </div>
      </main>
    )
  }

  const decks = (data ?? []) as Deck[]
  const deckIds = decks.map((deck) => deck.id)

  const { data: deckCards } = deckIds.length
    ? await supabase
        .from('deck_cards')
        .select('deck_id, section, quantity, card_name, cmc, mana_cost')
        .in('deck_id', deckIds)
    : { data: [] as DeckCardForBracket[] }

  const cardsByDeck = new Map<number, DeckCardForBracket[]>()

  for (const card of ((deckCards ?? []) as DeckCardForBracket[])) {
    const existing = cardsByDeck.get(card.deck_id) ?? []
    existing.push(card)
    cardsByDeck.set(card.deck_id, existing)
  }

  const deckViews = decks.map((deck) => {
    const bracket = getCommanderBracketSummary(cardsByDeck.get(deck.id) ?? [])
    return { ...deck, bracket, format: normalizeDeckFormat(deck.format) }
  })

  const ratedDecks = deckViews.filter(
    (deck) => formatSupportsCommanderRules(deck.format) && deck.bracket.bracket != null
  )
  const averageBracket =
    ratedDecks.length > 0
      ? (
          ratedDecks.reduce(
            (sum, deck) => sum + (deck.bracket.bracket ?? 0),
            0
          ) / ratedDecks.length
        ).toFixed(1)
      : '0.0'
  const access = await getAdminAccessForUser(user)
  const isAdmin = access.isAdmin

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                Your Collection
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                My Decks
              </h1>

              <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
                View and manage the deck inventory you have listed in the marketplace across supported formats.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-400/15"
                >
                  Admin Dashboard
                </Link>
              )}

              <Link
                href="/create-deck"
                className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:opacity-90"
              >
                + Create Deck
              </Link>

              <Link
                href="/import-deck"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Import Deck
              </Link>

              <Link
                href="/settings/profile"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Profile Settings
              </Link>

              <Link
                href="/trade-offers"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Trade Offers
              </Link>

              <Link
                href="/decks"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Back to marketplace
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">My Listings</div>
              <div className="mt-2 text-3xl font-semibold">{deckViews.length}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Highest Value</div>
              <div className="mt-2 text-3xl font-semibold text-emerald-300">
                $
                {Math.max(
                  0,
                  ...deckViews.map((deck) => Number(deck.price_total_usd_foil ?? 0))
                ).toFixed(2)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Avg. Bracket</div>
              <div className="mt-2 text-3xl font-semibold">{averageBracket}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {deckViews.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <h3 className="text-xl font-semibold">No decks yet</h3>
            <p className="mt-2 text-zinc-400">You have not created any decks yet.</p>
            <Link
              href="/create-deck"
              className="mt-6 inline-block rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
            >
              Create your first deck
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {deckViews.map((deck) => (
              <article
                key={deck.id}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/80 transition duration-200 hover:border-emerald-400/30 hover:bg-zinc-900"
              >
                <Link href={`/decks/${deck.id}`} className="block">
                  <div className="relative aspect-[16/10] overflow-hidden border-b border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950">
                    {deck.image_url ? (
                      <>
                        <img
                          src={deck.image_url}
                          alt={deck.name}
                          className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
                        />

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5">
                          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                            {getDeckFormatLabel(deck.format)}
                          </div>
                          <div className="mt-2 text-2xl font-semibold text-white">
                            {deck.commander || deck.name}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full w-full items-end p-5">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                            {getDeckFormatLabel(deck.format)}
                          </div>
                          <div className="mt-2 text-2xl font-semibold text-white">
                            {deck.commander || deck.name}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                      {formatSupportsCommanderRules(deck.format)
                        ? deck.bracket.label
                        : getDeckFormatLabel(deck.format)}
                    </div>
                  </div>
                </Link>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-xl font-semibold tracking-tight">{deck.name}</h3>
                        <p className="mt-1 text-sm text-zinc-400">
                          {formatSupportsCommanderRules(deck.format)
                            ? `Commander: ${deck.commander || 'Not set'}`
                            : `Format: ${getDeckFormatLabel(deck.format)}`}
                        </p>
                    </div>

                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-right">
                      <div className="text-[10px] uppercase tracking-wide text-emerald-300/80">
                        Est. Value
                      </div>
                      <div className="text-lg font-semibold text-emerald-300">
                        ${Number(deck.price_total_usd_foil ?? 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                      {formatSupportsCommanderRules(deck.format)
                        ? deck.bracket.label
                        : getDeckFormatLabel(deck.format)}
                    </span>
                    {formatSupportsCommanderRules(deck.format) && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                        {deck.bracket.gameChangerCount} Game Changer
                        {deck.bracket.gameChangerCount === 1 ? '' : 's'}
                      </span>
                    )}
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                      Owned by You
                    </span>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <Link
                      href={`/decks/${deck.id}`}
                      className="flex-1 rounded-2xl bg-emerald-400 px-4 py-3 text-center text-sm font-medium text-zinc-950 hover:opacity-90"
                    >
                      View Deck
                    </Link>

                    <Link
                      href={`/my-decks/${deck.id}`}
                      className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-medium text-white hover:bg-white/10"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
