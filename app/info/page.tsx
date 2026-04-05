import { FAQSection } from "@/components/faq-section"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { ArrowRight, Box, CheckCircle2, ClipboardCheck, PackageCheck, Printer, ShieldCheck, Sparkles, Truck } from "lucide-react"
import Link from "next/link"

const reassuranceStats = [
  {
    value: "100+",
    label: "cards protected in a recommended Boulder case",
  },
  {
    value: "1 box",
    label: "that can become your reusable shipping kit after the first order",
  },
  {
    value: "Next day",
    label: "optional courier drop of a box and label starter pack for a fee",
  },
]

const packingSteps = [
  {
    icon: ShieldCheck,
    title: "Sleeve the deck first",
    description:
      "We recommend shipping the deck sleeved inside an Ultimate Guard Boulder 100+ style case so the list stays tight, clean, and protected in transit.",
  },
  {
    icon: Box,
    title: "Use the right-size cardboard box",
    description:
      "A snug outer box keeps the Boulder from rattling around. Your first shipment can arrive in the same right-size box we recommend you keep and reuse.",
  },
  {
    icon: Printer,
    title: "Print the shipping ticket",
    description:
      "We handle the shipping ticket flow so you can print the label, attach it cleanly, and know the parcel is prepared the way buyers expect.",
  },
  {
    icon: Truck,
    title: "Schedule pickup or dropoff",
    description:
      "Once packed, pickup is straightforward. If you want the easiest possible first shipment, we can even courier you a box and label kit the next day for a fee.",
  },
]

const confidenceCards = [
  {
    title: "What we recommend inside",
    body: "Sleeved deck, Boulder 100+, and light fill so the contents stay snug without corner pressure.",
  },
  {
    title: "What we recommend outside",
    body: "A right-size cardboard mailer that protects edges, stacks cleanly, and is easy to save for the next shipment.",
  },
  {
    title: "What we coordinate",
    body: "Shipping ticket generation, print-and-apply workflow, and pickup readiness so the process feels guided instead of improvised.",
  },
]

const shippingTickets = [
  "Shipping ticket generation with clear print-and-pack guidance",
  "Pickup-ready label flow so you know when the parcel is truly ready",
  "Reusable first-shipment box strategy to make future sends easier",
  "A $2 kickback when sleeves arrive clean, clear, and undamaged, roughly in the 3 to 5 play range",
  "Optional next-day couriered starter kit with box and label for a fee",
]

function ShippingIllustration() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(113,255,196,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,208,102,0.18),transparent_28%)]" />
      <div className="relative mx-auto flex max-w-md flex-col gap-5">
        <div className="self-end rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-1 text-xs uppercase tracking-[0.24em] text-emerald-100">
          Shipping Confidence
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">Inner Protection</div>
              <div className="mt-2 text-xl font-semibold text-white">Sleeved in a Boulder 100+</div>
            </div>
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100">
              Recommended
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(26,33,52,0.95),rgba(17,23,37,0.95))] p-5">
            <div className="mx-auto h-44 max-w-[15rem] rounded-[1.75rem] border border-emerald-200/30 bg-[linear-gradient(180deg,rgba(38,58,85,0.95),rgba(19,29,45,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_18px_36px_rgba(0,0,0,0.28)]">
              <div className="flex h-full flex-col justify-between rounded-[1.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(30,41,59,0.95))] p-4">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-slate-300">
                  <span>Deck Case</span>
                  <span>100+</span>
                </div>
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4].map((layer) => (
                    <div
                      key={layer}
                      className="h-4 rounded-md border border-white/8 bg-[linear-gradient(90deg,rgba(148,163,184,0.3),rgba(226,232,240,0.12))]"
                    />
                  ))}
                </div>
                <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-center text-xs font-medium text-emerald-100">
                  Sleeved deck secured
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-amber-50/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Outer Box</div>
            <div className="mt-2 text-lg font-semibold text-white">Right size. Minimal movement.</div>
            <div className="mt-4 rounded-[1.25rem] border border-amber-200/15 bg-[linear-gradient(180deg,rgba(120,84,42,0.35),rgba(84,54,24,0.25))] p-4">
              <div className="mx-auto flex h-32 max-w-[13rem] items-end justify-center rounded-[1rem] border border-amber-100/15 bg-[linear-gradient(180deg,rgba(130,91,51,0.75),rgba(91,59,31,0.95))] p-3 shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
                <div className="w-full rounded-md border border-dashed border-amber-100/25 bg-black/10 px-3 py-8 text-center text-xs uppercase tracking-[0.22em] text-amber-50/85">
                  Reusable shipper
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-sky-400/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-sky-200/80">Shipping Ticket</div>
            <div className="mt-2 text-lg font-semibold text-white">Print, apply, and hand off.</div>
            <div className="mt-4 rounded-[1.25rem] border border-sky-200/15 bg-[linear-gradient(180deg,rgba(29,78,216,0.22),rgba(14,165,233,0.08))] p-4">
              <div className="mx-auto max-w-[12rem] rounded-[1rem] border border-white/15 bg-white/95 p-4 text-slate-900 shadow-[0_18px_36px_rgba(0,0,0,0.18)]">
                <div className="h-2 w-20 rounded-full bg-slate-900/80" />
                <div className="mt-2 h-2 w-28 rounded-full bg-slate-400/80" />
                <div className="mt-4 grid gap-1.5">
                  {[0, 1, 2, 3].map((line) => (
                    <div key={line} className="h-1.5 rounded-full bg-slate-300" />
                  ))}
                </div>
                <div className="mt-4 h-10 rounded-md bg-[repeating-linear-gradient(90deg,#0f172a_0_3px,transparent_3px_6px)] opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CourierIllustration() {
  return (
    <div className="relative rounded-[2rem] border border-border/80 bg-[linear-gradient(160deg,rgba(113,255,196,0.08),rgba(255,208,102,0.06),rgba(255,255,255,0.02))] p-6">
      <div className="absolute right-6 top-6 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-amber-200">
        Optional Service
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div className="relative mx-auto w-full max-w-xs">
          <div className="relative h-48 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.95),rgba(30,41,59,0.95))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <div className="absolute -left-4 bottom-8 h-8 w-8 rounded-full border border-white/10 bg-slate-950" />
            <div className="absolute left-14 bottom-8 h-8 w-8 rounded-full border border-white/10 bg-slate-950" />
            <div className="absolute left-6 top-8 h-20 w-24 rounded-[1.25rem] border border-emerald-300/20 bg-[linear-gradient(180deg,rgba(19,29,45,1),rgba(38,58,85,0.95))]" />
            <div className="absolute right-5 top-10 h-16 w-20 rounded-[1rem] border border-amber-200/20 bg-[linear-gradient(180deg,rgba(130,91,51,0.88),rgba(91,59,31,0.95))]" />
            <div className="absolute right-6 top-14 rounded-md border border-white/15 bg-white/90 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-900">
              label inside
            </div>
            <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-center text-xs text-sky-100">
              Couriered box + shipping label kit
            </div>
          </div>
        </div>

        <div>
          <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.24em] text-primary/80">
            First Shipment Help
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Want the easiest possible first send?
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            If finding the right box is the thing slowing you down, we can courier you a next-day starter kit with the box and shipping label for a fee. It is designed to remove the guesswork from your first shipment and become the box you reuse later.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/50 p-4">
              <div className="text-sm font-medium text-foreground">What arrives</div>
              <p className="mt-2 text-sm text-muted-foreground">
                A shipping-ready box format, label support, and a clearer idea of how your next package should look.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/50 p-4">
              <div className="text-sm font-medium text-foreground">Why it matters</div>
              <p className="mt-2 text-sm text-muted-foreground">
                The first shipment builds confidence. After that, you already have the sizing, materials, and routine.
              </p>
            </div>
          </div>
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(113,255,196,0.14),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(255,208,102,0.12),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
            <div className="max-w-2xl">
              <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.24em] text-primary/80">
                Shipping Information
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Shipping a deck should feel organized, protected, and easy to trust.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                We designed the shipping flow to calm the biggest concerns: how the deck should be packed, what box size makes sense, how the shipping ticket gets printed, and what to do if you want pickup help or even a ready-to-use box delivered first.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/import-deck"
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                  Start a deck shipment
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/trade-offers"
                  className="rounded-2xl border border-border bg-card/70 px-5 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
                >
                  Review active trades
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {reassuranceStats.map((stat) => (
                  <div key={stat.value} className="deckswap-glass rounded-[1.5rem] p-5">
                    <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <ShippingIllustration />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-3">
            {confidenceCards.map((card) => (
              <div
                key={card.title}
                className="group relative overflow-hidden rounded-[1.75rem] border border-border/80 bg-card/80 p-6 shadow-[0_22px_60px_rgba(0,0,0,0.16)] backdrop-blur-sm"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)]" />
                <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-2 text-primary transition group-hover:bg-primary/10">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-foreground">{card.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="deckswap-accent rounded-[2rem] p-8">
              <div className="inline-flex rounded-full border border-white/10 bg-black/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-foreground/80">
                Recommended Setup
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                The packing standard we want sellers to feel good about
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                The goal is not overpacking. It is controlled, clean protection: a sleeved deck, a Boulder 100+ style case, and a cardboard outer box sized to stop the contents from shifting.
              </p>

              <div className="mt-8 space-y-3">
                {shippingTickets.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                    <span className="text-sm leading-6 text-foreground/90">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card/70 p-8 backdrop-blur-sm">
              <div className="inline-flex rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
                Step By Step
              </div>
              <div className="mt-6 space-y-4">
                {packingSteps.map((step, index) => {
                  const Icon = step.icon

                  return (
                    <div
                      key={step.title}
                      className="grid gap-4 rounded-[1.5rem] border border-border bg-background/40 p-5 sm:grid-cols-[auto_1fr]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground sm:hidden">
                          Step {index + 1}
                        </div>
                      </div>

                      <div>
                        <div className="hidden rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground sm:inline-flex">
                          Step {index + 1}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-foreground">{step.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
          <CourierIllustration />
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[2rem] border border-border bg-card/70 p-8 backdrop-blur-sm">
              <div className="inline-flex rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
                Concern Checklist
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                The page is built to answer the questions people ask before they ship
              </h2>
              <div className="mt-8 space-y-4">
                {[
                  {
                    icon: PackageCheck,
                    title: "Will the deck stay protected?",
                    body: "Yes. The recommendation starts with sleeves and a Boulder 100+ style deck case, which keeps the core contents stable before they ever touch the outer box.",
                  },
                  {
                    icon: ClipboardCheck,
                    title: "Will I know what box to use?",
                    body: "Yes. We recommend a right-size cardboard box and position that same first box as the reusable shipping box for future trades and sales.",
                  },
                  {
                    icon: Printer,
                    title: "What about the label and pickup?",
                    body: "The flow includes shipping ticket printing and the handoff step, so the process does not end at packing. You know how the parcel actually leaves your hands.",
                  },
                ].map((item) => {
                  const Icon = item.icon

                  return (
                    <div key={item.title} className="rounded-[1.5rem] border border-border bg-background/40 p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                          <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="deckswap-glass rounded-[2rem] p-8">
              <div className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-emerald-100">
                Quick Summary
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                If you remember only one thing
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                We want the shipping experience to feel repeatable. Sleeve the deck, secure it in a Boulder 100+, place it in the right-size cardboard box, print the shipping ticket, and use pickup if that is easiest. If even that feels like one step too many, the optional next-day couriered box and label kit is there to remove the first-shipment friction.
              </p>

              <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-black/10 p-5">
                <div className="text-sm font-medium text-foreground">A calmer first shipment leads to easier repeat shipments.</div>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  That is why the packaging recommendation, reusable box, and shipping-ticket flow all sit on the same page together.
                </p>
              </div>

              <div className="mt-4 rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/10 p-5">
                <div className="text-sm font-medium text-foreground">Sleeve-quality bonus</div>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  If the sleeves arrive clean, clear, and undamaged, we can add a <span className="font-semibold text-foreground">$2 kickback</span>. Think lightly used sleeves, approximately in that 3 to 5 play range, rather than cloudy, split, or heavily worn ones.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/import-library"
                  className="rounded-2xl border border-border bg-card/70 px-5 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
                >
                  Import a library
                </Link>
                <Link
                  href="/checkout-prototype"
                  className="rounded-2xl border border-border bg-card/70 px-5 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
                >
                  Preview checkout
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
