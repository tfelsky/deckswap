import type { Metadata } from 'next'
import { FAQSection } from "@/components/faq-section"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  PackageCheck,
  Scale,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: 'How DeckSwap Works | Mythiverse Exchange',
  description:
    'Learn how Mythiverse Exchange helps Commander players trade and sell complete decks with clearer handoffs, protected payment timing, shipping records, and support.',
  alternates: {
    canonical: '/info',
  },
}

const trustStats = [
  {
    value: "2 lanes",
    label: "premium escrow for high-value deals and protected direct shipping for simpler moves",
  },
  {
    value: "2 checkpoints",
    label: "shipment records and review steps before funds or value are released",
  },
  {
    value: "1 goal",
    label: "make complete-deck transactions feel clearer, safer, and easier to finish",
  },
]

const protectionPillars = [
  {
    icon: Shield,
    eyebrow: "Shipment Protection",
    title: "Eligible decks get a clearer protection path while they move.",
    description:
      "DeckSwap is built for complete Commander decks where the shipment matters. Eligible transactions can include declared value, tracking, and support records so both sides know what is being protected.",
    bullets: [
      "Designed for higher-value decks where transit risk matters",
      "Uses declared deck value and transaction records",
      "Keeps key details attached to the trade or sale",
    ],
  },
  {
    icon: Scale,
    eyebrow: "Premium Escrow",
    title: "Extra control for higher-value deals.",
    description:
      "Premium escrow gives sensitive trades and sales a higher-touch path, with controlled timing, documented handoffs, and review before completion.",
    bullets: [
      "Best for higher-ticket decks or more complex trust situations",
      "Adds structure around payment, shipment, and review",
      "Gives both sides a clearer path to completion",
    ],
  },
  {
    icon: ClipboardCheck,
    eyebrow: "Direct Shipping",
    title: "A simpler lane for straightforward transactions.",
    description:
      "Direct shipping keeps simpler deals moving without making them feel casual or unsupported. The transaction still has records, timing controls, and a support path if something needs review.",
    bullets: [
      "Lower cost than full escrow for cleaner deals",
      "Release timing follows delivery and transaction evidence",
      "Support records stay connected to the order",
    ],
  },
]

const timeline = [
  {
    icon: ShieldCheck,
    step: "01",
    title: "Choose the path that fits the deal",
    body: "High-value or more sensitive transactions can use premium escrow. Cleaner deals can move through protected direct shipping at a lower cost.",
  },
  {
    icon: Clock3,
    step: "02",
    title: "Payment timing follows the evidence",
    body: "Whichever path is used, DeckSwap keeps completion tied to the transaction details, shipment records, and required checkpoints.",
  },
  {
    icon: Truck,
    step: "03",
    title: "Decks move with records attached",
    body: "Each shipment can carry tracking, declared value, and transaction context so support has the facts if a question comes up.",
  },
  {
    icon: PackageCheck,
    step: "04",
    title: "Arrival is confirmed",
    body: "Delivery or intake is recorded before the transaction advances to the next step.",
  },
  {
    icon: Search,
    step: "05",
    title: "Details can be reviewed when needed",
    body: "If a deal needs extra review, DeckSwap can compare the deck against the saved list, declared condition, photos, and notes.",
  },
  {
    icon: CheckCircle2,
    step: "06",
    title: "Completion happens with more confidence",
    body: "Once the required steps are clear, payout, equalization, or final completion can move forward.",
  },
]

const inspectionChecks = [
  "Card count and core list alignment",
  "Declared condition versus received condition",
  "Obvious substitutions, omissions, or damage",
  "Packaging and shipment notes attached to the transaction",
]

const resolutionCards = [
  {
    icon: CheckCircle2,
    title: "If everything matches",
    body: "The transaction can keep moving, funds can release when appropriate, and both sides have a clear record of what happened.",
  },
  {
    icon: AlertTriangle,
    title: "If something does not match",
    body: "The transaction can pause while support reviews notes, photos, shipment records, and the original agreement.",
  },
  {
    icon: Sparkles,
    title: "Why players use DeckSwap",
    body: "Complete decks are personal, valuable, and hard to replace. DeckSwap adds structure so the deal is easier to trust from start to finish.",
  },
]

function TrustBlueprint() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(113,255,196,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,208,102,0.16),transparent_26%)]" />

      <div className="relative mx-auto max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-1 text-xs uppercase tracking-[0.24em] text-emerald-100">
            Protected Flow
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            Eligible deals
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">Trade Status</div>
              <div className="mt-2 text-2xl font-semibold text-white">Awaiting review</div>
            </div>
            <div className="rounded-2xl border border-amber-200/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
              Release pending
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {[
              { label: "Payment timing", value: "Held until ready", tone: "emerald" },
              { label: "Shipment status", value: "Tracked", tone: "sky" },
              { label: "Support status", value: "Ready to review", tone: "amber" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3"
              >
                <span className="text-sm text-slate-300">{item.label}</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    item.tone === "emerald"
                      ? "border border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                      : item.tone === "sky"
                        ? "border border-sky-300/20 bg-sky-300/10 text-sky-100"
                        : "border border-amber-200/20 bg-amber-300/10 text-amber-100"
                  }`}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Tracking", text: "Shipment details stay connected to the deal." },
            { title: "Escrow", text: "Higher-value transactions get more control." },
            { title: "Review", text: "Saved records make support easier." },
          ].map((item) => (
            <div key={item.title} className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/55">{item.title}</div>
              <div className="mt-2 text-sm leading-6 text-white/85">{item.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function InfoPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="relative overflow-hidden border-b border-border/70 py-20 sm:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(113,255,196,0.14),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(255,208,102,0.12),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
            <div className="max-w-2xl">
              <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.24em] text-primary/80">
                How DeckSwap Works
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Trade or sell complete Commander decks with a clearer path from agreement to delivery.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                DeckSwap helps players move full decks with structured handoffs, payment timing,
                shipping records, and support. Use premium escrow for higher-value deals or direct
                shipping when the transaction is simpler.
              </p>

              <div className="mt-8 rounded-[1.6rem] border border-amber-300/15 bg-amber-300/8 p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Good to know</div>
                <p className="mt-2 text-sm leading-7 text-foreground/85">
                  Available protection, review steps, and checkout options can vary by transaction.
                  DeckSwap shows the eligible path and required details as the trade or sale moves
                  forward.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/trade-offers"
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                  Review trade offers
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/decks"
                  className="rounded-2xl border border-border bg-card/70 px-5 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
                >
                  Browse live decks
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {trustStats.map((stat) => (
                  <div key={stat.value} className="deckswap-glass rounded-[1.5rem] p-5">
                    <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <TrustBlueprint />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <div className="inline-flex rounded-full border border-border bg-secondary/40 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
              Protection Paths
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Choose the right level of structure for the deck and the deal.
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {protectionPillars.map((pillar) => {
              const Icon = pillar.icon

              return (
                <div
                  key={pillar.title}
                  className="group relative overflow-hidden rounded-[1.85rem] border border-border/80 bg-card/80 p-6 shadow-[0_22px_60px_rgba(0,0,0,0.16)] backdrop-blur-sm"
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)]" />
                  <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-2 text-primary transition group-hover:bg-primary/10">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="mt-5 text-xs uppercase tracking-[0.2em] text-primary/75">{pillar.eyebrow}</div>
                  <h3 className="mt-3 text-xl font-semibold text-foreground">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{pillar.description}</p>
                  <div className="mt-5 space-y-3">
                    {pillar.bullets.map((bullet) => (
                      <div key={bullet} className="flex items-start gap-3 rounded-2xl border border-border bg-background/35 px-4 py-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                        <span className="text-sm leading-6 text-foreground/90">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="deckswap-accent rounded-[2rem] p-8">
              <div className="inline-flex rounded-full border border-white/10 bg-black/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-foreground/80">
                When Escrow Helps
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                Premium escrow adds more control when the stakes are higher.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Some decks deserve more than a standard shipment. Premium escrow is designed for
                higher-value deals, complex value differences, or situations where both sides want
                more structure before the transaction completes.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  "Higher-value decks get a more deliberate completion path.",
                  "Payment, shipment, and equalization details stay connected.",
                  "Review steps create a clearer support record if something needs attention.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                    <span className="text-sm leading-6 text-foreground/90">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card/70 p-8 backdrop-blur-sm">
              <div className="inline-flex rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
                Process Timeline
              </div>
              <div className="mt-6 space-y-4">
                {timeline.map((item) => {
                  const Icon = item.icon

                  return (
                    <div
                      key={item.step}
                      className="grid gap-4 rounded-[1.5rem] border border-border bg-background/40 p-5 sm:grid-cols-[auto_1fr]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground sm:hidden">
                          Step {item.step}
                        </div>
                      </div>

                      <div>
                        <div className="hidden rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground sm:inline-flex">
                          Step {item.step}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-foreground">{item.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
            <div className="rounded-[2rem] border border-border bg-card/70 p-8 backdrop-blur-sm">
              <div className="inline-flex rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
                Direct Shipping
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                A lower-cost path for cleaner deals.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Direct shipping is for straightforward transactions where full escrow may be more
                structure than the deal needs. You still keep the important records attached to the
                transaction, including shipment details and support context.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {inspectionChecks.map((item) => (
                  <div key={item} className="rounded-[1.4rem] border border-border bg-background/40 p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 rounded-full border border-primary/20 bg-primary/10 p-2 text-primary">
                        <ClipboardCheck className="h-4 w-4" />
                      </div>
                      <div className="text-sm leading-6 text-foreground/90">{item}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="deckswap-glass rounded-[2rem] p-8">
              <div className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-emerald-100">
                Support Record
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                Clear records make support faster and fairer.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                A complete deck is more than a package. DeckSwap keeps the listing, deck list,
                declared details, shipment notes, and transaction history together so questions can
                be handled with real context.
              </p>

              <div className="mt-8 space-y-4">
                {resolutionCards.map((card) => {
                  const Icon = card.icon

                  return (
                    <div key={card.title} className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
                          <p className="mt-2 text-sm leading-7 text-muted-foreground">{card.body}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-[linear-gradient(135deg,rgba(113,255,196,0.12),rgba(255,208,102,0.08),rgba(255,255,255,0.03))] p-8 shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_28%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-3xl">
                <div className="inline-flex rounded-full border border-white/10 bg-black/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-foreground/80">
                  The Short Version
                </div>
                <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Use escrow when the deal needs more control. Use direct shipping when it should move simply.
                </h2>
                <p className="mt-4 text-sm leading-7 text-foreground/80 sm:text-base">
                  DeckSwap gives complete-deck trades and sales a more trustworthy path: clear deck
                  records, shipment details, payment timing, and support context in one place.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/decks"
                  className="rounded-2xl border border-border bg-card/70 px-5 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
                >
                  Browse marketplace
                </Link>
                <Link
                  href="/trades"
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                  View trades
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <FAQSection />
      </main>
      <Footer />
    </div>
  )
}
