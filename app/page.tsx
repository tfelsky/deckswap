import { Suspense } from "react"
import Link from "next/link"
import AuthCodeExchange from "@/components/auth-code-exchange"
import { HomepageColorChooser } from "@/components/homepage-color-chooser"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeaturedDeckShelf, FeaturedDecks } from "@/components/featured-decks"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"
import { TradeEconomicsSection } from "@/components/trade-economics-section"
import { getCommanderBracketSummary } from "@/lib/commander/brackets"
import {
  colorIdentityCode,
  FIVE_COLOR_FILTERS,
  FOUR_COLOR_FILTERS,
  getColorIdentityLabel,
  MONO_COLOR_FILTERS,
  PAIR_COLOR_FILTERS,
  TRI_COLOR_FILTERS,
} from "@/lib/decks/color-identity"
import { getDeckMarketingChips } from "@/lib/decks/marketing"
import { isInventoryStatusPublic } from "@/lib/decks/inventory-status"
import { createPublicClient } from "@/lib/supabase/public"

export const revalidate = 300

type LandingDeck = {
  id: number
  name?: string
  commander?: string | null
  price_total_usd_foil?: number | null
  image_url?: string | null
  commander_count?: number | null
  mainboard_count?: number | null
  token_count?: number | null
  color_identity?: string[] | null
  is_sleeved?: boolean | null
  is_boxed?: boolean | null
  is_sealed?: boolean | null
  is_complete_precon?: boolean | null
  is_listed_for_trade?: boolean | null
  inventory_status?: string | null
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

const COLOR_FILTER_FLAVOR: Record<string, string> = {
  W: "Order, discipline, and table-wide structure.",
  U: "Cards, control, and patient precision.",
  B: "Ambition, sacrifice, and graveyard leverage.",
  R: "Speed, chaos, and explosive pressure.",
  G: "Ramp, creatures, and overwhelming board presence.",
  C: "Artifacts, utility, and identity outside the pie.",
  WU: "Azorius style: rules, tempo, and clean answers.",
  UB: "Dimir style: secrets, graveyards, and inevitability.",
  BR: "Rakdos style: aggression, spectacle, and damage.",
  RG: "Gruul style: pressure, power, and combat.",
  GW: "Selesnya style: go-wide boards and resilient growth.",
  WB: "Orzhov style: draining value and recursion.",
  UR: "Izzet style: spells, velocity, and clever lines.",
  BG: "Golgari style: attrition, counters, and the graveyard.",
  RW: "Boros style: attack steps, equipment, and tempo.",
  GU: "Simic style: counters, cards, and scaling engines.",
  WUB: "Esper style: precision, artifacts, and long-game control.",
  UBR: "Grixis style: ruthless value and spell-driven pressure.",
  BRG: "Jund style: removal, threats, and raw efficiency.",
  RGW: "Naya style: creature pressure with broad board presence.",
  GWU: "Bant style: clean value, protection, and balance.",
  WBR: "Mardu style: aggression, sacrifice, and decisive swings.",
  URG: "Temur style: velocity, ramp, and oversized threats.",
  BGW: "Abzan style: counters, recursion, and staying power.",
  RWU: "Jeskai style: tempo, prowess, and layered interaction.",
  GUB: "Sultai style: resources, recursion, and grind.",
  WUBR: "Everything but green: interaction, artifacts, and stack play.",
  UBRG: "Everything but white: velocity, greed, and pressure.",
  BRGW: "Everything but blue: combat, removal, and board force.",
  RGWU: "Everything but black: ramp, tempo, and layered value.",
  GWUB: "Everything but red: control, resilience, and inevitability.",
  WUBRG: "All five colors: access, ambition, and full-spectrum nonsense.",
}

function readColorFilter(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate?.trim().toUpperCase() || null
}

function countByColorCode(decks: Array<{ color_identity?: string[] | null }>) {
  const counts = new Map<string, number>()

  for (const deck of decks) {
    const code = colorIdentityCode(deck.color_identity)
    counts.set(code, (counts.get(code) ?? 0) + 1)
  }

  return counts
}

function toDeckShelfCard(
  deck: {
    id: number
    name?: string
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
    is_sealed?: boolean | null
    is_complete_precon?: boolean | null
    is_listed_for_trade?: boolean | null
    box_type?: string | null
  }
) {
  return {
    id: deck.id,
    name: deck.name ?? "Unnamed deck",
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

function HomePageSkeleton() {
  return (
    <div className="space-y-10 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="deckswap-glass rounded-[2rem] p-6 md:p-8">
          <div className="h-8 w-48 rounded-full bg-white/8" />
          <div className="mt-5 h-10 max-w-2xl rounded-2xl bg-white/8" />
          <div className="mt-4 h-5 max-w-3xl rounded-xl bg-white/6" />
          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-32 rounded-2xl border border-border bg-white/4" />
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:px-8 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-96 rounded-3xl border border-border bg-white/4" />
        ))}
      </div>
    </div>
  )
}

async function DeferredHomeSections({ selectedColor }: { selectedColor: string | null }) {
  const supabase = createPublicClient()

  const [{ data: decksData }, { data: tradeOffersData }, { data: deckCommentsData }] =
    await Promise.all([
      supabase
        .from("decks")
        .select(
          "id, name, commander, price_total_usd_foil, image_url, commander_count, mainboard_count, token_count, color_identity, is_sleeved, is_boxed, is_sealed, is_complete_precon, is_listed_for_trade, inventory_status, box_type"
        )
        .order("id", { ascending: false }),
      supabase
        .from("trade_offers")
        .select("id, offered_deck_id, requested_deck_id, status, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("deck_comments").select("id, deck_id"),
    ])

  const decks = (decksData ?? []) as LandingDeck[]
  const deckIds = decks.map((deck) => deck.id)
  const { data: deckCardsData } = deckIds.length
    ? await supabase
        .from("deck_cards")
        .select("deck_id, section, quantity, card_name, cmc, mana_cost")
        .in("deck_id", deckIds)
    : { data: [] as LandingDeckCard[] }

  const cardsByDeck = new Map<number, LandingDeckCard[]>()

  for (const card of (deckCardsData ?? []) as LandingDeckCard[]) {
    const existing = cardsByDeck.get(card.deck_id) ?? []
    existing.push(card)
    cardsByDeck.set(card.deck_id, existing)
  }

  const publicDecks = decks.filter((deck) => isInventoryStatusPublic(deck.inventory_status))
  const deckViews = publicDecks.map((deck) => {
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
  const featuredDecks = [...filteredDeckViews]
    .sort(
      (a, b) =>
        Number(b.price_total_usd_foil ?? 0) - Number(a.price_total_usd_foil ?? 0)
    )
    .slice(0, 4)
    .map(toDeckShelfCard)
  const latestDecks = [...filteredDeckViews].slice(0, 4).map(toDeckShelfCard)

  const tradeOffers = (tradeOffersData ?? []) as TradeOfferRow[]
  const deckComments = (deckCommentsData ?? []) as DeckCommentRow[]
  const activeTradeOffers = tradeOffers.filter((offer) => offer.status === "pending")
  const acceptedTradeOffers = tradeOffers.filter((offer) => offer.status === "accepted")
  const auctionCandidates = [...filteredDeckViews]
    .filter((deck) => Number(deck.price_total_usd_foil ?? 0) >= 150)
    .sort((a, b) => Number(b.price_total_usd_foil ?? 0) - Number(a.price_total_usd_foil ?? 0))
    .slice(0, 3)
  const highestValueDecks = [...featuredDecks]
  const auctionWatchDecks = auctionCandidates.map(toDeckShelfCard)
  const recentCommentedDecks = [...new Set(deckComments.map((comment) => comment.deck_id))]
    .map((deckId) => filteredDeckViews.find((deck) => deck.id === deckId))
    .filter(Boolean)

  return (
    <>
      <section className="pb-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="deckswap-glass relative z-10 rounded-[1.75rem] px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                  <span className="text-sm font-semibold text-primary">WUBRG</span>
                </div>
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary/75">
                    Color Chooser
                  </div>
                  <h2 className="mt-1 text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    Jump straight to the decks in your colors
                  </h2>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground sm:text-sm">
                    A tiny filter bar for browsing mana identity first.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedColor ? (
                  <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs text-foreground">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-primary/80">
                      Active Filter
                    </div>
                    <div className="mt-0.5 font-medium">{selectedColor}</div>
                  </div>
                ) : null}
                <Link
                  href="/"
                  className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                    selectedColor
                      ? "border-border bg-card text-foreground hover:bg-secondary"
                      : "border-border/70 bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  {selectedColor ? "Clear filter" : "Show all decks"}
                </Link>
              </div>
            </div>

            <HomepageColorChooser
              groups={[
                { id: "mono", title: "Mono", items: MONO_COLOR_FILTERS },
                { id: "pairs", title: "2 Color", items: PAIR_COLOR_FILTERS },
                { id: "tri", title: "3 Color", items: TRI_COLOR_FILTERS },
                { id: "four", title: "4 Color", items: FOUR_COLOR_FILTERS },
              ]}
              fiveColorItem={FIVE_COLOR_FILTERS[0]}
              selectedColor={selectedColor}
              colorCounts={Object.fromEntries(colorCounts)}
              manaSwatches={MANA_SWATCHES}
              colorFlavor={COLOR_FILTER_FLAVOR}
            />
          </div>
        </div>
      </section>

      <FeaturedDeckShelf
        id="latest-decks"
        className="pt-10 pb-20 sm:pt-12 sm:pb-24"
        decks={latestDecks}
        title="Latest Decks"
        subtitle="Fresh arrivals that just hit the marketplace"
        emptyTitle="No new decks yet"
        emptyDescription="As new decks go live, the latest arrivals will show up here first."
      />
      <FeaturedDecks decks={featuredDecks} />
      <FeaturedDeckShelf
        id="highest-value"
        decks={highestValueDecks}
        title="Highest Value Decks"
        subtitle="Complete decks with the most value on the table right now"
        emptyTitle="No premium decks yet"
        emptyDescription="As more premium decks are listed, this shelf will spotlight the collections worth watching first."
      />
      <FeaturedDeckShelf
        id="auctions"
        decks={auctionWatchDecks}
        title="Auction Watch"
        subtitle="Decks that may be better suited for a faster cash exit"
        emptyTitle="No auction-ready decks yet"
        emptyDescription="When more decks are better positioned for a quick sale, this shelf will surface them here."
      />

      <section className="py-12 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-border bg-card p-8">
              <div className="inline-flex rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                Market Momentum
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                See where deals are starting to happen
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
                Momentum matters. Open offers, accepted matches, and active discussion help you spot which decks are closest to moving.
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
                Fast Sale Option
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                Need to move a deck faster?
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Start by maximizing value through DeckSwap, move to Buy It Now for a direct sale, and use auction when speed matters most and you want the market to decide.
              </p>

              <div className="mt-6 space-y-3">
                {auctionCandidates.length > 0 ? (
                  auctionCandidates.map((deck) => (
                    <Link
                      key={deck.id}
                      href="/auctions"
                      className="block rounded-2xl border border-border bg-background/80 px-4 py-4 text-sm hover:bg-secondary"
                    >
                      <div className="font-medium text-foreground">{deck.name ?? "Unnamed deck"}</div>
                      <div className="mt-1 text-muted-foreground">
                        {deck.commander || "Commander not set"} | {deck.colorLabel} | ${Number(deck.price_total_usd_foil ?? 0).toFixed(2)}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-border bg-background/80 px-4 py-4 text-sm text-muted-foreground">
                    As more decks fit a faster-sale strategy, they will show up here.
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
                Buyer Interest
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                Decks already getting attention
              </h2>
              <div className="mt-6 space-y-3">
                {recentCommentedDecks.length > 0 ? (
                  recentCommentedDecks.slice(0, 3).map((deck) => (
                    <Link
                      key={deck!.id}
                      href={`/decks/${deck!.id}`}
                      className="block rounded-2xl border border-border bg-secondary/30 px-4 py-4 hover:bg-secondary"
                    >
                      <div className="font-medium text-foreground">{deck!.name ?? "Unnamed deck"}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {deck!.commander || "Commander not set"} | {deck!.colorLabel} | {deck!.bracket.label}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-border bg-secondary/30 px-4 py-4 text-sm text-muted-foreground">
                    As buyers and traders start asking questions, this section will highlight the decks pulling them in.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-8">
              <div className="inline-flex rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                Pick Your Path
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                Start where the outcome looks best
              </h2>
              <div className="mt-6 grid gap-3">
                <Link href="/import-deck" className="rounded-2xl border border-border bg-secondary/30 px-5 py-4 hover:bg-secondary">
                  <div className="font-medium text-foreground">Import a deck</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Turn a deck list into a polished listing that is ready to attract buyers and trade offers.
                  </div>
                </Link>
                <Link href="/decks" className="rounded-2xl border border-border bg-secondary/30 px-5 py-4 hover:bg-secondary">
                  <div className="font-medium text-foreground">Browse featured decks</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Discover complete decks with clearer value, stronger context, and better buying confidence.
                  </div>
                </Link>
                <Link href="/trade-offers" className="rounded-2xl border border-border bg-secondary/30 px-5 py-4 hover:bg-secondary">
                  <div className="font-medium text-foreground">Review trade offers</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Protect more value by moving strong deck-for-deck matches toward a confident close.
                  </div>
                </Link>
                <Link href="/auctions" className="rounded-2xl border border-border bg-secondary/30 px-5 py-4 hover:bg-secondary">
                  <div className="font-medium text-foreground">View live auctions</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    See active listings and the faster-sale lane without surfacing an old prototype page.
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TradeEconomicsSection />
      <CTASection />
    </>
  )
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = createPublicClient()
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const selectedColor = readColorFilter(resolvedSearchParams.color)

  const [{ data: decksData }, { data: tradeOffersData }, { data: deckCommentsData }] =
    await Promise.all([
      supabase
        .from("decks")
        .select("id, price_total_usd_foil, commander_count, mainboard_count, token_count, inventory_status"),
      supabase.from("trade_offers").select("id"),
      supabase.from("deck_comments").select("id"),
    ])

  const publicDecks = ((decksData ?? []) as LandingDeck[]).filter((deck) =>
    isInventoryStatusPublic(deck.inventory_status)
  )

  const inventory = {
    liveDecks: publicDecks.length,
    tokenReadyDecks: publicDecks.filter((deck) => Number(deck.token_count ?? 0) > 0).length,
    topValue:
      publicDecks.length > 0
        ? Math.max(...publicDecks.map((deck) => Number(deck.price_total_usd_foil ?? 0)))
        : 0,
    totalTrackedCards: publicDecks.reduce(
      (sum, deck) =>
        sum +
        Number(deck.commander_count ?? 0) +
        Number(deck.mainboard_count ?? 0) +
        Number(deck.token_count ?? 0),
      0
    ),
    tradeOffers: (tradeOffersData ?? []).length,
    deckComments: (deckCommentsData ?? []).length,
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <AuthCodeExchange />
        <HeroSection inventory={inventory} />
        <Suspense fallback={<HomePageSkeleton />}>
          <DeferredHomeSections selectedColor={selectedColor} />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
