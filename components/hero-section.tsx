"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-32">
      {/* Background decorations */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Join 10,000+ collectors worldwide
            </span>
          </div>

          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Trade & Collect{" "}
            <span className="text-primary">Custom Decks</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            The premier marketplace for custom playing card decks. Buy, sell, and trade with 
            collectors who share your passion. Find your perfect match.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="min-w-[180px]">
              Start Trading
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="min-w-[180px]">
              Browse Decks
            </Button>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 sm:gap-16">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground sm:text-4xl">50K+</p>
              <p className="mt-1 text-sm text-muted-foreground">Decks Listed</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground sm:text-4xl">25K+</p>
              <p className="mt-1 text-sm text-muted-foreground">Trades Made</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground sm:text-4xl">150+</p>
              <p className="mt-1 text-sm text-muted-foreground">Countries</p>
            </div>
          </div>
        </div>

        {/* Floating card deck illustrations */}
        <div className="relative mt-20">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { name: "Mystic", color: "from-emerald-500/20 to-emerald-500/5" },
              { name: "Noir", color: "from-zinc-500/20 to-zinc-500/5" },
              { name: "Royal", color: "from-amber-500/20 to-amber-500/5" },
              { name: "Neon", color: "from-cyan-500/20 to-cyan-500/5" },
              { name: "Vintage", color: "from-rose-500/20 to-rose-500/5" },
            ].map((deck, index) => (
              <div
                key={deck.name}
                className="group relative aspect-[2.5/3.5] cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-2 hover:border-primary/50"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${deck.color}`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <div className="mb-2 h-12 w-12 rounded-lg bg-primary/20 backdrop-blur-sm" />
                  <p className="text-center text-sm font-medium text-foreground">{deck.name}</p>
                  <p className="text-center text-xs text-muted-foreground">Edition</p>
                </div>
                <div className="absolute inset-0 bg-primary/0 transition-colors group-hover:bg-primary/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
