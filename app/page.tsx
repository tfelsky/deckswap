import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeaturedDecks } from "@/components/featured-decks"
import { TradeMatching } from "@/components/trade-matching"
import { HowItWorks } from "@/components/how-it-works"
import { Categories } from "@/components/categories"
import { Testimonials } from "@/components/testimonials"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"
import { getCommanderBracketSummary } from "@/lib/commander/brackets"
import { createClient } from "@/lib/supabase/server"

type LandingDeck = {
  id: number
  name: string
  commander?: string | null
  price_total_usd_foil?: number | null
  image_url?: string | null
  commander_count?: number | null
  mainboard_count?: number | null
  token_count?: number | null
}

type LandingDeckCard = {
  deck_id: number
  section: "commander" | "mainboard" | "token"
  quantity: number
  card_name: string
  cmc?: number | null
  mana_cost?: string | null
}

export default async function HomePage() {
  const supabase = await createClient()

  const { data: decksData } = await supabase
    .from("decks")
    .select(
      "id, name, commander, price_total_usd_foil, image_url, commander_count, mainboard_count, token_count"
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
    }
  })

  const ratedDecks = deckViews.filter((deck) => deck.bracket.bracket != null)
  const averageBracket =
    ratedDecks.length > 0
      ? Number(
          ratedDecks.reduce((sum, deck) => sum + Number(deck.bracket.bracket ?? 0), 0) /
            ratedDecks.length
        ).toFixed(1)
      : "0.0"

  const featuredDecks = [...deckViews]
    .sort(
      (a, b) =>
        Number(b.price_total_usd_foil ?? 0) - Number(a.price_total_usd_foil ?? 0)
    )
    .slice(0, 4)
    .map((deck) => ({
      id: deck.id,
      name: deck.name,
      commander: deck.commander ?? "Commander not set",
      value: Number(deck.price_total_usd_foil ?? 0),
      imageUrl: deck.image_url ?? null,
      bracketLabel: deck.bracket.label,
      gameChangerCount: deck.bracket.gameChangerCount,
      totalCards: deck.totalCards,
      tokenCount: Number(deck.token_count ?? 0),
    }))

  const inventory = {
    liveDecks: deckViews.length,
    tokenReadyDecks: deckViews.filter((deck) => Number(deck.token_count ?? 0) > 0).length,
    topValue:
      deckViews.length > 0
        ? Math.max(...deckViews.map((deck) => Number(deck.price_total_usd_foil ?? 0)))
        : 0,
    averageBracket,
    totalTrackedCards: deckViews.reduce((sum, deck) => sum + deck.totalCards, 0),
  }

  const categoryCounts = {
    bracketTwoOrLower: deckViews.filter(
      (deck) => deck.bracket.bracket != null && Number(deck.bracket.bracket) <= 2
    ).length,
    upgraded: deckViews.filter((deck) => Number(deck.bracket.bracket ?? 0) === 3).length,
    optimizedPlus: deckViews.filter((deck) => Number(deck.bracket.bracket ?? 0) >= 4).length,
    tokenReady: inventory.tokenReadyDecks,
    highValue: deckViews.filter((deck) => Number(deck.price_total_usd_foil ?? 0) >= 300).length,
    fullInventory: deckViews.filter((deck) => deck.totalCards >= 100).length,
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection inventory={inventory} />
        <FeaturedDecks decks={featuredDecks} />
        <TradeMatching />
        <HowItWorks />
        <Categories counts={categoryCounts} />
        <Testimonials />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
