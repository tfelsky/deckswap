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
    'Learn how Mythiverse Exchange approaches protection, escrow timing, shipment intake, and inspection for higher-trust deck transactions.',
  alternates: {
    canonical: '/info',
  },
}

const trustStats = [
  {
    value: "3 layers",
    label: "insurance, escrow control, and physical inspection before release",
  },
  {
    value: "2 checkpoints",
    label: "shipment intake and inspection review before anything moves forward",
  },
  {
    value: "1 clear rule",
    label: "release only happens after the deal clears the agreed protection flow",
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
    eyebrow: "Escrow Protection",
    title: "Funds and release timing stay under platform control.",
    description:
      "Escrow is the trust layer between agreement and completion. The point is not speed at any cost. The point is making sure neither side is fully exposed while the deal is still unverified.",
    bullets: [
      "Payment obligations are held until the transaction clears review",
      "Equalization only releases after both sides pass inspection",
      "Sellers are not asked to trust a promise without structure behind it",
    ],
  },
  {
    icon: ClipboardCheck,
    eyebrow: "Inspection Protection",
    title: "The received deck is checked against the agreed record.",
    description:
      "Inspection compares the physical shipment to saved inventory, declared condition, and any notes attached to the deal so the outcome reflects what was actually promised.",
    bullets: [
      "Deck contents and condition are reviewed before release",
      "Packaging notes and shipment handoff stay part of the record",
      "Mismatch or damage pauses the flow instead of forcing settlement",
    ],
  },
]

const timeline = [
  {
    icon: ShieldCheck,
    step: "01",
    title: "Deal enters the protected lane",
    body: "The transaction is framed with shipping, insurance, fees, and any equalization before either side is treated as complete.",
  },
  {
    icon: Clock3,
    step: "02",
    title: "Escrow holds the critical obligations",
    body: "The platform controls the timing of release so the transaction does not outrun the evidence.",
  },
  {
    icon: Truck,
    step: "03",
    title: "Decks are shipped into the flow",
    body: "Each shipment moves through a documented handoff rather than a casual peer-to-peer gamble.",
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
    body: "The platform checks that the deck matches the stored inventory, declared condition bands, and the expectation both sides agreed to.",
  },
  {
    icon: CheckCircle2,
    step: "06",
    title: "Release happens only after clearance",
    body: "Once both sides pass review, the deck moves onward and any equalization or payout can be released with much higher confidence.",
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
                Protection And Inspection
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                A beautiful deck deal still needs a serious trust layer behind it.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                This page explains how DeckSwap is designed to protect qualified transactions with
                three coordinated layers: insurance during transit, escrow control over release,
                and inspection before anything is finalized.
              </p>

              <div className="mt-8 rounded-[1.6rem] border border-amber-300/15 bg-amber-300/8 p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Important context</div>
                <p className="mt-2 text-sm leading-7 text-foreground/85">
                  The protection language here describes the intended protected-flow model for
                  eligible deals. Specific availability can vary by transaction while the broader
                  checkout and escrow system continues to mature.
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
              The Three Pillars
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Protection works best when each layer reinforces the next one.
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
                Why Escrow Exists
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                Escrow slows release just enough to make the transaction safer.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                The core idea is simple: before either side gets the final benefit of the deal,
                the platform should control the critical obligations, wait for arrival, and confirm
                that the physical deck matches the agreed record.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  "It reduces the chance that money moves faster than verification.",
                  "It protects the side trading down in value until equalization is truly earned.",
                  "It gives inspection real leverage instead of turning review into a cosmetic step.",
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
                Inspection Standard
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                Inspection is where trust becomes operational.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                A protected transaction should not settle just because a box arrived. It should
                settle because the received deck lines up with the saved inventory and the
                condition expectations that supported the deal in the first place.
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
                Release Logic
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                No inspection pass, no automatic release.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                That single rule is what makes the rest of the system credible. Insurance helps
                during transit, escrow controls timing, and inspection determines whether the deal
                has truly earned completion.
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
                  Protected deals should feel calm because the system has real stopping points.
                </h2>
                <p className="mt-4 text-sm leading-7 text-foreground/80 sm:text-base">
                  Insurance handles transit risk. Escrow controls release timing. Inspection checks
                  the real deck before completion. When those three pieces work together, buyers
                  and sellers can move with much more confidence on valuable transactions.
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
