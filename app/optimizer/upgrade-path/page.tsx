import AppHeader from '@/components/app-header'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  CalendarClock,
  Database,
  Gauge,
  Layers3,
  LineChart,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Desirability Index Upgrade Path | Mythiverse Exchange',
  description:
    'A staged product path for turning card demand, market momentum, scarcity, collector appeal, and risk into a printing-level desirability index.',
  alternates: {
    canonical: '/optimizer/upgrade-path',
  },
}

type ScoreWeight = {
  label: string
  weight: string
  body: string
  icon: LucideIcon
  tone: string
}

type UpgradeStage = {
  stage: string
  title: string
  status: string
  body: string
  inputs: string[]
  output: string
  icon: LucideIcon
}

type SignalGroup = {
  title: string
  description: string
  signals: string[]
}

const scoreWeights: ScoreWeight[] = [
  {
    label: 'Demand',
    weight: '35%',
    body: 'Card-level pull from EDHREC rank, inclusion count, commander breadth, growth, staple status, and format relevance.',
    icon: TrendingUp,
    tone: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
  },
  {
    label: 'Market',
    weight: '25%',
    body: 'Live buying pressure from price trend, sales velocity, recent sold volume, listing depth, buylist price, and spread.',
    icon: LineChart,
    tone: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100',
  },
  {
    label: 'Scarcity',
    weight: '20%',
    body: 'Printing-specific supply pressure from set age, set sales, rarity, printings, sealed availability, and finish supply.',
    icon: Layers3,
    tone: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
  },
  {
    label: 'Collector',
    weight: '10%',
    body: 'Premium appeal from foiling type, frame, first printing, artist, lore, serialized status, old border, and condition sensitivity.',
    icon: Sparkles,
    tone: 'border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100',
  },
  {
    label: 'Risk',
    weight: '-10%',
    body: 'Penalty for reprint risk, ban risk, narrowness, volatility, hype decay, excess variants, and known finish quality issues.',
    icon: ShieldAlert,
    tone: 'border-rose-300/30 bg-rose-300/10 text-rose-100',
  },
]

const upgradeStages: UpgradeStage[] = [
  {
    stage: '01',
    title: 'Baseline Score',
    status: 'MVP',
    body: 'Separate card-level demand from printing-level desirability and normalize every input to a 0-100 range.',
    inputs: ['EDHREC rank', 'current price', 'rarity', 'release date', 'finish'],
    output: 'A stable first-pass score that explains why a printing appears in the optimizer tree.',
    icon: Gauge,
  },
  {
    stage: '02',
    title: 'Market Momentum',
    status: 'Next',
    body: 'Connect historical prices, sold volume, listing count, and buylist spread so the score responds to real movement.',
    inputs: ['30/90/365 day trend', 'sales velocity', 'listing count', 'buylist spread'],
    output: 'Early flags for printings getting tighter before the sticker price fully reacts.',
    icon: BarChart3,
  },
  {
    stage: '03',
    title: 'Printing Scarcity',
    status: 'Next',
    body: 'Model exact-print supply instead of treating every version of a card as interchangeable.',
    inputs: ['set sales', 'set age', 'foil supply', 'variant count', 'sealed availability'],
    output: 'Different scores for first printings, premium finishes, reprint versions, and mass-supply variants.',
    icon: Database,
  },
  {
    stage: '04',
    title: 'Collector Premium',
    status: 'Planned',
    body: 'Layer in the emotional reasons a player chooses this copy: art, frame, foil treatment, nostalgia, and table identity.',
    inputs: ['foiling type', 'frame treatment', 'artist', 'lore relevance', 'condition sensitivity'],
    output: 'A version-aware premium score that supports style upgrade recommendations.',
    icon: Sparkles,
  },
  {
    stage: '05',
    title: 'Risk Gates',
    status: 'Planned',
    body: 'Subtract the reasons a signal can break: reprints, bans, power creep, single-deck demand, and unsustainable hype.',
    inputs: ['reprint risk', 'ban risk', 'volatility', 'format dependency', 'hype spike age'],
    output: 'Watchlist and wait signals that keep recommendations from chasing fragile spikes.',
    icon: ShieldAlert,
  },
  {
    stage: '06',
    title: 'Backtest And Learn',
    status: 'Model',
    body: 'Compare historical scores to later price movement and sales outcomes, then tune weights with real misses.',
    inputs: ['score snapshots', 'future sales', 'future price', 'manual labels', 'miss reasons'],
    output: 'A tuned desirability model that predicts opportunity quality, not just current price.',
    icon: CalendarClock,
  },
]

const signalGroups: SignalGroup[] = [
  {
    title: 'Card-Level Demand',
    description: 'Answers whether people want the card at all.',
    signals: [
      'EDHREC rank and inclusion count',
      'EDHREC 30/90 day growth',
      'Commander and archetype breadth',
      'Staple status versus narrow synergy',
      'cEDH and constructed relevance',
    ],
  },
  {
    title: 'Printing-Level Supply',
    description: 'Answers whether this exact copy is meaningfully harder to find.',
    signals: [
      'Set age and estimated set sales',
      'Number of printings and variants',
      'Time since last reprint',
      'Foil, etched, surge, textured, or showcase supply',
      'Sealed product still available',
    ],
  },
  {
    title: 'Market Liquidity',
    description: 'Answers whether the market is actually moving.',
    signals: [
      'Sales velocity and recent sold volume',
      'TCGplayer listing depth',
      'Buylist price and buylist spread',
      'Price versus all-time high',
      'Volatility and trend stability',
    ],
  },
  {
    title: 'Collector Fit',
    description: 'Answers why a player would choose this version over another.',
    signals: [
      'Foiling type and frame treatment',
      'First printing, promo, or serialized status',
      'Artist and character relevance',
      'Old border or retro appeal',
      'Condition sensitivity for older cards',
    ],
  },
]

const dataFields = [
  'oracle_id',
  'card_name',
  'set_code',
  'collector_number',
  'finish',
  'treatment',
  'rarity',
  'release_date',
  'market_price',
  'price_90d_change',
  'listing_count',
  'sales_velocity',
  'edhrec_rank',
  'printing_count',
  'last_reprint_date',
  'risk_score',
  'desirability_index',
]

const validationChecks = [
  'Known EDH staples should rank high even when the cheapest printing is inexpensive.',
  'Premium variants should not outrank playable copies when demand is narrow and supply is deep.',
  'Cards with fast sales and falling listings should surface before price alone makes them obvious.',
  'Recent hype spikes should move to watchlist when volatility is high and demand is concentrated.',
]

function ScoreWeightCard({ item }: { item: ScoreWeight }) {
  const Icon = item.icon

  return (
    <article className={`rounded-lg border p-4 ${item.tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <h2 className="text-sm font-semibold text-white">{item.label}</h2>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-sm font-semibold">
          {item.weight}
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-200/85">{item.body}</p>
    </article>
  )
}

function UpgradeStageCard({ stage }: { stage: UpgradeStage }) {
  const Icon = stage.icon

  return (
    <article className="rounded-lg border border-white/10 bg-zinc-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-amber-100">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Stage {stage.stage}
            </div>
            <h2 className="mt-1 text-xl font-semibold text-white">{stage.title}</h2>
          </div>
        </div>
        <span className="rounded-md border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-xs font-medium text-amber-100">
          {stage.status}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-zinc-400">{stage.body}</p>

      <div className="mt-5">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
          Inputs
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {stage.inputs.map((input) => (
            <span
              key={input}
              className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-zinc-300"
            >
              {input}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-md border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm leading-6 text-emerald-50/90">
        {stage.output}
      </div>
    </article>
  )
}

export default function OptimizerUpgradePathPage() {
  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="optimizer" isSignedIn={false} />

      <section className="border-b border-white/10 bg-zinc-900">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-amber-100">
              <Gauge className="h-3.5 w-3.5" />
              Optimizer Scoring Roadmap
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Build the desirability index as an upgrade path, not a black box.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
              The scoring path starts with explainable print recommendations, then adds live market
              movement, exact-print scarcity, collector premium, and risk gates until each card
              recommendation can say what changed and why it matters.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/optimizer"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-200 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-100"
              >
                Open optimizer
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#upgrade-stages"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.1]"
              >
                View stages
                <CalendarClock className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-zinc-950 p-5">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  Formula Target
                </div>
                <div className="mt-1 text-2xl font-semibold text-white">0-100 printing score</div>
              </div>
              <img
                src="/mythiverse-shield.png"
                alt="Mythiverse Exchange shield"
                className="h-14 w-14 rounded-md object-cover"
              />
            </div>

            <div className="mt-5 grid gap-3">
              {[
                { label: 'Card demand', value: 'generic pull' },
                { label: 'Exact printing', value: 'version fit' },
                { label: 'Market timing', value: 'movement' },
                { label: 'Risk filter', value: 'wait or buy' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-white/10 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="text-sm text-zinc-300">{item.label}</div>
                  <div className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-md border border-cyan-300/20 bg-cyan-300/10 p-4">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-100/80">
                Useful signal
              </div>
              <p className="mt-2 text-sm leading-6 text-cyan-50/90">
                Find printings becoming more desirable before price alone makes them obvious.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200">
                Score Stack
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                Start explainable, then tune with outcomes.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-zinc-400">
              The index is the output. Each input gets normalized first, weighted second, and
              backtested later against real sale and price movement.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {scoreWeights.map((item) => (
              <ScoreWeightCard key={item.label} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section id="upgrade-stages" className="border-b border-white/10 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200">
              Upgrade Path
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Six milestones from simple scoring to predictive guidance.
            </h2>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {upgradeStages.map((stage) => (
              <UpgradeStageCard key={stage.stage} stage={stage} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200">
                Signal Map
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                Keep card demand and print desirability separate.
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Rhystic Study can be a high-demand card while each printing earns a different
                score. The model should preserve that difference so the optimizer can explain
                budget picks, style upgrades, and watchlist calls.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {signalGroups.map((group) => (
                <article key={group.title} className="rounded-lg border border-white/10 bg-zinc-950 p-5">
                  <h3 className="text-lg font-semibold text-white">{group.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{group.description}</p>
                  <ul className="mt-4 grid gap-2">
                    {group.signals.map((signal) => (
                      <li key={signal} className="flex gap-2 text-sm leading-6 text-zinc-300">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-200" />
                        <span>{signal}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-zinc-950">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="rounded-lg border border-white/10 bg-zinc-900 p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-200">
              <Database className="h-4 w-4" />
              Data Contract
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              Store the score at printing level.
            </h2>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {dataFields.map((field) => (
                <code
                  key={field}
                  className="rounded-md border border-white/10 bg-black/20 px-2.5 py-2 text-xs text-zinc-300"
                >
                  {field}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-zinc-900 p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-200">
              <BadgeDollarSign className="h-4 w-4" />
              Validation Rules
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              Backtest against behavior, not vibes.
            </h2>
            <ul className="mt-5 grid gap-3">
              {validationChecks.map((check) => (
                <li key={check} className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-zinc-300">
                  {check}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-zinc-950 pb-10">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-xs leading-5 text-zinc-500">
            Desirability scores are hobby guidance for ranking printings inside DeckSwap. They are
            not financial advice, investment advice, or a guarantee of future card value.
          </div>
        </div>
      </section>
    </main>
  )
}
