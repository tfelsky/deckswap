"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Swords, Zap } from "lucide-react"

const decks = [
  {
    id: 1,
    name: "Alela Artifacts",
    commander: "Alela, Artful Provocateur",
    value: 180,
    category: "Esper Tokens",
    power: "7",
    status: "Trade Ready",
  },
  {
    id: 2,
    name: "Korvold Treasure Storm",
    commander: "Korvold, Fae-Cursed King",
    value: 420,
    category: "Jund Value",
    power: "8",
    status: "High Demand",
  },
  {
    id: 3,
    name: "Niv-Mizzet Curiosity",
    commander: "Niv-Mizzet, Parun",
    value: 260,
    category: "Izzet Combo",
    power: "9",
    status: "Combo Shell",
  },
  {
    id: 4,
    name: "Yuriko Tempo Cuts",
    commander: "Yuriko, the Tiger's Shadow",
    value: 310,
    category: "Dimir Ninjas",
    power: "8",
    status: "Meta Call",
  },
]

export function FeaturedDecks() {
  return (
    <section id="decks" className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Marketplace Snapshot
            </h2>
            <p className="mt-2 text-muted-foreground">
              Representative Commander listings that match the actual product flow
            </p>
          </div>
          <Button variant="ghost" className="gap-2" asChild>
            <Link href="/decks">
              View All Decks
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {decks.map((deck) => (
            <Card
              key={deck.id}
              className="group overflow-hidden border-border bg-card transition-all duration-300 hover:border-primary/50"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(82,255,178,0.16),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(255,196,88,0.12),transparent_40%)]" />
                <div className="absolute inset-0 flex flex-col justify-between p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Badge variant="outline" className="bg-background/60">
                      {deck.category}
                    </Badge>
                    <div className="rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-foreground">
                      Power {deck.power}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {deck.status}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Commander
                      </p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
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
                    <p className="text-lg font-bold text-foreground">${deck.value}</p>
                    <div className="text-sm text-muted-foreground">Est. value</div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href="/decks">
                      <Zap className="mr-2 h-4 w-4" />
                      Browse
                    </Link>
                  </Button>
                  <Button size="sm" className="flex-1" asChild>
                    <Link href="/import-deck">
                      <Swords className="mr-2 h-4 w-4" />
                      Import
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
