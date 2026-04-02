"use client"

import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

const categories = [
  {
    name: "Limited Editions",
    count: 1243,
    description: "Rare and numbered releases",
  },
  {
    name: "Art Series",
    count: 856,
    description: "Decks featuring unique artwork",
  },
  {
    name: "Vintage & Classic",
    count: 2341,
    description: "Timeless designs from the past",
  },
  {
    name: "Magician Decks",
    count: 678,
    description: "Perfect for card magic",
  },
  {
    name: "Luxury & Premium",
    count: 423,
    description: "High-end collector pieces",
  },
  {
    name: "Kickstarter Exclusives",
    count: 512,
    description: "Crowdfunded originals",
  },
]

export function Categories() {
  return (
    <section className="bg-secondary/30 py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Browse by Category
            </h2>
            <p className="mt-2 text-muted-foreground">
              Find decks that match your collecting style
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
          <Button variant="outline" size="lg">
            View All Categories
          </Button>
        </div>
      </div>
    </section>
  )
}
