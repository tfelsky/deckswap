import { AdminOnlyCallout } from '@/components/admin-only-callout'
import { createClient } from '@/lib/supabase/server'
import { runQshipDryRun, type QshipDryRunBundle } from '@/lib/qship/data'
import {
  QSHIP_PLANS,
  QSHIP_PLAN_KEYS,
  QSHIP_SHIPPING_LEVELS,
  QSHIP_SHIPPING_LEVEL_KEYS,
  calculateLockCharge,
} from '@/lib/qship/pricing'
import type {
  QshipBillingInterval,
  QshipExclusionReason,
  QshipFulfillmentMode,
  QshipShippingLevel,
  QshipPlanKey,
  QshipRiskProfile,
  QshipScoredCandidate,
  QshipSlot,
} from '@/lib/qship/types'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function param(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return (Array.isArray(value) ? value[0] : value) ?? ''
}

function oneOf<T extends string>(value: string, allowed: readonly T[]): T | undefined {
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined
}

const usd = (value: number) => `$${value.toFixed(2)}`
const pct = (value: number) => `${Math.round(value * 100)}%`

const SLOT_LABEL: Record<QshipSlot, string> = {
  play: 'Plays in your deck',
  hold: 'Value hold',
  spec: 'Speculative',
}

const SLOT_CLASS: Record<QshipSlot, string> = {
  play: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  hold: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  spec: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
}

const STRATEGY_LABEL = {
  balanced: 'Balanced',
  deck_impact: 'Max deck impact',
  value: 'Max value',
} as const

const EXCLUSION_LABEL: Record<QshipExclusionReason, string> = {
  blocked_card: 'Blocked card',
  blocked_set: 'Blocked set',
  blocked_artist: 'Blocked artist',
  below_min_condition: 'Below min condition',
  language: 'Language',
  finish: 'Finish preference',
  unpriced: 'No price',
  bulk_price: 'Under $1',
  recent_spike: 'Spiked this week',
  already_owned: 'Already owned',
}

function SlotBadge({ slot }: { slot: QshipSlot }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${SLOT_CLASS[slot]}`}>
      {SLOT_LABEL[slot]}
    </span>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  const toneClass = tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-white'
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/60 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 font-mono text-lg tabular-nums ${toneClass}`}>{value}</div>
    </div>
  )
}

function BundleCard({ entry }: { entry: QshipDryRunBundle }) {
  const { bundle, economics, alternates } = entry
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{STRATEGY_LABEL[bundle.strategy]}</h3>
          <p className="text-sm text-zinc-400">
            {bundle.cardCount} cards · score {bundle.totalScore.toFixed(0)}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            bundle.valid
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
              : 'border-rose-400/30 bg-rose-400/10 text-rose-200'
          }`}
        >
          {bundle.valid ? 'Valid box' : 'Breaks rules'}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Market value" value={usd(economics.marketValueUsd)} tone={economics.meetsValueGuarantee ? 'good' : 'bad'} />
        <Stat label="Charge" value={usd(economics.chargeUsd)} />
        <Stat label="Cost basis" value={usd(economics.costBasisUsd)} />
        <Stat label="Acquisition" value={pct(economics.acquisitionRatio)} />
        <Stat
          label="Contribution"
          value={`${usd(economics.contributionUsd)} · ${pct(economics.contributionPct)}`}
          tone={economics.meetsContributionFloor ? 'good' : 'bad'}
        />
        <Stat
          label="By slot"
          value={`${bundle.slotValueUsd.play.toFixed(0)} / ${bundle.slotValueUsd.hold.toFixed(0)} / ${bundle.slotValueUsd.spec.toFixed(0)}`}
        />
      </div>

      {bundle.violations.length > 0 ? (
        <ul className="mt-4 space-y-1 rounded-2xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-200">
          {bundle.violations.map((violation) => (
            <li key={violation}>{violation}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="py-2 pr-4 font-medium">Card</th>
              <th className="py-2 pr-4 font-medium">Slot</th>
              <th className="py-2 pr-4 text-right font-medium">Market</th>
              <th className="py-2 pr-4 text-right font-medium">Cost</th>
              <th className="py-2 pr-4 text-right font-medium">Score</th>
              <th className="py-2 pr-4 font-medium">Why</th>
              <th className="py-2 font-medium">Swaps</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {bundle.items.map(({ candidate, slot }) => (
              <tr key={candidate.inventoryId} className="align-top">
                <td className="py-3 pr-4">
                  <div className="font-medium text-white">{candidate.card.cardName}</div>
                  <div className="text-xs text-zinc-500">
                    {candidate.card.setName ?? candidate.card.setCode} · {candidate.channel === 'supply' ? 'Supply seller' : 'Hub stock'}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <SlotBadge slot={slot} />
                </td>
                <td className="py-3 pr-4 text-right font-mono tabular-nums">{usd(candidate.marketPriceUsd)}</td>
                <td className="py-3 pr-4 text-right font-mono tabular-nums text-zinc-400">{usd(candidate.costBasisUsd)}</td>
                <td className="py-3 pr-4 text-right font-mono tabular-nums">
                  {candidate.score.toFixed(0)}
                  <div className="text-xs text-zinc-500">
                    {candidate.desirability.toFixed(0)} × {candidate.fit.toFixed(2)}
                  </div>
                </td>
                <td className="max-w-md py-3 pr-4 text-xs text-zinc-300">
                  {candidate.pros[0] ?? '—'}
                  {candidate.cons[0] ? <div className="mt-1 text-orange-200/80">{candidate.cons[0]}</div> : null}
                </td>
                <td className="py-3 text-xs text-zinc-400">
                  {(alternates[candidate.inventoryId] ?? []).map((alt) => alt.card.cardName).join(', ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CandidateRow({ candidate }: { candidate: QshipScoredCandidate }) {
  const c = candidate.components
  return (
    <tr className="align-top">
      <td className="py-2 pr-4">
        <div className="text-white">{candidate.card.cardName}</div>
        <div className="text-xs text-zinc-500">{candidate.targetDeckName ? `Gap in ${candidate.targetDeckName}` : candidate.card.setName}</div>
      </td>
      <td className="py-2 pr-4">
        <div className="flex flex-wrap gap-1">
          {candidate.slots.length ? candidate.slots.map((slot) => <SlotBadge key={slot} slot={slot} />) : <span className="text-xs text-zinc-500">No slot</span>}
        </div>
      </td>
      <td className="py-2 pr-4 text-right font-mono tabular-nums">{usd(candidate.marketPriceUsd)}</td>
      <td className="py-2 pr-4 text-right font-mono tabular-nums">{candidate.score.toFixed(0)}</td>
      <td className="py-2 pr-4 font-mono text-xs tabular-nums text-zinc-400">
        D{c.demand.toFixed(0)} M{c.market.toFixed(0)} S{c.scarcity.toFixed(0)} C{c.collector.toFixed(0)} R{c.risk.toFixed(0)}
      </td>
    </tr>
  )
}

export default async function AdminQshipPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const memberParam = param(params, 'member')
  const userIdParam = param(params, 'user').trim()
  const planKey = oneOf<QshipPlanKey>(param(params, 'plan'), QSHIP_PLAN_KEYS)
  const riskProfile = oneOf<QshipRiskProfile>(param(params, 'risk'), ['player', 'balanced', 'speculator'])
  const interval = oneOf<QshipBillingInterval>(param(params, 'interval'), ['monthly', 'annual'])
  const mode = oneOf<QshipFulfillmentMode>(param(params, 'mode'), ['vault_quarterly', 'ship_monthly'])
  const shippingLevel = oneOf<QshipShippingLevel>(param(params, 'ship'), QSHIP_SHIPPING_LEVEL_KEYS)

  const result = await runQshipDryRun({
    userId: userIdParam || user?.id || null,
    useSampleMember: memberParam === 'sample',
    planKey,
    riskProfile,
    interval,
    mode,
    shippingLevel,
  })

  const listPrice = calculateLockCharge({
    plan: result.plan,
    interval: result.interval,
    mode: result.mode,
    shippingLevel: result.shippingLevel,
  })
  const exclusions = Object.entries(result.exclusionCounts) as Array<[QshipExclusionReason, number]>

  return (
    <section className="mx-auto max-w-7xl space-y-6 px-6 py-10">
      <AdminOnlyCallout
        title="QShip dry run"
        description="What would QShip pick for this member this month? Nothing is reserved or charged. Use it to sanity-check scoring, box rules, and margins before real boxes go out."
      />

      <form className="grid gap-3 rounded-3xl border border-white/10 bg-zinc-900 p-6 sm:grid-cols-2 lg:grid-cols-6" method="get">
        <label className="grid gap-1 text-xs uppercase tracking-wide text-zinc-500">
          Member
          <select name="member" defaultValue={memberParam || 'self'} className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm normal-case tracking-normal text-white">
            <option value="self">Real member</option>
            <option value="sample">Sample member</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs uppercase tracking-wide text-zinc-500 lg:col-span-2">
          User id (blank = you)
          <input name="user" defaultValue={userIdParam} placeholder={user?.id ?? ''} className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-sm normal-case tracking-normal text-white" />
        </label>
        <label className="grid gap-1 text-xs uppercase tracking-wide text-zinc-500">
          Plan
          <select name="plan" defaultValue={result.plan.key} className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm normal-case tracking-normal text-white">
            {QSHIP_PLAN_KEYS.map((key) => (
              <option key={key} value={key}>
                {QSHIP_PLANS[key].label} · ${QSHIP_PLANS[key].boxValueUsd}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs uppercase tracking-wide text-zinc-500">
          Risk dial
          <select name="risk" defaultValue={result.riskProfile} className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm normal-case tracking-normal text-white">
            <option value="player">Player</option>
            <option value="balanced">Balanced</option>
            <option value="speculator">Speculator</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs uppercase tracking-wide text-zinc-500">
          Shipping
          <select name="mode" defaultValue={result.mode} className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm normal-case tracking-normal text-white">
            <option value="vault_quarterly">Vault + quarterly</option>
            <option value="ship_monthly">Ship monthly</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs uppercase tracking-wide text-zinc-500">
          Shipping level
          <select name="ship" defaultValue={result.shippingLevel} className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm normal-case tracking-normal text-white">
            {QSHIP_SHIPPING_LEVEL_KEYS.map((key) => (
              <option key={key} value={key}>
                {QSHIP_SHIPPING_LEVELS[key].label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs uppercase tracking-wide text-zinc-500">
          Billing
          <select name="interval" defaultValue={result.interval} className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm normal-case tracking-normal text-white">
            <option value="monthly">Monthly</option>
            <option value="annual">Annual prepay</option>
          </select>
        </label>
        <div className="flex items-end lg:col-span-4">
          <button type="submit" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            Run dry run
          </button>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">{result.memberLabel}</h2>
          <p className="mt-1 text-sm text-zinc-400">
            {result.plan.label}: {usd(result.plan.boxValueUsd)} of cards + {pct(listPrice.feeRate)} fee
            {listPrice.shipping ? ` + ${usd(listPrice.shippingUsd)} ${listPrice.shipping.label}` : ''} ={' '}
            <span className="font-mono text-white">{usd(listPrice.totalUsd)}</span>
            {listPrice.shipping ? null : ' · shipping billed when the vault ships'}
            {listPrice.shipping?.upgraded ? ' · Economy not allowed for this box, moved to Tracked' : ''}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {result.member.focusDecks.map((deck) => (
              <span key={deck.deckId} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-300">
                {deck.name}
                {deck.commanderName ? ` · ${deck.commanderName}` : ''} · {Object.keys(deck.gapInclusion).length} gaps in stock
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {result.usingSampleInventory ? (
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-amber-200">
                Sample inventory: illustrative prices, not live market data
              </span>
            ) : null}
            {result.usingSampleMember ? (
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-amber-200">Sample member</span>
            ) : null}
          </div>
          {result.notes.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm text-zinc-400">
              {result.notes.map((note) => (
                <li key={note}>· {note}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Candidates</h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Stat label="Loaded" value={String(result.candidateCount)} />
            <Stat label="Pool" value={String(result.poolCount)} />
            <Stat label="Supply" value={String(result.supplyCount)} />
          </div>
          <div className="mt-4 text-sm text-zinc-400">
            {result.scored.length} boxable · {result.excluded.length} excluded
          </div>
          {exclusions.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm">
              {exclusions.map(([reason, count]) => (
                <li key={reason} className="flex justify-between text-zinc-300">
                  <span>{EXCLUSION_LABEL[reason]}</span>
                  <span className="font-mono tabular-nums text-zinc-500">{count}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Bundles for curation</h2>
        {result.bundles.length === 0 ? (
          <p className="rounded-3xl border border-white/10 bg-zinc-900 p-6 text-zinc-400">
            No bundle could be built. Check the exclusion counts above, or add stock to the hub.
          </p>
        ) : (
          result.bundles.map((entry) => <BundleCard key={entry.bundle.strategy} entry={entry} />)
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Top candidates</h2>
          <span className="text-xs text-zinc-500">D demand · M market · S scarcity · C collector · R risk</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="py-2 pr-4 font-medium">Card</th>
                <th className="py-2 pr-4 font-medium">Slots</th>
                <th className="py-2 pr-4 text-right font-medium">Market</th>
                <th className="py-2 pr-4 text-right font-medium">Score</th>
                <th className="py-2 pr-4 font-medium">Components</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {result.scored.slice(0, 30).map((candidate) => (
                <CandidateRow key={candidate.inventoryId} candidate={candidate} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-zinc-500">Spec: docs/ai-trader-spec.md in the repo.</p>
    </section>
  )
}
