"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react"

const workflowCards = [
  {
    title: "Import from text",
    subtitle: "Commander, mainboard, and token parsing",
    accent: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    title: "Validate legality",
    subtitle: "Single, partner, and background pair support",
    accent: "from-cyan-500/20 to-cyan-500/5",
  },
  {
    title: "Enrich print data",
    subtitle: "Images, finishes, and pricing from Scryfall",
    accent: "from-amber-500/20 to-amber-500/5",
  },
  {
    title: "List and trade",
    subtitle: "Show power level and estimated value publicly",
    accent: "from-rose-500/20 to-rose-500/5",
  },
]

export function HeroSection() {
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
              Import lists, enrich with Scryfall data, and surface real trade value
            </span>
          </div>

          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Manage your <span className="text-primary">Commander deck marketplace</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            DeckSwap helps you import full Commander lists, track pricing, browse community
            builds, and move from collection management to trading without leaving the app.
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
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Commander validation on import
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
              Scryfall-enriched card images and prices
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
              Personal listings and public browsing
            </div>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 sm:gap-16">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground sm:text-4xl">99</p>
              <p className="mt-1 text-sm text-muted-foreground">Card Validation Aware</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground sm:text-4xl">3</p>
              <p className="mt-1 text-sm text-muted-foreground">Core Tables Powering the App</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground sm:text-4xl">1</p>
              <p className="mt-1 text-sm text-muted-foreground">Flow from import to listing</p>
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
        </div>
      </div>
    </section>
  )
}
