import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeaturedDeckShelf, FeaturedDecks } from "@/components/featured-decks"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"
import { getCommanderBracketSummary } from "@/lib/commander/brackets"
import {
  colorIdentityCode,
  FOUR_COLOR_FILTERS,
  getColorIdentityLabel,
  MONO_COLOR_FILTERS,
  PAIR_COLOR_FILTERS,
  TRI_COLOR_FILTERS,
  FIVE_COLOR_FILTERS,
} from "@/lib/decks/color-identity"
import { getDeckMarketingChips } from "@/lib/decks/marketing"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export const dynamic = 'force-dynamic'

type LandingDeck = {
  id: number
  name: string
  commander?: string | null
  price_total_usd_foil?: number | null
  image_url?: string | null
  commander_count?: number | null
  mainboard_count?: number | null
  token_count?: number | null
  color_identity?: string[] | null
  is_sleeved?: boolean | null
  is_boxed?: boolean | null
  box_type?: string | null
}

type LandingDeckCard = {
  deck_id: number
  section: "commander" | "mainboard" | "token"
  quantity: number
  card_name: string
  cmc?: number | null
  mana_cost?: string | null
}

type TradeOfferRow = {
  id: number
  offered_deck_id: number
  requested_deck_id: number
  status: string
  created_at?: string | null
}

type DeckCommentRow = {
  id: number
  deck_id: number
}

const MANA_SWATCHES: Record<string, string> = {
  W: "bg-[linear-gradient(135deg,#f7f0c7,#eadf9d)] text-zinc-950",
  U: "bg-[linear-gradient(135deg,#8fc7ff,#4b88d9)] text-white",
  B: "bg-[linear-gradient(135deg,#726f7f,#2c2933)] text-white",
  R: "bg-[linear-gradient(135deg,#ff9b73,#d74d37)] text-white",
  G: "bg-[linear-gradient(135deg,#9dd98e,#3f8b54)] text-white",
  C: "bg-[linear-gradient(135deg,#d6d4ce,#8f8b84)] text-zinc-950",
}

function readColorFilter(
  value: string | string[] | undefined
) {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate?.trim().toUpperCase() || null
}

function countByColorCode(
  decks: Array<{ color_identity?: string[] | null }>
) {
  const counts = new Map<string, number>()

  for (const deck of decks) {
    const code = colorIdentityCode(deck.color_identity)
    counts.set(code, (counts.get(code) ?? 0) + 1)
  }

  return counts
}

function getColorSwatches(code: string) {
  if (code === "C") return ["C"]
  return code.split("").filter(Boolean)
}

function toDeckShelfCard(
  deck: {
    id: number
    name: string
    commander?: string | null
    price_total_usd_foil?: number | null
    image_url?: string | null
    token_count?: number | null
    totalCards: number
    colorLabel: string
    colorCode: string
    bracket: {
      label: string
      gameChangerCount: number
    }
    is_sleeved?: boolean | null
    is_boxed?: boolean | null
    box_type?: string | null
  }
) {
  return {
    id: deck.id,
    name: deck.name,
    commander: deck.commander ?? "Commander not set",
    value: Number(deck.price_total_usd_foil ?? 0),
    imageUrl: deck.image_url ?? null,
    bracketLabel: deck.bracket.label,
    gameChangerCount: deck.bracket.gameChangerCount,
    totalCards: deck.totalCards,
    tokenCount: Number(deck.token_count ?? 0),
    colorLabel: deck.colorLabel,
    colorCode: deck.colorCode,
    marketingChips: getDeckMarketingChips(deck).slice(0, 3),
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const selectedColor = readColorFilter(resolvedSearchParams.color)

  const { data: decksData } = await supabase
    .from("decks")
    .select(
      "id, name, commander, price_total_usd_foil, image_url, commander_count, mainboard_count, token_count, color_identity, is_sleeved, is_boxed, box_type"
    )
    .order("id", { ascending: false })

  const decks = (decksData ?? []) as LandingDeck[]
  const deckIds = decks.map((deck) => deck.id)

  const { data: deckCardsData } = deckIds.length
    ? await supabase
        .from("deck_cards")
        .select("deck_id, section, quantity, card_name, cmc, mana_cost")
        .in("deck_id", deckIds)
    : { data: [] as LandingDeckCard[] }

  const { data: tradeOffersData } = await supabase
    .from("trade_offers")
    .select("id, offered_deck_id, requested_deck_id, status, created_at")
    .order("created_at", { ascending: false })

  const { data: deckCommentsData } = await supabase
    .from("deck_comments")
    .select("id, deck_id")

  const cardsByDeck = new Map<number, LandingDeckCard[]>()

  for (const card of ((deckCardsData ?? []) as LandingDeckCard[])) {
    const existing = cardsByDeck.get(card.deck_id) ?? []
    existing.push(card)
    cardsByDeck.set(card.deck_id, existing)
  }

  const deckViews = decks.map((deck) => {
    const bracket = getCommanderBracketSummary(cardsByDeck.get(deck.id) ?? [])
    const totalCards =
      Number(deck.commander_count ?? 0) +
      Number(deck.mainboard_count ?? 0) +
      Number(deck.token_count ?? 0)

    return {
      ...deck,
      bracket,
      totalCards,
      colorCode: colorIdentityCode(deck.color_identity),
      colorLabel: getColorIdentityLabel(deck.color_identity),
    }
  })

  const filteredDeckViews = selectedColor
    ? deckViews.filter((deck) => deck.colorCode === selectedColor)
    : deckViews
  const colorCounts = countByColorCode(deckViews)

  const ratedDecks = filteredDeckViews.filter((deck) => deck.bracket.bracket != null)
  const averageBracket =
    ratedDecks.length > 0
      ? Number(
          ratedDecks.reduce((sum, deck) => sum + Number(deck.bracket.bracket ?? 0), 0) /
            ratedDecks.length
        ).toFixed(1)
      : "0.0"

  const featuredDecks = [...filteredDeckViews]
    .sort(
      (a, b) =>
        Number(b.price_total_usd_foil ?? 0) - Number(a.price_total_usd_foil ?? 0)
    )
    .slice(0, 4)
    .map(toDeckShelfCard)

  const tradeOffers = (tradeOffersData ?? []) as TradeOfferRow[]
  const deckComments = (deckCommentsData ?? []) as DeckCommentRow[]
  const activeTradeOffers = tradeOffers.filter((offer) => offer.status === "pending")
  const acceptedTradeOffers = tradeOffers.filter((offer) => offer.status === "accepted")
  const auctionCandidates = [...filteredDeckViews]
    .filter((deck) => Number(deck.price_total_usd_foil ?? 0) >= 150)
    .sort((a, b) => Number(b.price_total_usd_foil ?? 0) - Number(a.price_total_usd_foil ?? 0))
    .slice(0, 3)
  const highestValueDecks = [...featuredDecks].slice(0, 4)
  const auctionWatchDecks = auctionCandidates.map(toDeckShelfCard)
  const recentCommentedDecks = [...new Set(deckComments.map((comment) => comment.deck_id))]
    .map((deckId) => filteredDeckViews.find((deck) => deck.id === deckId))
    .filter(Boolean)
    .slice(0, 3) as typeof deckViews

  const inventory = {
    liveDecks: filteredDeckViews.length,
    tokenReadyDecks: filteredDeckViews.filter((deck) => Number(deck.token_count ?? 0) > 0).length,
    topValue:
      filteredDeckViews.length > 0
        ? Math.max(...filteredDeckViews.map((deck) => Number(deck.price_total_usd_foil ?? 0)))
        : 0,
    averageBracket,
    totalTrackedCards: filteredDeckViews.reduce((sum, deck) => sum + deck.totalCards, 0),
    tradeOffers: tradeOffers.length,
    deckComments: deckComments.length,
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection inventory={inventory} />
        <section className="pb-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="deckswap-glass rounded-[2rem] p-6 md:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.24em] text-primary/80">
                    Deck Marketplace Filters
                  </div>
                  <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                    Find decks that match the colors you actually want to play
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Browse mono-color staples, guild decks, shard and wedge builds, four-color piles,
                    and five-color lists without digging through everything at once.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {selectedColor && (
                    <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground">
                      <div className="text-xs uppercase tracking-[0.18em] text-primary/80">
                        Active Filter
                      </div>
                      <div className="mt-1 font-medium">{selectedColor}</div>
                    </div>
                  )}
                  <Link
                    href="/"
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                      selectedColor
                        ? "border-border bg-card text-foreground hover:bg-secondary"
                        : "border-border/70 bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {selectedColor ? "Clear filter" : "Show all decks"}
                  </Link>
                </div>
              </div>

              <div className="mt-8 space-y-6">
                {[
                  { title: "Mono / Colorless", items: MONO_COLOR_FILTERS, collapsible: false },
                  { title: "Color Pairs", items: PAIR_COLOR_FILTERS, collapsible: true },
                  { title: "Three-Color", items: TRI_COLOR_FILTERS, collapsible: true },
                  { title: "Four-Color", items: FOUR_COLOR_FILTERS, collapsible: true },
                  { title: "Five-Color", items: FIVE_COLOR_FILTERS, collapsible: true },
                ].map((group) => {
                  const content = (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {group.items.map((item) => {
                        const active = selectedColor === item.code
                        const count = colorCounts.get(item.code) ?? 0

                        return (
                          <Link
                            key={item.code}
                            href={`/?color=${item.code}`}
                            className={`group rounded-2xl border px-3 py-3 transition ${
                              active
                                ? "border-primary/30 bg-[linear-gradient(135deg,rgba(71,202,157,0.22),rgba(234,190,94,0.12))] shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
                                : "border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] hover:border-primary/20 hover:bg-[linear-gradient(135deg,rgba(71,202,157,0.12),rgba(234,190,94,0.06))]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                                  {item.code}
                                </div>
                                <div className="mt-1.5 text-sm font-semibold text-foreground sm:text-base">
                                  {item.label}
                                </div>
                              </div>
                              <div className="rounded-full border border-white/10 bg-black/15 px-2.5 py-0.5 text-[11px] text-foreground/80">
                                {count}
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-1.5">
                              {getColorSwatches(item.code).map((symbol) => (
                                <span
                                  key={`${item.code}-${symbol}`}
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 text-[10px] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] ${MANA_SWATCHES[symbol]}`}
                                >
                                  {symbol}
                                </span>
                              ))}
                            </div>

                            <div className="mt-3 text-xs text-muted-foreground transition group-hover:text-foreground/80">
                              Browse {item.label.toLowerCase()} decks now live on Mythiverse Exchange.
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )

                  return group.collapsible ? (
                    <details key={group.title} className="rounded-2xl border border-border/70 bg-black/10 px-4 py-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                        <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          {group.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {group.items.reduce((sum, item) => sum + (colorCounts.get(item.code) ?? 0), 0)} decks
                        </span>
                      </summary>
                      {content}
                    </details>
                  ) : (
                    <div key={group.title}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          {group.title}
                        </div>
                        <div className="hidden text-xs text-muted-foreground sm:block">
                          {group.items.reduce((sum, item) => sum + (colorCounts.get(item.code) ?? 0), 0)} decks
                        </div>
                      </div>
                      {content}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
        <FeaturedDecks decks={featuredDecks} />
        <FeaturedDeckShelf
          id="highest-value"
          decks={highestValueDecks}
          title="Highest Value Decks"
          subtitle="Premium inventory with the biggest totals in the marketplace right now"
          emptyTitle="No premium decks yet"
          emptyDescription="As higher-value decks are listed, this shelf will highlight the top end of the market."
        />
        <FeaturedDeckShelf
          id="auctions"
          decks={auctionWatchDecks}
          title="Auction Watch"
          subtitle="Decks that look like strong candidates for a faster sale path"
          emptyTitle="No auction-ready decks yet"
          emptyDescription="When more decks cross the higher-value threshold, auction candidates will show up here."
        />

        <section className="py-12 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-border bg-card p-8">
                <div className="inline-flex rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                  Live Market Activity
                </div>
                <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                  See where the market is moving
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
                  Live listings matter most when you can also see open trade intent, active discussion,
                  and which decks may be ready to move faster.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-secondary/30 p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-primary/80">Pending offers</div>
                    <div className="mt-3 text-3xl font-semibold text-foreground">{activeTradeOffers.length}</div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Open opportunities waiting on the next yes, no, or counter.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-secondary/30 p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-primary/80">Accepted offers</div>
                    <div className="mt-3 text-3xl font-semibold text-foreground">{acceptedTradeOffers.length}</div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Trades already moving past the offer stage.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-secondary/30 p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-primary/80">Deck comments</div>
                    <div className="mt-3 text-3xl font-semibold text-foreground">{deckComments.length}</div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Extra context helping buyers and traders move with confidence.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 to-transparent p-8">
                <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-amber-300">
                  Auction Path
                </div>
                <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                  Need to move a deck faster?
                </h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Some decks are better suited to a quicker sale than a long trade conversation.
                  Start with reserve or no-reserve auction planning and compare the likely outcome.
                </p>

                <div className="mt-6 space-y-3">
                  {auctionCandidates.length > 0 ? (
                    auctionCandidates.map((deck) => (
                      <Link
                        key={deck.id}
                        href={`/auction-prototype?deckId=${deck.id}`}
                        className="block rounded-2xl border border-border bg-background/80 px-4 py-4 text-sm hover:bg-secondary"
                      >
                        <div className="font-medium text-foreground">{deck.name}</div>
                        <div className="mt-1 text-muted-foreground">
                          {deck.commander || "Commander not set"} | {deck.colorLabel} | ${Number(deck.price_total_usd_foil ?? 0).toFixed(2)}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-border bg-background/80 px-4 py-4 text-sm text-muted-foreground">
                      As more higher-value decks are listed, strong auction candidates will surface here.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-12 sm:pb-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-border bg-card p-8">
                <div className="inline-flex rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                  Recent Discussion
                </div>
                <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                  Decks getting attention
                </h2>
                <div className="mt-6 space-y-3">
                  {recentCommentedDecks.length > 0 ? (
                    recentCommentedDecks.map((deck) => (
                      <Link
                        key={deck.id}
                        href={`/decks/${deck.id}`}
                        className="block rounded-2xl border border-border bg-secondary/30 px-4 py-4 hover:bg-secondary"
                      >
                        <div className="font-medium text-foreground">{deck.name}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {deck.commander || "Commander not set"} | {deck.colorLabel} | {deck.bracket.label}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-border bg-secondary/30 px-4 py-4 text-sm text-muted-foreground">
                      As comments come in, this section will highlight decks drawing real interest.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-8">
                <div className="inline-flex rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                  Start Here
                </div>
                <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                  Choose the path that fits what you want to do
                </h2>
                <div className="mt-6 grid gap-3">
                  <Link
                    href="/import-deck"
                    className="rounded-2xl border border-border bg-secondary/30 px-5 py-4 hover:bg-secondary"
                  >
                    <div className="font-medium text-foreground">Import a deck</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Turn a list into a priced, shareable deck page in minutes.
                    </div>
                  </Link>
                  <Link
                    href="/decks"
                    className="rounded-2xl border border-border bg-secondary/30 px-5 py-4 hover:bg-secondary"
                  >
                    <div className="font-medium text-foreground">Browse featured decks</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Explore live listings with pricing, seller context, and trade potential.
                    </div>
                  </Link>
                  <Link
                    href="/trade-offers"
                    className="rounded-2xl border border-border bg-secondary/30 px-5 py-4 hover:bg-secondary"
                  >
                    <div className="font-medium text-foreground">Review trade offers</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Negotiate, counter, and move strong matches toward a safer close.
                    </div>
                  </Link>
                  <Link
                    href="/auction-prototype"
                    className="rounded-2xl border border-border bg-secondary/30 px-5 py-4 hover:bg-secondary"
                  >
                    <div className="font-medium text-foreground">Test the auction sale path</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Compare reserve and no-reserve outcomes for a quicker exit.
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
