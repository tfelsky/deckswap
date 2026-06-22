import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  Mail,
  PackageCheck,
  PackageOpen,
  Repeat2,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  UploadCloud,
} from 'lucide-react'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'

const PARTNER_EMAIL = 'partners@mythivex.com'
const SUBSCRIPTIONS_MAILTO = `mailto:${PARTNER_EMAIL}?subject=Prebuy%20subscription%20manager`

const heroSignals = [
  'Recurring pull lists',
  'MTG set prebuys',
  'Lorcana preorder slots',
  '2027/2028 set passes',
  'Secret Lair commitments',
  'Card-on-file billing',
  '3-month hold window',
  'Release-day ship batches',
]

const importSources = [
  {
    icon: FileSpreadsheet,
    title: 'Distributor catalogs and allocations',
    body: 'Upload CSV or XLSX files for upcoming comics, MTG and Lorcana sealed product, Secret Lair drops, allocations, preorder windows, variants, covers, and publisher metadata.',
  },
  {
    icon: UploadCloud,
    title: 'POS and ecommerce exports',
    body: 'Map ISBN, UPC, SKU, title, set, drop, issue, cover, customer, quantity, deposit, commitment, and product-type fields from the tools your shop already uses.',
  },
  {
    icon: ClipboardList,
    title: 'Manual shop entry',
    body: 'Add a one-off issue, customer request, booster box, prerelease kit, bundle, replacement copy, or staff note without waiting for the next import cycle.',
  },
]

const workflowSteps = [
  {
    step: '01',
    title: 'Import the release list',
    body: 'Bring in upcoming comics, MTG and Lorcana sealed product, Secret Lair drops, and allocation files, then map titles, sets, SKUs, release dates, preorder dates, and order windows.',
  },
  {
    step: '02',
    title: 'Create recurring pulls or prebuys',
    body: 'Staff can log a customer subscription by comic title, MTG set, Lorcana set, Secret Lair drop, product type, variant preference, quantity, pickup or mail preference, and card-on-file status.',
  },
  {
    step: '03',
    title: 'Reserve, hold, and batch',
    body: 'Customers can reserve product as soon as a set is opened for preorder, subscribe to future releases, or hold shipments for one, two, or three months.',
  },
  {
    step: '04',
    title: 'Charge and ship',
    body: 'The batch calculates comics, sealed product, deposits, taxes, postage, and failed-card exceptions before the store confirms capture and prints the mailing queue.',
  },
]

const pullboxRows = [
  {
    customer: 'Maya R.',
    plan: 'Batman family + indie horror',
    hold: '2 of 3 months',
    balance: '$84.40',
    status: 'Holding',
  },
  {
    customer: 'Jon P.',
    plan: 'X-Men line, main covers',
    hold: '3 of 3 months',
    balance: '$126.75',
    status: 'Ship batch',
  },
  {
    customer: 'Ari K.',
    plan: 'Saga, Energon Universe, creator-owned',
    hold: '1 of 3 months',
    balance: '$42.10',
    status: 'Next pull',
  },
]

const prebuyRows = [
  {
    customer: 'Theo G.',
    plan: 'Named 2026 MTG and Lorcana releases + TBA future slots',
    product: '1 play booster box + bundle per set',
    trigger: 'Reserve when distributor SKU opens',
    status: 'Multi-year pass',
  },
  {
    customer: 'Lena S.',
    plan: 'Next TCG set release',
    product: 'Collector box, prerelease kit, or trove',
    trigger: 'Charge deposit at preorder',
    status: 'Prebuy',
  },
  {
    customer: 'Store queue',
    plan: '2027/2028 set-year watchlist',
    product: 'Draft night kits, troves, bundles, boxes',
    trigger: 'Create rows from official allocation import',
    status: 'Awaiting SKUs',
  },
  {
    customer: 'Nora V.',
    plan: 'Secret Lair commitment list',
    product: 'Drop-specific bundles and singles intents',
    trigger: 'Confirm when official drop window opens',
    status: 'Commitment',
  },
]

const mtgReleaseRows = [
  {
    set: 'Magic: The Gathering | Marvel Super Heroes',
    window: 'Events start Jun 19; release Jun 26, 2026',
    source: 'Wizards product page',
    href: 'https://magic.wizards.com/en/products/marvel/marvel-super-heroes',
  },
  {
    set: 'Magic: The Gathering | The Hobbit',
    window: 'Release Aug 14, 2026',
    source: 'Wizards product page',
    href: 'https://magic.wizards.com/en/products/the-hobbit',
  },
  {
    set: 'Reality Fracture',
    window: 'Release Oct 2, 2026',
    source: 'Wizards product page',
    href: 'https://magic.wizards.com/en/products/reality-fracture',
  },
  {
    set: 'Magic: The Gathering | Star Trek',
    window: 'Release Nov 13, 2026',
    source: 'Wizards product page',
    href: 'https://magic.wizards.com/en/products/star-trek',
  },
  {
    set: '2027 and early 2028 MTG release slots',
    window: 'Official set names and dated product pages not published yet',
    source: 'Hold as TBA preorder slots',
    href: null,
  },
]

const lorcanaReleaseRows = [
  {
    set: 'Disney Lorcana: Winterspell',
    window: 'LGS release Feb 13; retail release Feb 20, 2026',
    source: 'Release-date coverage',
    href: 'https://www.gamesradar.com/tabletop-gaming/everything-you-need-to-know-about-disney-lorcana-winterspell/',
  },
  {
    set: 'Disney Lorcana: Wilds Unknown',
    window: 'LGS release May 8; retail release May 15, 2026',
    source: 'Release-date coverage',
    href: 'https://www.techradar.com/streaming/entertainment/pixar-is-joining-disney-lorcana-for-the-first-time-with-the-incredibles-heres-an-exclusive-look-at-4-cards',
  },
  {
    set: 'Disney Lorcana: Attack of the Vine',
    window: 'Q3 2026; exact LGS and retail dates not published yet',
    source: 'Set-list coverage',
    href: 'https://en.wikipedia.org/wiki/Disney_Lorcana',
  },
  {
    set: 'Disney Lorcana: Hyperia City',
    window: 'Q4 2026; exact LGS and retail dates not published yet',
    source: 'Set-list coverage',
    href: 'https://en.wikipedia.org/wiki/Disney_Lorcana',
  },
  {
    set: '2027 and early 2028 Lorcana release slots',
    window: 'Official set names and dated product pages not published yet',
    source: 'Hold as TBA preorder slots',
    href: null,
  },
]

const batchCards = [
  {
    icon: CreditCard,
    title: 'Tokenized card-on-file',
    body: 'Keep raw card numbers out of the store workflow. Staff only see payment readiness, authorization status, and failed capture tasks.',
  },
  {
    icon: PackageOpen,
    title: 'Hold bins by customer',
    body: 'Track month-one, month-two, and final-month pulls before the account must convert to pickup, ship, or staff review.',
  },
  {
    icon: Truck,
    title: 'Shipment and release batch queue',
    body: 'Group accounts by release date, ship date, destination, postage lane, box count, pickup status, and exception status before printing labels.',
  },
  {
    icon: CalendarClock,
    title: 'One-year prebuy calendar',
    body: 'Let customers reserve known MTG and Lorcana release slots, then attach exact products when official distributor SKUs arrive.',
  },
  {
    icon: Sparkles,
    title: 'Secret Lair commitments',
    body: 'Capture customer intent, quantity caps, deposit status, and drop-window confirmation before turning interest into a payable order.',
  },
]

const safeguards = [
  'Three-month maximum hold policy by default, with staff override notes when a store needs an exception.',
  'Failed card captures stay out of release-day and mailing batches until staff update payment, collect a deposit, or move the order to pickup.',
  'Import review catches duplicate issues, missing covers, unmapped columns, changed release dates, duplicate SKUs, and allocation changes before orders are created.',
  '2027 and 2028 TCG set-year reservations are held as flexible release slots until official set names, SKUs, and allocation quantities are confirmed.',
  'Secret Lair commitments stay as intent records until the official drop window, price, quantity caps, and fulfillment path are confirmed.',
]

export const metadata: Metadata = {
  title: 'Prebuy And Comic Subscription Manager For Stores | Mythiverse Exchange',
  description:
    'A Mythivex store workflow for recurring comic pull lists, MTG set prebuys, card-on-file billing, three-month holds, release-day shipments, and distributor or POS imports.',
  alternates: {
    canonical: '/comic-subscriptions',
  },
}

function PullboxConsole() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/35 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Prebuy Subscriptions</p>
          <p className="mt-1 text-xs text-muted-foreground">Recurring pulls, set prebuys, holds, and shipment readiness</p>
        </div>
        <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Pilot workflow
        </span>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-primary/20 bg-primary/10 p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-primary/75">
            <Repeat2 className="h-4 w-4" />
            New recurring order or prebuy
          </div>
          <div className="mt-5 space-y-3 text-sm">
            {[
              ['Customer', 'Maya R.'],
              ['Subscription rule', 'Comics + 2027/2028 MTG + Secret Lair'],
              ['Product preference', 'Main covers, play booster box, bundle, drop commitments'],
              ['Release rule', 'Reserve when SKU opens'],
              ['Payment', 'Card on file ready'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-background/45 px-4 py-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 font-medium text-foreground">{value}</p>
              </div>
            ))}
          </div>
          <Button className="mt-5 h-11 w-full" asChild>
            <Link href={SUBSCRIPTIONS_MAILTO}>
              Ask about setup
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="space-y-3">
          {pullboxRows.map((row) => (
            <div key={row.customer} className="rounded-lg border border-border bg-background/45 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{row.customer}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{row.plan}</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    row.status === 'Ship batch'
                      ? 'border-amber-400/30 bg-amber-400/10 text-amber-600'
                      : 'border-primary/25 bg-primary/10 text-primary'
                  }`}
                >
                  {row.status}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-card/70 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Hold window</p>
                  <p className="mt-1 font-medium text-foreground">{row.hold}</p>
                </div>
                <div className="rounded-lg border border-border bg-card/70 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Current batch value</p>
                  <p className="mt-1 font-medium text-foreground">{row.balance}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PrebuyConsole() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/35 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-foreground">TCG Prebuy Calendar</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Release-triggered reservations for sealed product, Secret Lair drops, Lorcana sets, and set-year subscriptions
          </p>
        </div>
        <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          2026/TBA ready
        </span>
      </div>

      <div className="grid gap-3 p-5 lg:grid-cols-3">
        {prebuyRows.map((row) => (
          <div key={row.customer} className="rounded-lg border border-border bg-background/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{row.customer}</p>
                <p className="mt-1 text-sm text-muted-foreground">{row.plan}</p>
              </div>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {row.status}
              </span>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-lg border border-border bg-card/70 px-3 py-2">
                <p className="text-xs text-muted-foreground">Default product mix</p>
                <p className="mt-1 font-medium text-foreground">{row.product}</p>
              </div>
              <div className="rounded-lg border border-border bg-card/70 px-3 py-2">
                <p className="text-xs text-muted-foreground">Automation trigger</p>
                <p className="mt-1 font-medium text-foreground">{row.trigger}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border px-5 pb-5">
        <div className="pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Magic: The Gathering
          </p>
        </div>
        <div className="grid gap-3 pt-3 sm:grid-cols-2">
          {mtgReleaseRows.map((row) => (
            <div key={row.set} className="rounded-lg border border-border bg-background/45 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/75">
                {row.source}
              </p>
              <h3 className="mt-2 font-semibold text-foreground">{row.set}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{row.window}</p>
              {row.href ? (
                <a
                  href={row.href}
                  className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  View official page
                </a>
              ) : null}
            </div>
          ))}
        </div>

        <div className="pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Disney Lorcana
          </p>
        </div>
        <div className="grid gap-3 pt-3 sm:grid-cols-2">
          {lorcanaReleaseRows.map((row) => (
            <div key={row.set} className="rounded-lg border border-border bg-background/45 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/75">
                {row.source}
              </p>
              <h3 className="mt-2 font-semibold text-foreground">{row.set}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{row.window}</p>
              {row.href ? (
                <a
                  href={row.href}
                  className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  View source
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ComicSubscriptionsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="border-b border-border bg-secondary/20 py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                <BookOpenCheck className="h-4 w-4" />
                Prebuy Subscription Manager
              </div>
              <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Run pull lists and set prebuys with <span className="text-primary">store-grade batching</span>.
              </h1>
              <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
                A Mythivex workflow for local game stores that sell comics and sealed Magic:
                import upcoming issue and product lists, log recurring customer pulls, reserve MTG
                and Lorcana prebuys as soon as new sets open, support 2027 and 2028 set
                subscriptions, record Secret Lair commitments, bill card-on-file orders, and batch
                pickup or mail shipments.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-12 min-w-[210px]" asChild>
                  <Link href={SUBSCRIPTIONS_MAILTO}>
                    Start prebuy pilot
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="h-12 min-w-[210px]" asChild>
                  <Link href="/for-stores">Back to store program</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {heroSignals.map((signal) => (
                  <span key={signal} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {signal}
                  </span>
                ))}
              </div>
            </div>

            <PullboxConsole />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.84fr_1.16fr] lg:items-start">
            <div>
              <div className="inline-flex rounded-full border border-border bg-secondary/40 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
                Import Layer
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Bring in the release and allocation lists your store already uses.
              </h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                The manager starts with import mapping, because store staff should not retype an
                entire comic release cycle or TCG product preorder calendar. Distributor, POS, and
                ecommerce exports become clean orderable rows with review flags before subscriptions
                attach to them.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {importSources.map((source) => {
                const Icon = source.icon

                return (
                  <div key={source.title} className="rounded-lg border border-border bg-card p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 font-semibold text-foreground">{source.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{source.body}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <div className="inline-flex rounded-full border border-border bg-secondary/40 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
                TCG Prebuys
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Let customers reserve new MTG, Lorcana, and Secret Lair drops before the product is on the shelf.
              </h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                Stores can create a preorder as soon as a distributor SKU, allocation, official
                release row, or Secret Lair drop window is available. Customers can reserve the
                named 2026 MTG and Lorcana releases now, then opt into TBA 2027 and early 2028
                release slots until publishers and distributors publish final product data.
              </p>
              <div className="mt-6 rounded-lg border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
                The future-year lane is intentionally slot-based until publishers and distributors
                publish final set names, SKUs, quantities, and dates. Secret Lair commitments stay as
                intent until the official drop terms are known.
              </div>
            </div>
            <PrebuyConsole />
          </div>
        </section>

        <section className="border-y border-border bg-secondary/30 py-14">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
            {workflowSteps.map((item) => (
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

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.86fr] lg:items-start">
            <div className="grid gap-4 sm:grid-cols-3">
              {batchCards.map((card) => {
                const Icon = card.icon

                return (
                  <div key={card.title} className="rounded-lg border border-border bg-card p-5">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="mt-4 font-semibold text-foreground">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.body}</p>
                  </div>
                )
              })}
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                <ShieldCheck className="h-4 w-4" />
                Store controls
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                Built around the problems that make pull boxes and preorders messy.
              </h2>
              <div className="mt-6 space-y-4">
                {safeguards.map((item) => (
                  <div key={item} className="flex gap-3 rounded-lg border border-border bg-background/40 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-secondary/50 py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
              <Store className="h-4 w-4" />
              Store pilot
            </div>
            <h2 className="mt-6 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Add comics, MTG and Lorcana prebuys, and Secret Lair commitments to the Mythivex store stack.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Tell us how your store receives comic, sealed-product, and Secret Lair interest lists
              today, when you open preorders, and whether customers usually pick up, ship at
              release, or hold for several releases before mailing.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="h-12" asChild>
                <Link href={SUBSCRIPTIONS_MAILTO}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email partnerships
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12" asChild>
                <Link href="/pricing">View store pricing</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
