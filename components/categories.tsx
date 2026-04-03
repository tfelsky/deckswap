"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

const categories = [
  {
    name: "Battlecruiser",
    count: 3,
    description: "Lower-power pods and big-mana finishers",
  },
  {
    name: "Casual",
    count: 6,
    description: "Table-friendly lists with upgrade headroom",
  },
  {
    name: "High Power",
    count: 8,
    description: "Tuned lists with faster lines and dense interaction",
  },
  {
    name: "cEDH",
    count: 10,
    description: "Competitive pods, compact wins, and premium staples",
  },
  {
    name: "Partner Pair",
    count: 2,
    description: "Two-commander builds that validate as legal pairs",
  },
  {
    name: "Token Package",
    count: 14,
    description: "Decks that also track their attached token suite",
  },
]

export function Categories() {
  return (
    <section className="bg-secondary/30 py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Browse by Deck Profile
            </h2>
            <p className="mt-2 text-muted-foreground">
              These categories map to the data the app already stores and displays
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
