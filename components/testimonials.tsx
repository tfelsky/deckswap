import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

const testimonials = [
  {
    quote:
      "Dropped in an Archidekt export, picked the commander after import, and the page still kept my token package together. That feels way closer to how brewers actually work.",
    author: "Maya Chen",
    role: "@esperafterhours",
    avatar: "MC",
    deck: "Alela tokens",
    stamp: "Community note",
  },
  {
    quote:
      "Seeing bracket estimate, Game Changers, and blended price on the same deck page makes browsing feel less like guesswork and more like a real marketplace.",
    author: "Devon Patel",
    role: "@dockside.dev",
    avatar: "DP",
    deck: "Korvold value",
    stamp: "Meta take",
  },
  {
    quote:
      "The card modal is the sleeper feature. Once imagery and per-card pricing land, I can actually sanity-check a list before I even message someone.",
    author: "Riley Morgan",
    role: "@stackinteraction",
    avatar: "RM",
    deck: "Niv combo",
    stamp: "Playgroup chatter",
  },
]

export function Testimonials() {
  return (
    <section id="community" className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built for Commander players
          </h2>
          <p className="mt-4 text-muted-foreground">
            Community-style reactions that feel closer to social deck chatter than placeholder marketing copy
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.author} className="overflow-hidden border-border bg-card">
              <CardContent className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div className="inline-flex rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground">
                    {testimonial.stamp}
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-primary/80">
                    {testimonial.deck}
                  </div>
                </div>
                <p className="text-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="mt-5 rounded-2xl border border-border bg-secondary/40 p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Social pulse</span>
                    <span>Commander community</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-background px-3 py-1 text-xs text-foreground">
                      Import flow
                    </span>
                    <span className="rounded-full bg-background px-3 py-1 text-xs text-foreground">
                      Deck detail
                    </span>
                    <span className="rounded-full bg-background px-3 py-1 text-xs text-foreground">
                      Pricing
                    </span>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-secondary text-foreground">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
