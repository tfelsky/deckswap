import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BadgePercent,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  MonitorPlay,
  PackageSearch,
  QrCode,
  RadioTower,
  Settings,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'

const PARTNER_EMAIL = 'partners@mythivex.com'
const LGS_TV_MAILTO = `mailto:${PARTNER_EMAIL}?subject=Mythivex%20LGS%20TV`

const heroSignals = [
  'Live inventory spotlight',
  'PodMatch event data',
  'Store promos',
  'Online channel ready',
]

const screenFeeds = [
  {
    icon: PackageSearch,
    eyebrow: 'Inventory',
    title: 'High-value deck arrivals',
    body: 'Feature complete Commander decks, buylist finds, sealed drops, and local pickup offers.',
  },
  {
    icon: Trophy,
    eyebrow: 'Events',
    title: 'League night status',
    body: 'Show pod pairings, round timing, standings, and upcoming store events on the same loop.',
  },
  {
    icon: BadgePercent,
    eyebrow: 'Retail',
    title: 'Trade-in bonus weekend',
    body: 'Run time-boxed promos without rebuilding a graphic for every offer or screen.',
  },
]

const productModes = [
  {
    icon: MonitorPlay,
    title: 'Counter Screens',
    body: 'Put high-margin listings and pickup calls where staff and shoppers already meet.',
  },
  {
    icon: RadioTower,
    title: 'Play Space TVs',
    body: 'Rotate round timing, standings, announcements, and product moments between matches.',
  },
  {
    icon: QrCode,
    title: 'Web Embeds',
    body: 'Reuse the same store channel online when a shop wants an always-current public feed.',
  },
  {
    icon: Settings,
    title: 'Store Controls',
    body: 'Choose eligible inventory, promo blocks, event modules, and screen priorities.',
  },
]

const setupSteps = [
  {
    step: '01',
    title: 'Connect the feed',
    body: 'Start with Mythivex listings, store-picked products, and PodMatch events already tied to the store.',
  },
  {
    step: '02',
    title: 'Build the rotation',
    body: 'Mix inventory cards, tournament data, specials, QR calls, announcements, and pickup prompts.',
  },
  {
    step: '03',
    title: 'Run the channel',
    body: 'Use the same content stream for store TVs, counter displays, event monitors, and web embeds.',
  },
]

const trustPoints = [
  {
    icon: Clock3,
    title: 'Timed rotations',
    body: 'Lead with event details before round start, then switch to promos and inventory between games.',
  },
  {
    icon: BarChart3,
    title: 'Useful sales surface',
    body: 'Screens stop being wallpaper and start pointing customers at real listings and actions.',
  },
  {
    icon: Sparkles,
    title: 'No design queue',
    body: 'Store staff can change what gets screen time without making a new poster for each update.',
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
    <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
      <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_22px_70px_rgba(0,0,0,0.24)]">
        <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-5 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-primary/80">LGS TV Live</div>
            <div className="mt-1 text-lg font-semibold text-foreground">Store Channel</div>
          </div>
          <div className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs text-primary">
            On air
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.25rem] border border-primary/20 bg-primary/10 p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-primary/75">
              Featured inventory
            </div>
            <h3 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
              Atraxa Superfriends
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Complete Commander deck, sleeved and pickup-ready.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
              {['Tokens', 'Trade open', 'QR listing'].map((item) => (
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
                <div key={item.title} className="rounded-[1.25rem] border border-border bg-background/35 p-4">
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
            <div key={mode.title} className="rounded-[1.25rem] border border-border bg-card/75 p-5">
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
                  LGS TV brings inventory, specials, tournament timing, standings, QR calls, and
                  pickup-ready listings onto the screens your players already watch.
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
                Give the wall, counter, and play space the same source of truth.
              </h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                The channel pulls from operational data a store already manages: live Mythivex
                inventory, store-picked promotions, and PodMatch event activity. Less duplicated
                marketing work, more useful screen time.
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

        <section className="border-y border-border bg-secondary/30 py-14">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
            {setupSteps.map((item) => (
              <div key={item.step} className="rounded-[1.25rem] border border-border bg-card/70 p-6">
                <div className="text-sm font-semibold tracking-[0.28em] text-primary/70">
                  {item.step}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
                <CalendarDays className="h-4 w-4" />
                Built For Store Rhythm
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                One loop can sell inventory, guide players, and advertise the next event.
              </h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                LGS TV is not a generic slideshow. It is a channel for the useful moments in a game
                store: what is for sale, what is happening tonight, what is worth scanning, and
                what players should do next.
              </p>
            </div>

            <div className="grid gap-3">
              {screenFeeds.map((feed) => {
                const Icon = feed.icon

                return (
                  <div key={feed.title} className="rounded-[1.25rem] border border-border bg-card/75 p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-primary/75">
                          {feed.eyebrow}
                        </div>
                        <h3 className="mt-1 font-semibold text-foreground">{feed.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{feed.body}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-secondary/50 py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
              <MonitorPlay className="h-4 w-4" />
              Pilot Access
            </div>
            <h2 className="mt-6 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Put Mythivex on the screens that drive store attention.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Tell us how many screens you run, what inventory feed matters most, and whether you
              want LGS TV in-store only or online too.
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
