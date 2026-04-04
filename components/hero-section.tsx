"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react"

const workflowCards = [
  {
    title: "Bring any list in fast",
    subtitle: "Paste text, upload a file, or start from a public deck link",
    accent: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    title: "Know what you have",
    subtitle: "See commander fit, color identity, and deck signals in one place",
    accent: "from-cyan-500/20 to-cyan-500/5",
  },
  {
    title: "Price decks with confidence",
    subtitle: "Track real card images, finishes, and blended deck value",
    accent: "from-amber-500/20 to-amber-500/5",
  },
  {
    title: "Trade with real context",
    subtitle: "List decks publicly with pricing, comments, and seller signals",
    accent: "from-rose-500/20 to-rose-500/5",
  },
]

type HeroSectionProps = {
  inventory: {
    liveDecks: number
    tokenReadyDecks: number
    topValue: number
    averageBracket: string
    totalTrackedCards: number
    tradeOffers: number
    deckComments: number
  }
}

export function HeroSection({ inventory }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-32">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Commander decks with pricing, trade intent, and cleaner trust signals
            </span>
          </div>

          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Trade decks with <span className="text-primary">real inventory and real intent</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            Swap full decks without losing the spread to a buylist. Import your list, see what it is
            worth, and move into trades or a faster sale path with far more context than a plain card total.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="min-w-[180px]" asChild>
              <Link href="/import-deck">
                Import a Deck
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="min-w-[180px]" asChild>
              <Link href="/decks">Browse Market</Link>
            </Button>
            <Button variant="outline" size="lg" className="min-w-[180px]" asChild>
              <Link href="/trade-offers">Trade Offers</Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Safer trade flow with escrow foundations
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
              Clear pricing tied to real deck inventory
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
              Seller signals, comments, and faster-sale options
            </div>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 sm:gap-16">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground sm:text-4xl">{inventory.liveDecks}</p>
              <p className="mt-1 text-sm text-muted-foreground">Live deck listings</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground sm:text-4xl">
                {inventory.totalTrackedCards}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Tracked cards and tokens</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground sm:text-4xl">
                Bracket {inventory.averageBracket}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Average marketplace bracket</p>
            </div>
          </div>
        </div>

        <div className="relative mt-20">
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflowCards.map((item) => (
              <div
                key={item.title}
                className="relative overflow-hidden rounded-2xl border border-border bg-card p-6"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.accent}`} />
                <div className="relative">
                  <div className="text-sm font-medium text-primary">{item.title}</div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-6 grid max-w-5xl gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card/80 p-5 text-left">
              <div className="text-xs uppercase tracking-[0.2em] text-primary/80">Tokens Included</div>
              <div className="mt-3 text-2xl font-semibold text-foreground">
                {inventory.tokenReadyDecks}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                listings already include tokens and helpers for a fuller deck picture.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card/80 p-5 text-left">
              <div className="text-xs uppercase tracking-[0.2em] text-primary/80">Trade Activity</div>
              <div className="mt-3 text-2xl font-semibold text-foreground">
                {inventory.tradeOffers}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                active offer opportunities already moving through the marketplace.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card/80 p-5 text-left">
              <div className="text-xs uppercase tracking-[0.2em] text-primary/80">Discussion</div>
              <div className="mt-3 text-2xl font-semibold text-foreground">
                {inventory.deckComments}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                public comments adding context, questions, and buying confidence.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
