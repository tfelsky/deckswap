import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

const testimonials = [
  {
    quote:
      "I pasted a messy Commander list, and DeckSwap turned it into a deck page with commander metadata, print details, and pricing I could actually use.",
    author: "Maya Chen",
    role: "Esper artifacts pilot",
    avatar: "MC",
  },
  {
    quote:
      "The app feels strongest when it stays close to deck management. Seeing my own listings and the public marketplace in one place makes the flow click.",
    author: "Devon Patel",
    role: "Commander grinder",
    avatar: "DP",
  },
  {
    quote:
      "The detail page is the part I keep coming back to. Once enrichment runs, it already looks like the foundation for serious deck browsing and trading.",
    author: "Riley Morgan",
    role: "Deck brewer",
    avatar: "RM",
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
            Messaging that now matches what the app actually does best
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.author} className="border-border bg-card">
              <CardContent className="p-6">
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-amber-500">★</span>
                  ))}
                </div>
                <p className="text-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
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
