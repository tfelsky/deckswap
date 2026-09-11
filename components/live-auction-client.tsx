'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Gavel, Mic, RadioTower, Users } from 'lucide-react'
import {
  LOT_SECONDS,
  formatUsd,
  getBroadcastState,
  type BroadcastState,
  type LiveEvent,
  type LotTier,
} from '@/lib/live-auction'
import { Button } from '@/components/ui/button'

const TIER_LABEL: Record<LotTier, string> = {
  budget: 'Budget Banger',
  staple: 'Format Staple',
  chase: 'Chase Card',
  grail: 'Grail Piece',
}

const TIER_CARD_CLASS: Record<LotTier, string> = {
  budget: 'from-emerald-500/15 via-transparent to-transparent border-emerald-500/25',
  staple: 'from-sky-500/15 via-transparent to-transparent border-sky-500/25',
  chase: 'from-violet-500/20 via-transparent to-transparent border-violet-500/30',
  grail: 'from-amber-500/20 via-transparent to-transparent border-amber-500/35',
}

function speakerTone(event: LiveEvent): string {
  switch (event.kind) {
    case 'bid':
      return 'text-amber-500'
    case 'sold':
      return 'text-emerald-500'
    case 'hammer':
      return 'text-orange-500'
    case 'commentary':
      return 'text-sky-500'
    default:
      return 'text-primary'
  }
}

function nextLocalTimeForUtcHour(nowMs: number, utcHour: number): string {
  const date = new Date(nowMs)
  date.setUTCMinutes(0, 0, 0)
  for (let i = 0; i < 25 && date.getUTCHours() !== utcHour; i++) {
    date.setUTCHours(date.getUTCHours() + 1)
  }
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function PhaseBanner({ state }: { state: BroadcastState }) {
  if (state.phase === 'sold') {
    return (
      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-center text-sm font-bold uppercase tracking-[0.3em] text-emerald-500">
        Sold to {state.leadingBidder ?? 'the floor'}
      </div>
    )
  }

  if (state.phase === 'hammer') {
    const hammerCalls = state.visibleEvents.filter((event) => event.kind === 'hammer').length
    return (
      <div className="animate-pulse rounded-lg border border-orange-500/40 bg-orange-500/15 px-4 py-2 text-center text-sm font-bold uppercase tracking-[0.3em] text-orange-500">
        {hammerCalls >= 2 ? 'Going twice…' : 'Going once…'}
      </div>
    )
  }

  if (state.phase === 'preview') {
    return (
      <div className="rounded-lg border border-border bg-secondary/40 px-4 py-2 text-center text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
        Lot walk-up — bidding opens in a moment
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-center text-sm font-bold uppercase tracking-[0.3em] text-primary">
      Bidding open
    </div>
  )
}

export default function LiveAuctionClient() {
  const [state, setState] = useState<BroadcastState | null>(null)
  const feedRef = useRef<HTMLDivElement | null>(null)

  // The broadcast is a pure function of the clock, so hydration must wait for
  // the client's clock: render nothing until mounted, then tick every second.
  useEffect(() => {
    setState(getBroadcastState(Date.now()))
    const timer = setInterval(() => setState(getBroadcastState(Date.now())), 1000)
    return () => clearInterval(timer)
  }, [])

  const eventCount = state?.visibleEvents.length ?? 0
  useEffect(() => {
    const feed = feedRef.current
    if (feed) feed.scrollTop = feed.scrollHeight
  }, [eventCount])

  if (!state) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-border bg-card">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RadioTower className="h-5 w-5 animate-pulse text-primary" />
          Tuning in to the live floor…
        </div>
      </div>
    )
  }

  const { show, lot } = state
  const bids = state.visibleEvents.filter((event) => event.kind === 'bid' || event.kind === 'sold')
  const lotProgress = Math.min(100, Math.max(0, (state.secondsIntoLot / LOT_SECONDS) * 100))

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
        <strong>Demo broadcast.</strong> Every lot, bid, and bidder on this channel is simulated to
        preview the format — nothing here is for sale. Real auctions run at{' '}
        <Link href="/auctions" className="font-medium underline underline-offset-2">
          /auctions
        </Link>
        .
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Stage */}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/40 px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                ON AIR <span className="text-muted-foreground">/</span> {show.name}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{show.tagline}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-primary" />
              {state.viewerCount.toLocaleString()} watching
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div
              className={`rounded-lg border bg-gradient-to-br p-5 ${TIER_CARD_CLASS[lot.tier]}`}
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                <span className="rounded-full border border-border bg-background/40 px-2.5 py-0.5">
                  Lot #{state.slotIndex % 1000}
                </span>
                <span className="rounded-full border border-border bg-background/40 px-2.5 py-0.5">
                  {TIER_LABEL[lot.tier]}
                </span>
                <span className="rounded-full border border-border bg-background/40 px-2.5 py-0.5">
                  {lot.condition} · {lot.finish === 'nonfoil' ? 'Non-foil' : lot.finish} · {lot.rarity}
                </span>
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground">{lot.name}</h2>
              <div className="mt-1 text-sm text-muted-foreground">{lot.setName}</div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{lot.blurb}</p>

              <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    {state.phase === 'sold' ? 'Hammer price' : 'Current bid'}
                  </div>
                  <div className="mt-1 text-4xl font-bold tabular-nums text-foreground">
                    {formatUsd(state.currentPriceUsd)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {state.leadingBidder
                      ? `${state.phase === 'sold' ? 'Won by' : 'Leading:'} ${state.leadingBidder}`
                      : 'Waiting on the first paddle'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Est. value
                  </div>
                  <div className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                    {formatUsd(lot.estValueUsd)}
                  </div>
                </div>
              </div>
            </div>

            <PhaseBanner state={state} />

            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Lot clock</span>
                <span className="tabular-nums">{state.secondsRemaining}s to hammer</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
                  style={{ width: `${lotProgress}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/35 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Gavel className="h-4 w-4 text-primary" />
                Up next on the block:
                <span className="font-medium text-foreground">{state.nextLot.name}</span>
                <span className="text-xs">({state.nextLot.setName})</span>
              </div>
              <div className="text-xs text-muted-foreground">
                est. {formatUsd(state.nextLot.estValueUsd)}
              </div>
            </div>
          </div>
        </div>

        {/* Booth: commentary feed + bid ledger */}
        <div className="flex flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Mic className="h-4 w-4 text-primary" />
                The Booth
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {show.barker} · {show.commentators.join(' · ')}
              </div>
            </div>
            <div ref={feedRef} className="h-72 space-y-3 overflow-y-auto p-4 lg:h-80">
              {state.visibleEvents.map((event, index) => (
                <div key={`${state.slotIndex}-${index}`} className="text-sm leading-6">
                  <span className={`font-semibold ${speakerTone(event)}`}>{event.speaker}:</span>{' '}
                  <span
                    className={
                      event.kind === 'sold'
                        ? 'font-semibold text-foreground'
                        : 'text-muted-foreground'
                    }
                  >
                    {event.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border bg-secondary/40 px-4 py-3 text-sm font-semibold text-foreground">
              Bid Ledger
            </div>
            <div className="divide-y divide-border">
              {bids.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  No paddles up yet on this lot.
                </div>
              ) : (
                [...bids].reverse().slice(0, 5).map((bid, index) => (
                  <div
                    key={`${state.slotIndex}-bid-${bids.length - index}`}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <span className={index === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                      {bid.bidder}
                      {bid.kind === 'sold' ? ' 🔨' : ''}
                    </span>
                    <span
                      className={`tabular-nums ${index === 0 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}
                    >
                      {formatUsd(bid.amountUsd ?? 0)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Program guide */}
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Up next on the channel
          </span>
          {state.upNext.map((entry) => (
            <span
              key={entry.show.key}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground"
            >
              <span className="font-medium text-foreground">{entry.show.name}</span>
              {nextLocalTimeForUtcHour(Date.now(), entry.startsAtUtcHour)}
            </span>
          ))}
        </div>
        <Button variant="outline" asChild>
          <Link href="/auctions">
            Browse real auctions
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
