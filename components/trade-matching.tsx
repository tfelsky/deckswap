"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeftRight, Check, MessageCircle, Shield } from "lucide-react"

const tradeMatches = [
  {
    id: 1,
    user: "CardCollector_Mike",
    avatar: "CM",
    location: "New York, USA",
    offering: "Celestial Nights (Sealed)",
    seeking: "Midnight Casino",
    matchScore: 98,
    verified: true,
    trades: 156,
  },
  {
    id: 2,
    user: "DeckEnthusiast",
    avatar: "DE",
    location: "London, UK",
    offering: "Vintage Series Bundle",
    seeking: "Any Cyber Punk Edition",
    matchScore: 85,
    verified: true,
    trades: 89,
  },
  {
    id: 3,
    user: "PlayingCardPro",
    avatar: "PP",
    location: "Tokyo, Japan",
    offering: "Limited Gold Foil Set",
    seeking: "Botanical Dreams",
    matchScore: 72,
    verified: false,
    trades: 34,
  },
]

export function TradeMatching() {
  return (
    <section id="trade" className="bg-secondary/30 py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4">Smart Matching</Badge>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Find Your Perfect Trade
          </h2>
          <p className="mt-4 text-muted-foreground">
            Our intelligent matching system connects you with collectors who have exactly 
            what you&apos;re looking for—and want what you have to offer.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {/* Trade matcher card */}
          <Card className="border-border bg-card p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Trade Matcher</h3>
                <p className="text-sm text-muted-foreground">Based on your collection</p>
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

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {match.trades} successful trades
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <MessageCircle className="mr-1 h-3 w-3" />
                        Chat
                      </Button>
                      <Button size="sm">
                        <Check className="mr-1 h-3 w-3" />
                        Accept
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Features */}
          <div className="flex flex-col justify-center space-y-6">
            {[
              {
                title: "Smart Matching Algorithm",
                description:
                  "Our AI analyzes your collection and wishlist to find the best trade opportunities in real-time.",
              },
              {
                title: "Verified Traders",
                description:
                  "Trade with confidence knowing verified members have completed successful trades before.",
              },
              {
                title: "Secure Escrow System",
                description:
                  "Both parties ship to our escrow service. We verify condition and handle the swap securely.",
              },
              {
                title: "Global Reach",
                description:
                  "Connect with collectors from 150+ countries. We handle international shipping logistics.",
              },
            ].map((feature, index) => (
              <div key={index} className="flex gap-4">
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
