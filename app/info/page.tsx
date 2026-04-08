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
    'Learn how Mythiverse Exchange positions premium escrow and lower-cost direct shipping, with protection built through holdback, reserve coverage, shipment intake, and inspection.',
  alternates: {
    canonical: '/info',
  },
}

const trustStats = [
  {
    value: "2 lanes",
    label: "premium escrow for white-glove deals and direct shipping for lower-cost premium coverage",
  },
  {
    value: "2 checkpoints",
    label: "holdback discipline and operational review before completion moves too fast",
  },
  {
    value: "1 clear rule",
    label: "release should follow proof, not optimism",
  },
]

const protectionPillars = [
  {
    icon: Shield,
    eyebrow: "Insurance Protection",
    title: "Coverage is tied to what is actually in motion.",
    description:
      "Insurance exists to protect the shipment value while the deck is traveling through the protected lane, especially when the inventory is too valuable to leave to chance.",
    bullets: [
      "Built for higher-value decks where transit risk matters more",
      "Paired with declared deck value instead of vague guesswork",
      "Designed to reduce exposure before release or payout",
    ],
  },
  {
    icon: Scale,
    eyebrow: "Premium Escrow",
    title: "The upscale service is built for the highest-trust deals.",
    description:
      "Escrow is the white-glove lane between agreement and completion. It is positioned for the deals where platform control, intake, inspection, and release timing should feel meaningfully more hands-on than a standard shipment flow.",
    bullets: [
      "Best fit for higher-ticket decks and more delicate trust situations",
      "Higher-touch control over release timing, equalization, and review",
      "Designed to feel like the flagship service rather than the base package",
    ],
  },
  {
    icon: ClipboardCheck,
    eyebrow: "Direct Shipping",
    title: "The lower-cost lane still keeps a premium protection story.",
    description:
      "Direct shipping is positioned as the simpler, more affordable option, but not the exposed one. Coverage still comes from structured holdback, clear records, and the self-insurance reserve that backs the lane when something goes sideways.",
    bullets: [
      "Lower operational cost than full escrow without sounding stripped down",
      "Holdback slows release until the key delivery proof exists",
      "Self-insurance reserve supports recovery without needing full escrow overhead",
    ],
  },
]

const timeline = [
  {
    icon: ShieldCheck,
    step: "01",
    title: "Choose the lane that fits the deal",
    body: "Higher-value or more sensitive transactions can enter premium escrow, while cleaner deals can move through direct shipping at a lower cost.",
  },
  {
    icon: Clock3,
    step: "02",
    title: "Holdback keeps release disciplined",
    body: "Whichever lane is used, the key rule is the same: release should not outrun the evidence the platform has in hand.",
  },
  {
    icon: Truck,
    step: "03",
    title: "Decks are shipped into the flow",
    body: "Each shipment moves through a documented handoff instead of a casual peer-to-peer gamble with no operational backstop.",
  },
  {
    icon: PackageCheck,
    step: "04",
    title: "Intake confirms arrival",
    body: "Receipt is logged first so the inspection phase starts from a clean, auditable checkpoint.",
  },
  {
    icon: Search,
    step: "05",
    title: "Inspection verifies contents and condition",
    body: "The platform checks that the deck matches the stored inventory, declared condition bands, and the expectation both sides agreed to when extra review is required.",
  },
  {
    icon: CheckCircle2,
    step: "06",
    title: "Release happens only after clearance",
    body: "Once delivery or review clears the required threshold, payout or equalization can release with much higher confidence.",
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
    body: "The transaction clears inspection, escrow can release the approved funds, and the deck proceeds to the next leg of fulfillment.",
  },
  {
    icon: AlertTriangle,
    title: "If something does not match",
    body: "The flow pauses. That gives the platform room to review notes, photos, intake records, and the original agreement before deciding the next step.",
  },
  {
    icon: Sparkles,
    title: "Why this matters",
    body: "Protection is not just about refunds. It is about preventing avoidable bad outcomes by slowing release until the facts are clear.",
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
            Qualified deals
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">Escrow State</div>
              <div className="mt-2 text-2xl font-semibold text-white">Awaiting inspection</div>
            </div>
            <div className="rounded-2xl border border-amber-200/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
              Release locked
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {[
              { label: "Funds control", value: "Held until cleared", tone: "emerald" },
              { label: "Shipment status", value: "Received to review", tone: "sky" },
              { label: "Inspection status", value: "Pending match", tone: "amber" },
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
            { title: "Insurance", text: "Transit value is protected during movement." },
            { title: "Escrow", text: "Release waits for proof, not optimism." },
            { title: "Inspection", text: "Physical intake confirms the real deck." },
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
                Protection And Positioning
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                DeckSwap can offer both an upscale escrow service and a lower-cost protected shipping lane.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                This page explains how the protection story can split cleanly in two: premium
                escrow as the flagship white-glove service, and direct shipping as the more
                affordable offer that still feels premium because holdback and reserve coverage sit
                behind it.
              </p>

              <div className="mt-8 rounded-[1.6rem] border border-amber-300/15 bg-amber-300/8 p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Important context</div>
                <p className="mt-2 text-sm leading-7 text-foreground/85">
                  The language here describes the intended service architecture and market
                  positioning for eligible deals. Specific protection mechanics can vary by
                  transaction while the broader checkout, direct shipping, and escrow systems
                  continue to mature.
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
                  href="/checkout-prototype"
                  className="rounded-2xl border border-border bg-card/70 px-5 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
                >
                  Explore checkout model
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
              Protection Design
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              The strongest positioning separates the flagship service from the scalable one.
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
                Why Premium Escrow Exists
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                Escrow should feel like the upscale service, not the baseline checkbox.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                The core idea is simple: some deals deserve a higher-touch model. Premium escrow
                earns its place when the value, sensitivity, or trust requirements justify more
                control over timing, intake, and release.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  "It makes the highest-value deals feel deliberately premium and controlled.",
                  "It protects equalization and release timing when the downside of a miss is larger.",
                  "It gives inspection and operations real leverage instead of making them cosmetic.",
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
                Direct Shipping Standard
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                Lower cost should not mean lower-class positioning.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Direct shipping can still be sold as premium coverage. The difference is that the
                lane trims operational overhead, while holdback, clear records, and reserve-backed
                recovery continue to carry the protection story.
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
                Coverage Logic
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                Holdback is what keeps the direct lane credible.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                That single discipline is what lets direct shipping stay premium in the market.
                Full escrow is not required for every transaction if the platform still controls
                enough of the release logic and stands behind the lane with a self-insurance fund.
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
                  Escrow becomes the flagship. Direct shipping becomes the accessible premium offer.
                </h2>
                <p className="mt-4 text-sm leading-7 text-foreground/80 sm:text-base">
                  Premium escrow is the upscale service for deals that need the most control.
                  Direct shipping gives players a lower-cost path that can still feel protected
                  because holdback and reserve-backed recovery keep real structure behind the
                  transaction.
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
                  View trades workspace
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
