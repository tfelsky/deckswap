import { getMarketplaceLinks } from '@/lib/affiliate-links'
import type { DeckOptimization, OptimizerBranch, OptimizerDeck } from '@/lib/optimizer/scoring'
import { ArrowUpRight } from 'lucide-react'

type DeckTreeProps = {
  deck: OptimizerDeck
  optimization: DeckOptimization
}

const BRANCH_STYLES: Record<string, string> = {
  spend_less: 'border-cyan-300/25 bg-cyan-300/[0.07]',
  style_upgrade: 'border-fuchsia-300/25 bg-fuchsia-300/[0.07]',
  value_retention: 'border-amber-300/25 bg-amber-300/[0.07]',
  power_path: 'border-emerald-300/25 bg-emerald-300/[0.07]',
  watchlist: 'border-zinc-300/20 bg-zinc-300/[0.06]',
}

function axisPosition(value: number) {
  return `${Math.max(8, Math.min(88, value))}%`
}

function branchLink(branch: OptimizerBranch) {
  return branch.opportunities[0]
}

export function DeckTree({ deck, optimization }: DeckTreeProps) {
  const graphNodes = optimization.topOpportunities.length > 0
    ? optimization.topOpportunities
    : optimization.allOpportunities.slice(0, 12)

  return (
    <section className="bg-zinc-950 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
              Deck Tree
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Five paths from this deck
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              The root is your imported list. Each branch turns the same card pool into a different buying mood: save money, improve style, preserve confidence, increase gameplay impact, or wait.
            </p>

            <div className="mt-6 rounded-lg border border-white/10 bg-zinc-900 p-4">
              <div className="flex items-center gap-4">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-950">
                  {deck.image_url ? (
                    <img
                      src={deck.image_url}
                      alt={deck.name}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                      Root
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Root Deck</div>
                  <div className="mt-1 text-lg font-semibold text-white">{deck.name}</div>
                  <div className="mt-1 text-sm text-zinc-400">
                    {deck.commander || 'Commander not set'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {optimization.branches.map((branch) => {
                const lead = branchLink(branch)
                const links = lead
                  ? getMarketplaceLinks({
                      cardName: lead.cardName,
                      deckId: deck.id,
                      opportunityId: lead.id,
                      setCode: lead.setCode,
                      collectorNumber: lead.collectorNumber,
                    })
                  : []

                return (
                  <div
                    key={branch.id}
                    className={`rounded-lg border p-4 ${BRANCH_STYLES[branch.id]}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-white">{branch.label}</div>
                        <p className="mt-1 text-sm leading-6 text-zinc-400">{branch.description}</p>
                      </div>
                      <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs font-semibold text-white">
                        {branch.opportunities.length}
                      </div>
                    </div>
                    {lead ? (
                      <div className="mt-3 flex items-center gap-3 border-t border-white/10 pt-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-950">
                          {lead.imageUrl ? (
                            <img
                              src={lead.imageUrl}
                              alt={lead.cardName}
                              className="h-full w-full object-cover object-top"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-white">{lead.cardName}</div>
                          <div className="text-xs text-zinc-500">{lead.title}</div>
                        </div>
                        {links[0] ? (
                          <a
                            href={links[0].href}
                            target="_blank"
                            rel="sponsored noopener noreferrer"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-white hover:border-amber-200/40 hover:bg-amber-200/10"
                            aria-label={`Open ${lead.cardName} on ${links[0].label}`}
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-zinc-900 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Card Image Map
                </div>
                <h3 className="mt-1 text-lg font-semibold text-white">
                  Enjoyment vs. value confidence
                </h3>
              </div>
              <div className="text-right text-xs text-zinc-500">
                X: style
                <br />
                Y: retention
              </div>
            </div>

            <div className="relative mt-5 aspect-[4/3] min-h-[360px] overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:20%_20%]">
              <div className="absolute inset-x-4 bottom-4 top-4 border-l border-b border-white/20" />
              <div className="absolute bottom-2 left-5 text-xs text-zinc-500">lower style</div>
              <div className="absolute bottom-2 right-5 text-xs text-zinc-500">higher style</div>
              <div className="absolute left-5 top-3 text-xs text-zinc-500">steadier</div>

              {graphNodes.map((node, index) => (
                <div
                  key={`${node.id}-${index}`}
                  className="group absolute h-16 w-12 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: axisPosition(node.styleScore),
                    top: axisPosition(100 - node.retentionScore),
                  }}
                >
                  <div className="h-16 w-12 overflow-hidden rounded-md border border-white/20 bg-zinc-950 shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition group-hover:scale-110 group-hover:border-amber-200/60">
                    {node.imageUrl ? (
                      <img
                        src={node.imageUrl}
                        alt={node.cardName}
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[9px] text-zinc-500">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="pointer-events-none absolute left-1/2 top-[4.4rem] hidden w-44 -translate-x-1/2 rounded-md border border-white/10 bg-black/90 px-3 py-2 text-xs text-white shadow-xl group-hover:block">
                    <div className="font-semibold">{node.cardName}</div>
                    <div className="mt-1 text-zinc-400">{node.title}</div>
                  </div>
                </div>
              ))}

              {graphNodes.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm leading-6 text-zinc-500">
                  Add pricing and card images to see the deck map.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
