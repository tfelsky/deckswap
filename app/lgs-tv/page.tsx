import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  Clock3,
  Mail,
  MonitorPlay,
  PackageSearch,
  QrCode,
  RadioTower,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'

const PARTNER_EMAIL = 'partners@mythivex.com'
const LGS_TV_MAILTO = `mailto:${PARTNER_EMAIL}?subject=Mythivex%20LGS%20TV`

const heroSignals = [
  'Promote live inventory',
  'Guide event traffic',
  'Sell from every screen',
  'Update once',
]

const screenFeeds = [
  {
    icon: PackageSearch,
    eyebrow: 'Inventory',
    title: 'Show what is ready to buy',
    body: 'Feature decks, sealed product, singles, and pickup offers while shoppers are in-store.',
  },
  {
    icon: Trophy,
    eyebrow: 'Events',
    title: 'Keep players oriented',
    body: 'Put round timing, pairings, standings, and next events where players already look.',
  },
  {
    icon: BadgePercent,
    eyebrow: 'Retail',
    title: 'Run simple promos',
    body: 'Push trade-in bonuses, local pickup, and weekend offers without making new posters.',
  },
]

const productModes = [
  {
    icon: MonitorPlay,
    title: 'Better use of wall space',
    body: 'Turn passive TVs into useful selling surfaces.',
  },
  {
    icon: RadioTower,
    title: 'Less staff repetition',
    body: 'Screens answer common event and promo questions.',
  },
  {
    icon: QrCode,
    title: 'More action from shoppers',
    body: 'QR calls make listings and pickup offers easier to open.',
  },
]

const setupSteps = [
  {
    step: '01',
    title: 'Connect the feed',
    body: 'Choose which Mythivex listings, promos, and events can appear on-screen.',
  },
  {
    step: '02',
    title: 'Build the rotation',
    body: 'Pick a few blocks: inventory, events, promos, QR calls, or announcements.',
  },
  {
    step: '03',
    title: 'Let it run',
    body: 'Use the same channel at the counter, in the play space, and online.',
  },
]

const trustPoints = [
  {
    icon: Clock3,
    title: 'Timed to the day',
    body: 'Events before play, promos between rounds, inventory during retail hours.',
  },
  {
    icon: Sparkles,
    title: 'No design bottleneck',
    body: 'Change the offer without remaking the sign.',
  },
]

const imageBreaks = [
  {
    src: '/lgs-tv-counter-screen.png',
    alt: 'Store counter with a simple LGS TV screen above it',
    title: 'Sell what is in the shop',
    body: 'Feature pickup-ready inventory at the counter.',
  },
  {
    src: '/lgs-tv-event-screen.png',
    alt: 'Game store play space with a simple event screen',
    title: 'Help event nights run cleaner',
    body: 'Make pairings, timing, and promos easier to see.',
  },
  {
    src: '/lgs-tv-pickup-screen.png',
    alt: 'Game store counter display with a simple pickup callout',
    title: 'Make the next step obvious',
    body: 'Point shoppers toward listings, pickups, and offers.',
  },
]

export const metadata: Metadata = {
  title: 'LGS TV | Mythiverse Exchange',
  description:
    'LGS TV is a Mythivex digital signage product for local game stores, showing inventory feeds, specials, tournament data, and event content on store screens and online.',
  alternates: {
    canonical: '/lgs-tv',
  },
}

function ScreenTicker() {
  return (
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 pb-10 sm:px-6 lg:px-8">
      {heroSignals.map((signal) => (
        <span
          key={signal}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-2 text-sm text-white shadow-[0_12px_34px_rgba(0,0,0,0.24)] backdrop-blur-md"
        >
          <CheckCircle2 className="h-4 w-4 text-primary" />
          {signal}
        </span>
      ))}
    </div>
  )
}

function LiveChannelGraphic() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.04fr_0.96fr]">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/40 px-5 py-4">
          <div className="min-w-0">
            <div className="whitespace-nowrap text-sm font-semibold text-foreground">
              LGS TV Live <span className="text-muted-foreground">/</span> Store Channel
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              A simple loop for inventory, events, and offers
            </div>
          </div>
          <div className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs text-primary">
            On air
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-primary/75">
              Featured inventory
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
              Pickup-ready decks
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A clean screen moment for products customers can ask about now.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
              {['Featured', 'Pickup', 'Scan'].map((item) => (
                <div key={item} className="rounded-xl border border-border bg-background/35 px-3 py-3">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {screenFeeds.map((item) => {
              const Icon = item.icon

              return (
                <div key={item.title} className="rounded-lg border border-border bg-background/35 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-primary/75">
                        {item.eyebrow}
                      </div>
                      <div className="mt-1 font-medium text-foreground">{item.title}</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
        {productModes.map((mode) => {
          const Icon = mode.icon

          return (
            <div key={mode.title} className="rounded-lg border border-border bg-card/75 p-5">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-semibold text-foreground">{mode.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{mode.body}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ImageBreaks() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
      <div className="grid gap-5 md:grid-cols-3">
        {imageBreaks.map((item) => (
          <figure key={item.src} className="overflow-hidden rounded-xl border border-border bg-card/70">
            <div className="relative aspect-[16/10]">
              <Image src={item.src} alt={item.alt} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
            </div>
            <figcaption className="p-5">
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

export default function LgsTvPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="relative min-h-[calc(88svh-4rem)] overflow-hidden border-b border-border bg-black">
          <Image
            src="/lgs-tv-hero.png"
            alt="Local game store screens showing Mythivex LGS TV signage"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,10,16,0.92),rgba(7,10,16,0.65)_46%,rgba(7,10,16,0.22)),linear-gradient(180deg,rgba(7,10,16,0.18),rgba(7,10,16,0.78))]" />
          <div className="relative flex min-h-[calc(88svh-4rem)] flex-col justify-end">
            <div className="mx-auto w-full max-w-7xl px-4 pb-8 pt-20 sm:px-6 lg:px-8">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary backdrop-blur-md">
                  <MonitorPlay className="h-4 w-4" />
                  LGS TV
                </div>
                <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Turn every store screen into a live Mythivex channel.
                </h1>
                <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-zinc-200">
                  Digital signage for local game stores: promote inventory, guide event nights,
                  and keep customers pointed at the next action.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" className="h-12 min-w-[190px]" asChild>
                    <Link href={LGS_TV_MAILTO}>
                      Ask about LGS TV
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 min-w-[190px] border-white/20 bg-black/20 text-white hover:bg-white/10 hover:text-white"
                    asChild
                  >
                    <Link href="/for-stores">Store program</Link>
                  </Button>
                </div>
              </div>
            </div>
            <ScreenTicker />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
            <div>
              <div className="inline-flex rounded-full border border-border bg-secondary/40 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
                Store Media Layer
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Make screens earn their wall space.
              </h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                Most shops already have TVs. LGS TV turns them into simple, current signage for the
                things that matter in-store: what is for sale, what is happening tonight, and what
                players should do next.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {trustPoints.map((point) => {
                  const Icon = point.icon

                  return (
                    <div key={point.title} className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{point.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{point.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <LiveChannelGraphic />
          </div>
        </section>

        <ImageBreaks />

        <section className="border-y border-border bg-secondary/30 py-14">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
            {setupSteps.map((item) => (
              <div key={item.step} className="rounded-lg border border-border bg-card/70 p-6">
                <div className="text-sm font-semibold tracking-[0.28em] text-primary/70">
                  {item.step}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden bg-secondary/50 py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
              <MonitorPlay className="h-4 w-4" />
              Pilot Access
            </div>
            <h2 className="mt-6 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Use your screens to sell more and answer faster.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Tell us how many screens you run and which store moments matter most: inventory,
              events, promos, pickup, or all of the above.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="h-12" asChild>
                <Link href={LGS_TV_MAILTO}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email partnerships
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12" asChild>
                <Link href="/support">Talk to support</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
