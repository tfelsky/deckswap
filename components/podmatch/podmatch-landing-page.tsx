import Image from 'next/image'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Crown,
  Gift,
  Handshake,
  ListChecks,
  Medal,
  Scale,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import AppHeader from '@/components/app-header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'

type LandingItem = {
  icon: LucideIcon
  title: string
  body: string
}

type LandingStat = {
  value: string
  label: string
}

type LandingCta = {
  label: string
  href: string
}

export type PodmatchLandingContent = {
  audience: string
  title: string
  lead: string
  primaryCta: LandingCta
  secondaryCta: LandingCta
  stats: LandingStat[]
  outcomes: LandingItem[]
  steps: LandingItem[]
  fairness: LandingItem[]
  visual: 'players' | 'stores'
  finalTitle: string
  finalBody: string
}

function PlayerVisual() {
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-border bg-card shadow-[0_22px_70px_rgba(0,0,0,0.24)]">
      <Image
        src="/screenshots/actual-podmatch-play-clean.png"
        alt="Screenshot of the PodMatch event join screen"
        fill
        priority
        sizes="(min-width: 1024px) 42vw, 100vw"
        className="object-cover"
      />
    </div>
  )
}

function StoreVisual() {
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-border bg-card shadow-[0_22px_70px_rgba(0,0,0,0.24)]">
      <Image
        src="/screenshots/actual-podmatch-stores-clean.png"
        alt="Screenshot of the PodMatch for stores page"
        fill
        priority
        sizes="(min-width: 1024px) 42vw, 100vw"
        className="object-cover"
      />
    </div>
  )
}

function FeatureGrid({ items }: { items: LandingItem[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon

        return (
          <div key={item.title} className="rounded-lg border border-border bg-card p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
          </div>
        )
      })}
    </div>
  )
}

export function PodmatchLandingPage({ content }: { content: PodmatchLandingContent }) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader current="podmatch" isSignedIn={false} />
      <main className="pt-32">
        <section className="border-b border-border pb-16 pt-10 sm:pb-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
            <div className="self-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase text-primary/90">
                <Scale className="h-4 w-4" />
                {content.audience}
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl">
                {content.title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                {content.lead}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-12 min-w-[190px]" asChild>
                  <Link href={content.primaryCta.href}>
                    {content.primaryCta.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="h-12 min-w-[190px]" asChild>
                  <Link href={content.secondaryCta.href}>{content.secondaryCta.label}</Link>
                </Button>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {content.stats.map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-border bg-card/70 p-4">
                    <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {content.visual === 'players' ? <PlayerVisual /> : <StoreVisual />}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-border bg-secondary/45 px-4 py-1.5 text-xs font-medium uppercase text-primary/80">
              What PodMatch solves
            </div>
            <h2 className="mt-5 text-3xl font-bold text-foreground sm:text-4xl">
              More fun pairings without turning the night into an arms race.
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              PodMatch uses deck context, event goals, and league history to make tables feel fair,
              social, and worth coming back to.
            </p>
          </div>
          <div className="mt-10">
            <FeatureGrid items={content.outcomes} />
          </div>
        </section>

        <section className="border-y border-border bg-secondary/30 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
              <div>
                <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase text-primary/80">
                  Event flow
                </div>
                <h2 className="mt-5 text-3xl font-bold text-foreground">
                  Plan the night, run the games, keep the league alive.
                </h2>
                <p className="mt-4 leading-7 text-muted-foreground">
                  The landing pages point into the same PodMatch core: pairing, reporting,
                  standings, prize handling, and repeat league attendance.
                </p>
              </div>
              <FeatureGrid items={content.steps} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase text-primary/80">
                <Handshake className="h-4 w-4" />
                Built for table health
              </div>
              <h2 className="mt-5 text-3xl font-bold text-foreground sm:text-4xl">
                Balance should protect the experience, not punish strong decks.
              </h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                PodMatch gives stores and players shared language for power, expectations, prizes,
                and league progress so one player&apos;s optimized list does not flatten everyone
                else&apos;s night.
              </p>
            </div>
            <div className="grid gap-4">
              {content.fairness.map((item) => {
                const Icon = item.icon

                return (
                  <div key={item.title} className="flex gap-4 rounded-lg border border-border bg-card p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.body}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="bg-secondary/50 py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase text-primary/80">
              <Sparkles className="h-4 w-4" />
              PodMatch
            </div>
            <h2 className="mt-6 text-3xl font-bold text-foreground sm:text-4xl">
              {content.finalTitle}
            </h2>
            <p className="mt-4 text-muted-foreground">{content.finalBody}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="h-12" asChild>
                <Link href={content.primaryCta.href}>{content.primaryCta.label}</Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12" asChild>
                <Link href="/podmatch">Open PodMatch</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export const playerOutcomeItems: LandingItem[] = [
  {
    icon: Users,
    title: 'Find tables that fit',
    body: 'Join pods where deck speed, interaction, combo pressure, and casual expectations are close enough for a real game.',
  },
  {
    icon: CalendarDays,
    title: 'Plan event nights',
    body: 'See when store events are happening, check in quickly, and move from pairings to reported results without paper chaos.',
  },
  {
    icon: Trophy,
    title: 'Play for something',
    body: 'Track standings, prizes, tickets, and season progress without making every game feel like a cutthroat bracket.',
  },
]

export const storeOutcomeItems: LandingItem[] = [
  {
    icon: ListChecks,
    title: 'Run smoother Commander nights',
    body: 'Create events, check players in, generate pods, and keep table assignments understandable for staff and players.',
  },
  {
    icon: Gift,
    title: 'Handle prizes cleanly',
    body: 'Support store credit, raffle tickets, season points, and participation rewards without letting prizes distort the whole night.',
  },
  {
    icon: Medal,
    title: 'Build lasting leagues',
    body: 'Give regulars standings, history, and reasons to return while keeping newcomers from landing in impossible pods.',
  },
]

export const sharedFairnessItems: LandingItem[] = [
  {
    icon: Scale,
    title: 'Transparent power bands',
    body: 'Decks are grouped from explainable signals instead of vague vibes, so players can understand why a pod was made.',
  },
  {
    icon: BadgeCheck,
    title: 'Participation matters',
    body: 'League and prize structures can reward attendance, reporting, and sportsmanship alongside wins.',
  },
  {
    icon: Crown,
    title: 'Strong decks still have a home',
    body: 'High-power players can find appropriate tables without overpowering casual pods that came for a different kind of night.',
  },
]
