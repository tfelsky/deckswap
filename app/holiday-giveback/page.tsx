import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import Link from 'next/link'

const pledgeSteps = [
  {
    title: 'Build or choose a welcoming Commander deck',
    description:
      'Participants choose a deck that is playable, approachable, and ready to bring someone into the game with a complete experience.',
  },
  {
    title: 'Ship the donated deck to DeckSwap',
    description:
      'The long-term idea is that users would send DeckSwap a deck so the platform can organize, inspect, and route it to a family, child, or community partner in need.',
  },
  {
    title: 'DeckSwap coordinates placement and fulfillment',
    description:
      'Instead of asking donors to find recipients one by one, DeckSwap could bundle, review, and place donated decks through trusted giving-back partners and holiday drives.',
  },
]

const buildGuidelines = [
  'Favor clear game plans over highly technical combo lines.',
  'Include lands, ramp, and removal so the deck feels complete out of the box.',
  'Use sleeves, tokens, and deck boxes when possible so the gift feels cared for.',
  'Avoid counterfeit cards, damaged cards, and incomplete mana bases.',
]

const recipientPrinciples = [
  'Recipient privacy should be protected.',
  'Distribution should happen through trusted families, schools, youth groups, libraries, or nonprofit partners.',
  'Decks should be screened for age-appropriate presentation and reasonable gameplay complexity.',
  'This page is a concept and pledge surface for now, not a live donation intake system.',
]

export default function HolidayGivebackPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="relative overflow-hidden border-b border-border bg-[radial-gradient(circle_at_top_left,rgba(123,255,196,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,214,122,0.12),transparent_30%),linear-gradient(180deg,#0f172a_0%,#09090b_100%)] py-24 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div>
                <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-emerald-200">
                  Holiday Initiative
                </div>
                <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                  Donate a Commander deck and help another family start playing
                </h1>
                <p className="mt-5 max-w-3xl text-lg text-zinc-200/85">
                  This campaign concept turns DeckSwap into a seasonal giving-back pledge: users
                  are encouraged to ship a complete Commander deck to DeckSwap so it can eventually
                  be routed to a child, family, or community partner who would love to open a deck
                  and join the game.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/import-deck"
                    className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
                  >
                    Import a deck to donate
                  </Link>
                  <Link
                    href="/info"
                    className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:bg-white/15"
                  >
                    Learn more about DeckSwap
                  </Link>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/25 p-6 backdrop-blur">
                <div className="text-sm font-medium text-emerald-200">Prototype campaign framing</div>
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-400">Pledge idea</div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      One usable deck can become one family&apos;s entry point into the game
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-400">What donors send</div>
                    <div className="mt-2 text-sm text-zinc-200/85">
                      A ready-to-play Commander deck, ideally sleeved and packaged in a way that
                      feels giftable.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-400">What DeckSwap coordinates</div>
                    <div className="mt-2 text-sm text-zinc-200/85">
                      Intake, basic review, holiday campaign organization, and later placement with
                      trusted recipients or partner groups.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {pledgeSteps.map((step) => (
              <div key={step.title} className="rounded-3xl border border-border bg-card p-6">
                <div className="inline-flex rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                  How It Works
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-foreground">{step.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-3xl border border-border bg-card p-8">
              <div className="inline-flex rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                Donor Guidelines
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                What makes a good donation deck
              </h2>
              <div className="mt-6 space-y-3">
                {buildGuidelines.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-border bg-secondary/30 px-4 py-4 text-sm text-muted-foreground"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-8">
              <div className="inline-flex rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                Recipient Care
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                Principles for giving this the right way
              </h2>
              <div className="mt-6 space-y-3">
                {recipientPrinciples.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-border bg-secondary/30 px-4 py-4 text-sm text-muted-foreground"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="text-sm font-medium text-emerald-200">Prototype note</div>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
                  Start by importing the deck you would be proud to give away
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-emerald-50/85">
                  This is still an initiative concept, not a live donation intake workflow. The
                  best next step is to let users identify a complete deck, import it, and signal
                  that it could be part of a future giving-back campaign once operations and
                  partnerships are in place.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/import-deck"
                  className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
                >
                  Import donation deck
                </Link>
                <Link
                  href="/guest-import"
                  className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:bg-white/15"
                >
                  Try guest preview
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
