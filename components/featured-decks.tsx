"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, ShoppingCart, ArrowRight } from "lucide-react"

const decks = [
  {
    id: 1,
    name: "Celestial Nights",
    designer: "Card Artistry Co.",
    price: 24.99,
    image: "/celestial-deck.jpg",
    category: "Limited Edition",
    rating: 4.9,
    inStock: true,
  },
  {
    id: 2,
    name: "Midnight Casino",
    designer: "Royal Flush Studios",
    price: 18.99,
    image: "/midnight-deck.jpg",
    category: "Classic",
    rating: 4.7,
    inStock: true,
  },
  {
    id: 3,
    name: "Botanical Dreams",
    designer: "Nature Press",
    price: 32.99,
    image: "/botanical-deck.jpg",
    category: "Art Series",
    rating: 4.8,
    inStock: false,
  },
  {
    id: 4,
    name: "Cyber Punk 2084",
    designer: "Future Decks",
    price: 28.99,
    image: "/cyber-deck.jpg",
    category: "Collector",
    rating: 4.9,
    inStock: true,
  },
  {
    id: 5,
    name: "Ancient Myths",
    designer: "Legends Playing Co.",
    price: 35.99,
    image: "/ancient-deck.jpg",
    category: "Premium",
    rating: 5.0,
    inStock: true,
  },
  {
    id: 6,
    name: "Minimalist White",
    designer: "Pure Cards",
    price: 15.99,
    image: "/minimal-deck.jpg",
    category: "Essentials",
    rating: 4.6,
    inStock: true,
  },
]

export function FeaturedDecks() {
  return (
    <section id="decks" className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Featured Decks
            </h2>
            <p className="mt-2 text-muted-foreground">
              Discover the most sought-after custom decks in our marketplace
            </p>
          </div>
          <Button variant="ghost" className="gap-2">
            View All Decks
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <Card
              key={deck.id}
              className="group overflow-hidden border-border bg-card transition-all duration-300 hover:border-primary/50"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-32 w-24 rounded-lg border border-border bg-card shadow-lg" />
                </div>
                <button className="absolute right-3 top-3 rounded-full bg-background/80 p-2 backdrop-blur-sm transition-colors hover:bg-background">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </button>
                {!deck.inStock && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <Badge variant="secondary">Out of Stock</Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="outline" className="mb-2 text-xs">
                      {deck.category}
                    </Badge>
                    <h3 className="font-semibold text-foreground">{deck.name}</h3>
                    <p className="text-sm text-muted-foreground">{deck.designer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">${deck.price}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <span className="text-amber-500">★</span>
                      {deck.rating}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={!deck.inStock}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Cart
                  </Button>
                  <Button size="sm" className="flex-1">
                    Trade
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
