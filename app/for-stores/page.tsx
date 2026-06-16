import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  Gauge,
  Mail,
  PackageCheck,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'

const PARTNER_EMAIL = 'partners@mythivex.com'
const PARTNER_MAILTO = `mailto:${PARTNER_EMAIL}?subject=Mythiverse%20Exchange%20store%20partnership`

const benefits = [
  {
    icon: BadgeDollarSign,
    title: 'Higher-ticket sales',
    body:
      'List complete Commander decks instead of grinding singles one card at a time. A finished deck moves at a deck price, with the commander, colors, and tokens doing the selling for you.',
  },
  {
    icon: Gauge,
    title: 'Move slow inventory',
    body:
      'Trade-in piles and collection buys that sit in the back can become live listings the same day. Clear the shelf and turn dead stock into cash flow.',
  },
  {
    icon: PackageCheck,
    title: 'Pricing without the guesswork',
    body:
      'Import a list and get a whole-deck valuation in minutes. Anchor your trade-in offers and counter prices to real numbers instead of eyeballing a binder.',
  },
  {
    icon: ShieldCheck,
    title: 'Protected fulfillment',
    body:
      'Premium escrow for high-value deals and holdback-backed direct shipping mean fewer chargebacks, fewer disputes, and less risk on every deck that leaves the store.',
  },
  {
    icon: Users,
    title: 'Bring players back in',
    body:
      'Offer local pickup and use PodMatch leagues to fill tables. Online listings become a reason for nearby players to walk through your door.',
  },
  {
    icon: Store,
    title: 'No upfront cost',
    body:
      'No new POS to install and no monthly software fee to start. Create a store account, list your first decks, and only pay when a deck sells.',
  },
]

const steps = [
  {
    step: '01',
    title: 'Import your trade-in decks',
    body:
      'Paste a list or import from your usual deck tools. Each list becomes a polished, market-ready listing with value, colors, and tokens already filled in.',
  },
  {
    step: '02',
    title: 'Price with confidence',
    body:
      'Use the whole-deck valuation to set a fair buy price and a profitable list price. Pick the lane that fits each deck: marketplace, Buy It Now, or auction.',
  },
  {
    step: '03',
    title: 'Sell, ship, or hand off locally',
    body:
      'Close online with protected shipping and escrow, or offer local pickup to pull players into the store. You keep the customer relationship either way.',
  },
]

const stats = [
  { value: '1 deck', label: 'is worth dozens of singles transactions' },
  { value: 'Minutes', label: 'from trade-in list to live listing' },
  { value: '$0', label: 'to create a store account and start listing' },
]

export const metadata: Metadata = {
  title: 'For Local Game Stores | Mythiverse Exchange',
  description:
    'Mythiverse Exchange helps local game stores turn trade-in decks and collection buys into a new revenue lane: whole-deck valuation, protected fulfillment, and local pickup that brings players back in.',
}

export default function ForStoresPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-background to-secondary/20 py-20 sm:py-28">
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          </div>
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
              <Store className="h-4 w-4" />
              For Local Game Stores
            </div>
            <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Turn trade-ins into a new <span className="text-primary">revenue lane</span>
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
              Mythiverse Exchange turns the Commander decks and collections sitting in your back
              room into market-ready listings. Sell complete decks at deck prices, ship with built-in
              protection, and give nearby players a reason to come back.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-12 min-w-[200px]" asChild>
                <Link href={PARTNER_MAILTO}>
                  Become a partner store
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12 min-w-[200px]" asChild>
                <Link href="/decks">See the marketplace</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Escrow &amp; holdback-backed coverage
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
                No upfront cost
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
                Local pickup supported
              </span>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Why stores list with us
            </h2>
            <p className="mt-4 text-muted-foreground">
              Built for the realities of a game store: trade-ins you need to move, margins you need
              to protect, and players you want walking through the door.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <div
                  key={benefit.title}
                  className="rounded-3xl border border-border bg-card p-6"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{benefit.body}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Stat band */}
        <section className="border-y border-border bg-secondary/30 py-12">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              How it works for your store
            </h2>
            <p className="mt-4 text-muted-foreground">
              Three steps from a stack of trade-ins to money in the till. No new hardware, no
              workflow overhaul.
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {steps.map((item) => (
              <div key={item.step} className="rounded-3xl border border-border bg-card p-8">
                <div className="text-sm font-semibold tracking-[0.3em] text-primary/70">
                  {item.step}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden bg-secondary/50 py-20">
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          </div>
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
              <CalendarClock className="h-4 w-4" />
              Partner program
            </div>
            <h2 className="mt-6 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Let&apos;s get your decks listed
            </h2>
            <p className="mt-4 text-muted-foreground">
              Tell us about your store and the kind of inventory you move. We&apos;ll get you set up
              with a store account and walk through the first listings together.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="h-12" asChild>
                <Link href={PARTNER_MAILTO}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email our partnerships team
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12" asChild>
                <Link href="/support">Talk to support</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Prefer to reach out directly? Email{' '}
              <a href={PARTNER_MAILTO} className="text-primary hover:underline">
                {PARTNER_EMAIL}
              </a>
              .
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
