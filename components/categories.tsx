"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

type CategoryCounts = {
  bracketTwoOrLower: number
  upgraded: number
  optimizedPlus: number
  tokenReady: number
  highValue: number
  fullInventory: number
}

export function Categories({ counts }: { counts: CategoryCounts }) {
  const categories = [
    {
      name: "Bracket 1-2",
      count: counts.bracketTwoOrLower,
      description: "Lower-pressure pods and straightforward Commander shells",
      chips: ["Casual", "Table-ready"],
    },
    {
      name: "Bracket 3",
      count: counts.upgraded,
      description: "Upgraded lists with sharper lines and a few premium swings",
      chips: ["Upgraded", "Popular"],
    },
    {
      name: "Bracket 4-5",
      count: counts.optimizedPlus,
      description: "Optimized and competitive decks for stronger pods",
      chips: ["Optimized", "Fast starts"],
    },
    {
      name: "Token Ready",
      count: counts.tokenReady,
      description: "Decks that also bring along their token inventory",
      chips: ["Token suite", "Sleeve friendly"],
    },
    {
      name: "$300+ Value",
      count: counts.highValue,
      description: "Higher-end listings where pricing matters more before a trade",
      chips: ["Premium", "High value"],
    },
    {
      name: "Full Inventory",
      count: counts.fullInventory,
      description: "Decks with enough tracked cards and tokens to feel complete on entry",
      chips: ["100+ cards", "Detailed"],
    },
  ]

  return (
    <section className="bg-secondary/30 py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Browse by Deck Profile
            </h2>
            <p className="mt-2 text-muted-foreground">
              Inventory categories that reflect the actual marketplace instead of placeholder archetypes
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <button
              key={category.name}
              className="group flex items-center justify-between rounded-xl border border-border bg-card p-6 text-left transition-all hover:border-primary/50 hover:bg-card/80"
            >
              <div>
                <h3 className="font-semibold text-foreground">{category.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {category.description}
                </p>
                <p className="mt-2 text-xs text-primary">{category.count.toLocaleString()} decks</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {category.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button variant="outline" size="lg" asChild>
            <Link href="/decks">Open Marketplace</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
