import { Upload, Search, Sparkles, ListChecks } from "lucide-react"

const steps = [
  {
    icon: Upload,
    title: "Paste a decklist",
    description:
      "Start with raw Commander text or a source URL, then let DeckSwap parse the commander, mainboard, and token sections.",
  },
  {
    icon: Search,
    title: "Validate the build",
    description:
      "Imported lists are checked for commander count, mainboard count, and duplicate nonbasic cards before publishing.",
  },
  {
    icon: Sparkles,
    title: "Enrich with card data",
    description:
      "Scryfall lookups add print details, imagery, and pricing so each listing feels like a real deck profile.",
  },
  {
    icon: ListChecks,
    title: "List and manage",
    description:
      "Review the public deck page, browse the marketplace, and manage your own deck records from the same app.",
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
            The strongest part of the current product is the import-to-marketplace flow,
            so the landing page now explains that path directly.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="relative text-center">
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
