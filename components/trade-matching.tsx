"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeftRight, Check, MessageCircle, Shield } from "lucide-react"

const tradeMatches = [
  {
    id: 1,
    user: "EsperTempo",
    avatar: "ET",
    location: "Toronto, CA",
    offering: "Alela artifacts shell",
    seeking: "Blue farm staples",
    matchScore: 98,
    verified: true,
    trades: 23,
    note: "Posted a binder update after finishing a token backfill.",
  },
  {
    id: 2,
    user: "DocksideDan",
    avatar: "DD",
    location: "Chicago, USA",
    offering: "Treasure-heavy Jund list",
    seeking: "Fast mana swaps",
    matchScore: 85,
    verified: true,
    trades: 11,
    note: "Prefers domestic tracked shipping and high-value deck trades.",
  },
  {
    id: 3,
    user: "ShadowNinjas",
    avatar: "SN",
    location: "Vancouver, CA",
    offering: "Yuriko tempo pieces",
    seeking: "Oracle combo upgrades",
    matchScore: 72,
    verified: false,
    trades: 7,
    note: "Looking for a cleaner bracket match before locking a deal.",
  },
]

export function TradeMatching() {
  return (
    <section id="trade" className="bg-secondary/30 py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4">Smart Matching</Badge>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Deck-level trade discovery
          </h2>
          <p className="mt-4 text-muted-foreground">
            The current app already tracks owner listings, power, and pricing. This section
            now frames DeckSwap as a Commander trading hub instead of a generic playing-card shop.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          <Card className="border-border bg-card p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Trade Matcher</h3>
                <p className="text-sm text-muted-foreground">Prototype matches based on listed decks</p>
              </div>
            </div>

            <div className="space-y-4">
              {tradeMatches.map((match) => (
                <div
                  key={match.id}
                  className="rounded-lg border border-border bg-background p-4 transition-all hover:border-primary/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-secondary text-foreground">
                          {match.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{match.user}</p>
                          {match.verified && (
                            <Shield className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{match.location}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      {match.matchScore}% Match
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Offering</p>
                      <p className="font-medium text-foreground">{match.offering}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Seeking</p>
                      <p className="font-medium text-foreground">{match.seeking}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-border bg-secondary/40 px-3 py-3 text-sm text-muted-foreground">
                    {match.note}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {match.trades} successful trades
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/my-decks">
                          <MessageCircle className="mr-1 h-3 w-3" />
                          My Listings
                        </Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href="/decks">
                          <Check className="mr-1 h-3 w-3" />
                          Browse
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex flex-col justify-center space-y-6">
            {[
              {
                title: "Parsed deck structure",
                description:
                  "Imports are split into commander, mainboard, and token rows so listings carry more than a title and price.",
              },
              {
                title: "Commander-aware validation",
                description:
                  "The app already checks for 99-card and 98-card commander builds, duplicate nonbasics, and common pairing rules.",
              },
              {
                title: "Pricing enrichment",
                description:
                  "Scryfall enrichment attaches print metadata, card images, and aggregate deck pricing that can power better trade decisions.",
              },
              {
                title: "Owner-managed listings",
                description:
                  "Users can browse the public marketplace, then manage and update only the decks tied to their account.",
              },
            ].map((feature) => (
              <div key={feature.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{feature.title}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
