import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  MonitorPlay,
  PackageSearch,
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

const screenItems = [
  {
    label: 'Inventory spotlight',
    title: 'High-value Commander arrivals',
    detail: '4 new decks ready for local pickup',
    icon: PackageSearch,
  },
  {
    label: 'Tonight',
    title: 'Commander league pods',
    detail: 'Pairings, standings, and next-round timing',
    icon: Trophy,
  },
  {
    label: 'Special',
    title: 'Trade-in bonus weekend',
    detail: 'Push store promos without editing every screen',
    icon: BadgePercent,
  },
]

const featureCards = [
  {
    icon: MonitorPlay,
    title: 'Store-screen playlists',
    body:
      'Run clean, rotating signage for live inventory, featured decks, store specials, and event reminders on the screens customers already look at.',
  },
  {
    icon: RadioTower,
    title: 'Inventory feed display',
    body:
      'Turn Mythivex listings and store-picked products into screen-ready cards so high-intent shoppers see what is available before they reach the counter.',
  },
  {
    icon: CalendarDays,
    title: 'Tournament and league data',
    body:
      'Surface PodMatch leagues, pairings, standings, upcoming rounds, and weekly event promotion in the same visual system as your store inventory.',
  },
  {
    icon: BadgePercent,
    title: 'Specials without extra design work',
    body:
      'Promote trade-in bonuses, sealed product offers, local pickup calls, and clearance pushes without building a new graphic for every update.',
  },
]

const setupSteps = [
  {
    step: '01',
    title: 'Connect the store feed',
    body:
      'Start with Mythivex inventory and store-selected products, then choose which listings, categories, or promos are eligible for display.',
  },
  {
    step: '02',
    title: 'Pick screen blocks',
    body:
      'Mix inventory cards, event data, specials, QR calls, standings, and announcement slides into a simple rotation.',
  },
  {
    step: '03',
    title: 'Run in-store and online',
    body:
      'Use the same feed for counter screens, play-space TVs, event monitors, and web embeds when a store wants the channel online too.',
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

function SignagePreview() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
      <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(145deg,rgba(18,24,38,0.95),rgba(7,12,20,0.98))]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-primary/80">LGS TV Live</div>
            <div className="mt-1 text-lg font-semibold text-white">Mythivex Store Channel</div>
          </div>
          <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
            On screen
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[1.25rem] border border-primary/20 bg-primary/10 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-primary/80">
                  Featured inventory
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  Atraxa Superfriends
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Complete Commander deck, sleeved and pickup-ready.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                <div className="text-xs text-zinc-400">Tracked value</div>
                <div className="mt-1 text-2xl font-semibold text-white">$420</div>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3 text-center text-xs text-zinc-300">
              {['Tokens included', 'Trade offers open', 'QR to listing'].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {screenItems.map((item) => {
              const Icon = item.icon

              return (
                <div key={item.title} className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-primary/75">
                        {item.label}
                      </div>
                      <div className="mt-1 font-medium text-white">{item.title}</div>
                      <div className="mt-1 text-xs leading-5 text-zinc-400">{item.detail}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 text-xs text-zinc-400">
          <span>Inventory, specials, and events rotate automatically</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">mythivex.com/lgs-tv</span>
        </div>
      </div>
    </div>
  )
}

export default function LgsTvPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="relative overflow-hidden border-b border-border/70 py-20 sm:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(113,255,196,0.16),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(255,208,102,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
                <MonitorPlay className="h-4 w-4" />
                LGS TV
              </div>
              <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Digital signage for the inventory and events your store is already running.
              </h1>
              <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
                LGS TV turns Mythivex inventory feeds, store specials, and tournament data into a
                screen-ready channel for local game store TVs, counter displays, event monitors, and
                online embeds.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-12 min-w-[190px]" asChild>
                  <Link href={LGS_TV_MAILTO}>
                    Ask about LGS TV
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="h-12 min-w-[190px]" asChild>
                  <Link href="/for-stores">Store program</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {['Inventory feed', 'Specials', 'Tournament data', 'Online channel'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <SignagePreview />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-border bg-secondary/40 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
              Store Media Layer
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Give every screen a useful job.
            </h2>
            <p className="mt-4 text-muted-foreground">
              The product is built around store operations, not generic ad loops. Each screen can
              pull from inventory, events, specials, and customer calls that already belong in the
              Mythivex store workflow.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((feature) => {
              const Icon = feature.icon

              return (
                <div key={feature.title} className="rounded-[1.5rem] border border-border bg-card/80 p-6">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.body}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="border-y border-border bg-secondary/30 py-14">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
            {setupSteps.map((item) => (
              <div key={item.step} className="rounded-[1.5rem] border border-border bg-card/70 p-6">
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
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="deckswap-accent rounded-[2rem] p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-foreground/80">
                <Sparkles className="h-4 w-4" />
                Why it belongs in Mythivex
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                LGS TV makes the marketplace visible inside the store.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                A store can list decks, promote sealed or singles inventory, run PodMatch events,
                and keep the same offer visible on the wall, at the counter, and online. The result
                is less duplicated marketing work and more customer attention on live inventory.
              </p>
            </div>

            <div className="rounded-[2rem] border border-border bg-card/75 p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { icon: Clock3, title: 'Timed rotations', body: 'Different content can lead before FNM, between rounds, or during normal retail hours.' },
                  { icon: Settings, title: 'Store controls', body: 'Stores can choose which feeds and offers deserve screen time.' },
                  { icon: Trophy, title: 'Event visibility', body: 'Tournament data gives players a reason to check the screens between matches.' },
                  { icon: PackageSearch, title: 'Inventory demand', body: 'Featured products become easier to discover without adding counter work.' },
                ].map((item) => {
                  const Icon = item.icon

                  return (
                    <div key={item.title} className="rounded-[1.4rem] border border-border bg-background/35 p-5">
                      <Icon className="h-5 w-5 text-primary" />
                      <h3 className="mt-4 font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                    </div>
                  )
                })}
              </div>
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
              Bring Mythivex inventory and events to your screens.
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
