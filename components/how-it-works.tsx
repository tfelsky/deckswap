import { Upload, Search, ArrowLeftRight, Package } from "lucide-react"

const steps = [
  {
    icon: Upload,
    title: "List Your Collection",
    description:
      "Upload your decks with photos and details. Set prices or mark them available for trade.",
  },
  {
    icon: Search,
    title: "Browse & Discover",
    description:
      "Explore thousands of custom decks. Filter by designer, edition, condition, or rarity.",
  },
  {
    icon: ArrowLeftRight,
    title: "Match & Trade",
    description:
      "Get matched with collectors seeking your decks. Propose trades or make offers.",
  },
  {
    icon: Package,
    title: "Ship Securely",
    description:
      "Use our protected shipping with tracking. Trades go through escrow for safety.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start trading in minutes. Our platform makes it easy to buy, sell, and swap 
            custom decks with collectors worldwide.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={index} className="relative text-center">
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-12 hidden h-px w-full bg-border lg:block" />
              )}
              <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl border border-border bg-card">
                <step.icon className="h-10 w-10 text-primary" />
                <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
