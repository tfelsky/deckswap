'use client'

import { useActionState, useState } from 'react'
import { scanArbitrageAction, type ArberScanState } from '@/app/arber/actions'
import FormActionButton from '@/components/form-action-button'
import type { ArbitrageOpportunity, ScanResult } from '@/lib/arber/types'
import {
  ArrowRight,
  ExternalLink,
  Settings2,
  TriangleAlert,
} from 'lucide-react'

function usd(value: number) {
  return `$${value.toFixed(2)}`
}

function pct(value: number) {
  return `${(value * 100).toFixed(0)}%`
}

function marginTone(margin: number) {
  if (margin >= 0.4) return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
  if (margin >= 0.2) return 'border-amber-400/30 bg-amber-500/10 text-amber-200'
  if (margin > 0) return 'border-sky-400/30 bg-sky-500/10 text-sky-200'
  return 'border-white/10 bg-white/5 text-zinc-400'
}

export default function ArberScan() {
  const [state, action] = useActionState<ArberScanState, FormData>(
    scanArbitrageAction,
    {}
  )
  const [showAdvanced, setShowAdvanced] = useState(false)
  const result = state.result

  return (
    <div className="mt-6">
      <form action={action} className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
        <label htmlFor="arber-query" className="text-sm font-medium text-zinc-300">
          What to hunt for
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="arber-query"
            name="query"
            placeholder='e.g. "Rhystic Study", "commander staple", "dual land"'
            className="flex-1 rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-primary focus:outline-none"
          />
          <FormActionButton
            pendingLabel="Scanning…"
            className="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Find arbitrage
          </FormActionButton>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-200"
        >
          <Settings2 className="h-3.5 w-3.5" />
          {showAdvanced ? 'Hide' : 'Show'} thresholds
        </button>

        {showAdvanced ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <Knob
              name="offerPct"
              label="Best Offer at"
              suffix="% of asking"
              defaultValue={80}
            />
            <Knob name="minProfit" label="Min profit" prefix="$" defaultValue={3} />
            <Knob
              name="minMarginPct"
              label="Min margin"
              suffix="%"
              defaultValue={20}
            />
          </div>
        ) : null}

        {state.error ? (
          <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {state.error}
          </p>
        ) : null}
      </form>

      {result ? <Results result={result} /> : null}
    </div>
  )
}

function Knob({
  name,
  label,
  prefix,
  suffix,
  defaultValue,
}: {
  name: string
  label: string
  prefix?: string
  suffix?: string
  defaultValue: number
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      <span className="mt-1 flex items-center gap-1 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white">
        {prefix ? <span className="text-zinc-500">{prefix}</span> : null}
        <input
          name={name}
          type="number"
          step="any"
          min={0}
          defaultValue={defaultValue}
          className="w-full bg-transparent focus:outline-none"
        />
        {suffix ? <span className="shrink-0 text-zinc-500">{suffix}</span> : null}
      </span>
    </label>
  )
}

function Results({ result }: { result: ScanResult }) {
  const { opportunities, evaluated, usingSampleData, notes, unpricedTitles } = result
  const misses = evaluated.filter((o) => !o.profitable)

  return (
    <div className="mt-6 space-y-4">
      {usingSampleData ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Showing <strong>sample listings</strong> — set <code>EBAY_CLIENT_ID</code> and{' '}
            <code>EBAY_CLIENT_SECRET</code> to scan live eBay Best Offer listings.
          </span>
        </div>
      ) : null}

      {notes.map((note, i) => (
        <p key={i} className="text-xs text-zinc-500">
          {note}
        </p>
      ))}

      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
        <span>
          Scanned <strong className="text-zinc-200">{result.listingsScanned}</strong> listings
        </span>
        <span>
          <strong className="text-emerald-300">{opportunities.length}</strong> profitable
        </span>
        <span>
          Offer at <strong className="text-zinc-200">{pct(result.config.offerRatio)}</strong> of
          asking · min {usd(result.config.minProfitUsd)} / {pct(result.config.minMarginPct)} margin
        </span>
      </div>

      {opportunities.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-zinc-900 p-5 text-sm text-zinc-400">
          No opportunities cleared your thresholds. Loosen the offer percentage or lower the min
          profit/margin, or try a different search.
        </p>
      ) : (
        <ul className="space-y-3">
          {opportunities.map((o) => (
            <OpportunityCard key={o.listing.id} opp={o} />
          ))}
        </ul>
      )}

      {misses.length > 0 ? (
        <details className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
          <summary className="cursor-pointer text-sm font-medium text-zinc-300">
            {misses.length} below threshold
          </summary>
          <ul className="mt-3 space-y-2">
            {misses.slice(0, 20).map((o) => (
              <li
                key={o.listing.id}
                className="flex items-center justify-between gap-3 text-xs text-zinc-500"
              >
                <span className="truncate">{o.quote.cardName}</span>
                <span className={o.profit >= 0 ? 'text-zinc-400' : 'text-red-400/80'}>
                  {usd(o.profit)} ({pct(o.marginPct)})
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {unpricedTitles.length > 0 ? (
        <details className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
          <summary className="cursor-pointer text-sm font-medium text-zinc-300">
            {unpricedTitles.length} couldn&apos;t be priced
          </summary>
          <ul className="mt-3 space-y-1">
            {unpricedTitles.slice(0, 20).map((t, i) => (
              <li key={i} className="truncate text-xs text-zinc-500">
                {t}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}

function OpportunityCard({ opp }: { opp: ArbitrageOpportunity }) {
  const { listing, quote } = opp
  return (
    <li className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-primary"
          >
            <span className="truncate">{quote.cardName}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          </a>
          <p className="mt-0.5 truncate text-xs text-zinc-500">{listing.title}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-sm font-semibold ${marginTone(
            opp.marginPct
          )}`}
        >
          +{usd(opp.profit)} · {pct(opp.marginPct)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <Step label="Asking" value={usd(listing.askingPrice)} muted />
        <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
        <Step label="Offer" value={usd(opp.suggestedOffer)} accent />
        <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
        <Step label="Buylist pays" value={usd(opp.netSellback)} />
        <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
        <Step label="Profit" value={usd(opp.profit)} good />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
        <span>Market {usd(quote.marketPrice)}</span>
        <span>Buylist {quote.source}</span>
        {opp.maxProfitableOffer != null ? (
          <span>Walk-away offer ≤ {usd(opp.maxProfitableOffer)}</span>
        ) : null}
        {listing.foil ? <span className="text-amber-300/80">Foil</span> : null}
      </div>
    </li>
  )
}

function Step({
  label,
  value,
  muted,
  accent,
  good,
}: {
  label: string
  value: string
  muted?: boolean
  accent?: boolean
  good?: boolean
}) {
  const tone = good
    ? 'text-emerald-300'
    : accent
    ? 'text-primary'
    : muted
    ? 'text-zinc-400'
    : 'text-zinc-200'
  return (
    <span className="inline-flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </span>
  )
}
