import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

const testimonials = [
  {
    quote:
      "DeckSwap completely changed how I collect. I&apos;ve traded with collectors from 12 different countries and found decks I thought were impossible to get.",
    author: "Sarah Chen",
    role: "Collector since 2019",
    avatar: "SC",
  },
  {
    quote:
      "The matching algorithm is incredible. Within a week of listing my duplicates, I found someone who had exactly what I needed and wanted what I had.",
    author: "Marcus Johnson",
    role: "Professional Magician",
    avatar: "MJ",
  },
  {
    quote:
      "As a deck designer, DeckSwap gives me direct access to the collector community. I&apos;ve sold more decks here than anywhere else.",
    author: "Elena Rodriguez",
    role: "Card Designer",
    avatar: "ER",
  },
]

export function Testimonials() {
  return (
    <section id="community" className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Loved by Collectors
          </h2>
          <p className="mt-4 text-muted-foreground">
            Join thousands of satisfied collectors who have found their perfect trades
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-border bg-card">
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
