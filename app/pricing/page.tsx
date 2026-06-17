import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarDays,
  Check,
  Mail,
  Megaphone,
  MonitorPlay,
  PackageSearch,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'

const PARTNER_EMAIL = 'partners@mythivex.com'
const PARTNER_MAILTO = `mailto:${PARTNER_EMAIL}?subject=Mythiverse%20Exchange%20store%20pricing`

const plans = [
  {
    name: 'Store Presence',
    price: '$99',
    cadence: '/mo',
    description: 'For smaller stores that want a public Mythivex footprint and a low-risk way in.',
    fee: '8% marketplace fee',
    cta: 'Start with Presence',
    featured: false,
    features: [
      'Store profile page',
      'Calendar of events',
      'Marketplace listing access',
      'Basic sell-singles page',
      '1 staff login',
      'Basic store analytics',
    ],
  },
  {
    name: 'Store Growth',
    price: '$249',
    cadence: '/mo',
    description: 'The default LGS plan for singles, events, PodMatch, screens, and local demand.',
    fee: '6% marketplace fee',
    cta: 'Choose Growth',
    featured: true,
    features: [
      'Full singles marketplace tools',
      '1 LGS TV screen license',
      'PodMatch Level 1',
      '2 local email blasts per month',
      '3 staff logins',
      'Local pickup and reservation flows',
    ],
  },
  {
    name: 'Store Network',
    price: '$499',
    cadence: '/mo',
    description: 'For serious event stores that want stronger reach, more screens, and deeper PodMatch.',
    fee: '4% marketplace fee',
    cta: 'Talk about Network',
    featured: false,
    features: [
      'Everything in Store Growth',
      '4 LGS TV screen licenses',
      'PodMatch Level 2',
      '6 local email blasts per month',
      'Featured calendar placement',
      '10 staff logins and advanced event reporting',
    ],
  },
]

const addons = [
  {
    icon: MonitorPlay,
    title: 'Extra LGS TV screens',
    price: '$29/screen/mo',
    body: 'Screens, physical install, and device setup are not included.',
  },
  {
    icon: Users,
    title: 'PodMatch Level 3',
    price: '+$199/mo',
    body: 'City-wide events, sponsored pods, cross-store matchmaking, and advanced reporting.',
  },
  {
    icon: Megaphone,
    title: 'Extra local blast',
    price: '$49 each',
    body: 'Opt-in, geo-filtered audience only. Mythivex keeps final approval on send quality.',
  },
  {
    icon: Store,
    title: 'Remote onboarding',
    price: '$149 one-time',
    body: 'A guided setup session for listings, calendar, store profile, and first screen rotation.',
  },
]

const podmatchLevels = [
  {
    level: 'Level 1',
    title: 'Store events',
    body: 'Create Commander events, generate pods, and publish weekly play nights.',
  },
  {
    level: 'Level 2',
    title: 'Leagues and retention',
    body: 'Recurring leagues, player history, pod preferences, and repeat attendance tracking.',
  },
  {
    level: 'Level 3',
    title: 'City-wide play',
    body: 'Multi-store events, sponsored pods, cross-store matchmaking, and deeper reports.',
  },
]

const marketplaceRows = [
  ['Public singles sale', '4-8% by plan'],
  ['Local pickup reservation', '2% or $0.50/item minimum'],
  ['Featured store placement', 'Included on Network'],
  ['Annual contract', '2 months free'],
]

export const metadata: Metadata = {
  title: 'Store Pricing | Mythiverse Exchange',
  description:
    'Pricing for local game stores using Mythiverse Exchange store profiles, singles marketplace tools, events, LGS TV, PodMatch, and local email blasts.',
  alternates: {
    canonical: '/pricing',
  },
}

function PlanCard({ plan }: { plan: (typeof plans)[number] }) {
  return (
    <div
      className={`relative flex h-full flex-col rounded-lg border p-6 ${
        plan.featured
          ? 'border-primary/45 bg-primary/10 shadow-[0_24px_80px_rgba(0,0,0,0.22)]'
          : 'border-border bg-card/80'
      }`}
    >
      {plan.featured ? (
        <div className="absolute right-5 top-5 rounded-full border border-primary/30 bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          Best fit
        </div>
      ) : null}
      <div className="pr-24">
        <h2 className="text-xl font-semibold text-foreground">{plan.name}</h2>
        <p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-muted-foreground">
          {plan.description}
        </p>
      </div>
      <div className="mt-6 flex items-end gap-1">
        <span className="text-4xl font-bold tracking-tight text-foreground">{plan.price}</span>
        <span className="pb-1 text-sm text-muted-foreground">{plan.cadence}</span>
      </div>
      <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background/50 px-3 py-1 text-xs font-medium text-foreground">
        <BadgeDollarSign className="h-4 w-4 text-primary" />
        {plan.fee}
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3 text-sm leading-6 text-muted-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button className="mt-7 h-11 w-full" variant={plan.featured ? 'default' : 'outline'} asChild>
        <Link href={PARTNER_MAILTO}>
          {plan.cta}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="relative overflow-hidden border-b border-border bg-black">
          <Image
            src="/screenshots/actual-pricing-clean.png"
            alt="Screenshot of the Mythivex store pricing page"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,10,16,0.94),rgba(7,10,16,0.72)_48%,rgba(7,10,16,0.28)),linear-gradient(180deg,rgba(7,10,16,0.22),rgba(7,10,16,0.82))]" />
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary backdrop-blur-md">
                <Store className="h-4 w-4" />
                Store Pricing
              </div>
              <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                One store plan for marketplace sales, events, screens, and player demand.
              </h1>
              <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-zinc-200">
                Mythiverse Exchange gives local game stores a public profile, sell-singles tools,
                event calendar, LGS TV, PodMatch, and controlled email reach into nearby opted-in
                players.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-12 min-w-[190px]" asChild>
                  <Link href={PARTNER_MAILTO}>
                    Email partnerships
                    <Mail className="ml-2 h-4 w-4" />
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
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full border border-border bg-secondary/40 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
              Monthly Plans
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Start simple. Upgrade when store demand justifies it.
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Growth is the recommended default. Presence keeps the entry price low, while Network
              is built for stores treating events and singles as a serious operating lane.
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-secondary/30 py-14">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
            <div>
              <div className="inline-flex rounded-full border border-border bg-background/60 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
                Marketplace Fees
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                Keep fees tied to the value Mythivex creates.
              </h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                Subscription covers the store operating layer. Marketplace fees stay lower on higher
                tiers because those stores are already paying for reach, tooling, and screens.
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-card/80">
              {marketplaceRows.map(([label, value]) => (
                <div
                  key={label}
                  className="grid gap-2 border-b border-border px-5 py-4 last:border-b-0 sm:grid-cols-[1fr_auto]"
                >
                  <div className="font-medium text-foreground">{label}</div>
                  <div className="text-sm text-muted-foreground sm:text-right">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <div className="inline-flex rounded-full border border-border bg-secondary/40 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
                Access Levels
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                PodMatch grows from event support to a city-wide play network.
              </h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                Stores can start with basic event creation and pod generation, then unlock league
                tools and cross-store programming when the audience is ready.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {podmatchLevels.map((item) => (
                <div key={item.level} className="rounded-lg border border-border bg-card/80 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/75">
                    {item.level}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {addons.map((item) => {
              const Icon = item.icon

              return (
                <div key={item.title} className="rounded-lg border border-border bg-card/80 p-6">
                  <Icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-4 font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-xl font-bold text-foreground">{item.price}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="relative overflow-hidden bg-secondary/50 py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
              <CalendarDays className="h-4 w-4" />
              Launch Offer
            </div>
            <h2 className="mt-6 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              First 20 partner stores can lock Growth at $199/mo for 12 months.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Annual contracts receive two months free. We will confirm final blast audience,
              screen count, PodMatch level, and onboarding needs before billing starts.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="h-12" asChild>
                <Link href={PARTNER_MAILTO}>
                  <Mail className="mr-2 h-4 w-4" />
                  Ask about store pricing
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12" asChild>
                <Link href="/lgs-tv">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Review LGS TV
                </Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
              <span className="rounded-full border border-border bg-card px-3 py-1.5">
                Opt-in email audiences only
              </span>
              <span className="rounded-full border border-border bg-card px-3 py-1.5">
                Screen hardware and install not included
              </span>
              <span className="rounded-full border border-border bg-card px-3 py-1.5">
                Store data remains permissioned
              </span>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
