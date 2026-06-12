import { getMarketplaceLinks } from '@/lib/affiliate-links'
import type { OptimizerOpportunity } from '@/lib/optimizer/scoring'
import { ArrowUpRight, BadgeDollarSign, Eye, Sparkles, TrendingUp } from 'lucide-react'

type TopOpportunitiesProps = {
  deckId: number
  opportunities: OptimizerOpportunity[]
}

const BRANCH_TONE: Record<string, string> = {
  spend_less: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100',
  style_upgrade: 'border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100',
  value_retention: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
  power_path: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
  watchlist: 'border-zinc-300/25 bg-zinc-300/10 text-zinc-100',
}

const BRANCH_LABEL: Record<string, string> = {
  spend_less: 'Budget',
  style_upgrade: 'Style',
  value_retention: 'Stability',
  power_path: 'Power',
  watchlist: 'Watch',
}

function formatUsd(value: number | null) {
  if (value == null) return 'No price'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function iconForBranch(branchId: string) {
  if (branchId === 'spend_less') return BadgeDollarSign
  if (branchId === 'style_upgrade') return Sparkles
  if (branchId === 'value_retention') return TrendingUp
  return Eye
}

export function TopOpportunities({ deckId, opportunities }: TopOpportunitiesProps) {
  if (opportunities.length === 0) {
    return (
      <section className="border-y border-white/10 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-xl font-semibold text-white">Top 5 Buying Opportunities</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              This deck needs pricing data before the optimizer can rank buying opportunities.
              Refresh enrichment or re-import the list, then come back here.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="border-y border-white/10 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200">
              Optimizer Picks
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Top 5 Buying Opportunities
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-zinc-400">
            Curated print and timing signals for play, style, and collection confidence. Marketplace links may earn DeckSwap a commission.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {opportunities.map((opportunity, index) => {
            const Icon = iconForBranch(opportunity.branchId)
            const links = getMarketplaceLinks({
              cardName: opportunity.cardName,
              deckId,
              opportunityId: opportunity.id,
              setCode: opportunity.setCode,
              collectorNumber: opportunity.collectorNumber,
            })

            return (
              <article
                key={opportunity.id}
                className="flex min-h-[520px] flex-col overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
              >
                <div className="relative aspect-[5/4] bg-zinc-950">
                  {opportunity.imageUrl ? (
                    <img
                      src={opportunity.imageUrl}
                      alt={opportunity.cardName}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-500">
                      Card image unavailable
                    </div>
                  )}
                  <div className="absolute left-3 top-3 rounded-md border border-black/40 bg-black/70 px-2 py-1 text-xs font-semibold text-white">
                    #{index + 1}
                  </div>
                  <div
                    className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${BRANCH_TONE[opportunity.branchId]}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {BRANCH_LABEL[opportunity.branchId]}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold leading-6 text-white">
                        {opportunity.cardName}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        {opportunity.setCode?.toUpperCase() ?? 'Any set'}
                        {opportunity.collectorNumber ? ` #${opportunity.collectorNumber}` : ''}
                      </p>
                    </div>
                    <div className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-right">
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                        Score
                      </div>
                      <div className="text-sm font-semibold text-amber-100">
                        {opportunity.score}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-medium text-white">{opportunity.title}</div>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{opportunity.reason}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border border-white/10 bg-white/[0.04] p-2">
                      <div className="uppercase tracking-wide text-zinc-500">Visible price</div>
                      <div className="mt-1 font-semibold text-white">{formatUsd(opportunity.priceUsd)}</div>
                    </div>
                    <div className="rounded-md border border-white/10 bg-white/[0.04] p-2">
                      <div className="uppercase tracking-wide text-zinc-500">Confidence</div>
                      <div className="mt-1 font-semibold text-white">{opportunity.confidence}</div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs leading-5 text-zinc-500">{opportunity.nextAction}</p>

                  <div className="mt-auto pt-4">
                    <div className="grid gap-2">
                      {links.slice(0, 2).map((link) => (
                        <a
                          key={link.marketplace}
                          href={link.href}
                          target="_blank"
                          rel="sponsored noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-medium text-white transition hover:border-amber-200/40 hover:bg-amber-200/10"
                        >
                          {link.label}
                          <ArrowUpRight className="h-4 w-4" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
