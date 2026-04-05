import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Gavel, Swords, Zap } from "lucide-react"

type FeaturedDeck = {
  id: number
  name: string
  commander: string
  value: number
  imageUrl: string | null
  bracketLabel: string
  gameChangerCount: number
  totalCards: number
  tokenCount: number
  colorLabel: string
  colorCode: string
  marketingChips: string[]
}

export function FeaturedDecks({ decks }: { decks: FeaturedDeck[] }) {
  return <FeaturedDeckShelf decks={decks} />
}

type FeaturedDeckShelfProps = {
  decks: FeaturedDeck[]
  id?: string
  title?: string
  subtitle?: string
  emptyTitle?: string
  emptyDescription?: string
}

export function FeaturedDeckShelf({
  decks,
  id = "decks",
  title = "Marketplace Snapshot",
  subtitle = "A quick read on live decks worth opening first",
  emptyTitle = "No live inventory yet",
  emptyDescription = "Import the first deck and start shaping the marketplace.",
}: FeaturedDeckShelfProps) {
  return (
    <section id={id} className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {subtitle}
            </p>
          </div>
          <Button variant="ghost" className="gap-2" asChild>
            <Link href="/decks">
              View All Decks
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {decks.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
            <h3 className="text-xl font-semibold text-foreground">{emptyTitle}</h3>
            <p className="mt-2 text-muted-foreground">
              {emptyDescription}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
                <Link href="/import-deck">Import Deck</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/create-deck">Create Manually</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {decks.map((deck) => (
              <Card
                key={deck.id}
                className="group overflow-hidden border-border bg-card transition-all duration-300 hover:border-primary/50"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                  {deck.imageUrl ? (
                    <img
                      src={deck.imageUrl}
                      alt={deck.name}
                      className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(82,255,178,0.16),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(255,196,88,0.12),transparent_40%)]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-between p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-medium text-white">
                        {deck.bracketLabel}
                      </div>
                      <div className="rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white">
                        ${deck.value.toFixed(0)}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                        {deck.gameChangerCount} Game Changer{deck.gameChangerCount === 1 ? "" : "s"}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-300">
                          {[deck.colorCode, deck.colorLabel].join(" | ")}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          {deck.commander}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{deck.name}</h3>
                      <p className="text-sm text-muted-foreground">{deck.commander}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">{deck.totalCards}</p>
                      <div className="text-sm text-muted-foreground">cards tracked</div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border bg-secondary/50 px-3 py-1">
                      {deck.tokenCount} token{deck.tokenCount === 1 ? "" : "s"}
                    </span>
                    {deck.marketingChips.map((chip) => (
                      <span
                        key={`${deck.id}-${chip}`}
                        className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-700 dark:text-emerald-300"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/decks/${deck.id}`}>
                        <Zap className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                    <Button size="sm" className="flex-1" asChild>
                      <Link href={`/trade-offers/propose?deckId=${deck.id}`}>
                        <Swords className="mr-2 h-4 w-4" />
                        Trade
                      </Link>
                    </Button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/auction-prototype?deckId=${deck.id}`}>
                        <Gavel className="mr-2 h-4 w-4" />
                        Auction
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
