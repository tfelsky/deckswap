'use client'

import Link from 'next/link'
import { useState } from 'react'
import { buildTradeMatchesHref, getTradeGoalDescription, getTradeGoalLabel } from '@/lib/decks/trade-challenge'
import { getDeckFormatLabel } from '@/lib/decks/formats'

type DeckTradeChallengeCardProps = {
  deckId: number
  deckName: string
  commander?: string | null
  format?: string | null
  valueUsd?: number | null
  bracketLabel?: string | null
  shareHeadline?: string | null
  tradeGoal?: string | null
  wantedProfile?: string | null
  wantedColors?: string[] | null
  wantedFormats?: string[] | null
  ownerDisplayName?: string | null
  ownerUsername?: string | null
  completedTradesCount?: number | null
  successfulShipmentsCount?: number | null
  trustBadges?: string[]
  compareHref: string
  compareLabel: string
}

function formatUsd(value?: number | null) {
  const amount = Number(value ?? 0)
  return amount > 0 ? `$${amount.toFixed(2)}` : 'Value pending'
}

function absoluteDeckUrl(deckId: number) {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/decks/${deckId}`
}

export default function DeckTradeChallengeCard({
  deckId,
  deckName,
  commander,
  format,
  valueUsd,
  bracketLabel,
  shareHeadline,
  tradeGoal,
  wantedProfile,
  wantedColors,
  wantedFormats,
  ownerDisplayName,
  ownerUsername,
  completedTradesCount,
  successfulShipmentsCount,
  trustBadges,
  compareHref,
  compareLabel,
}: DeckTradeChallengeCardProps) {
  const [copied, setCopied] = useState(false)
  const profileLabel = ownerDisplayName || (ownerUsername ? `@${ownerUsername}` : 'DeckSwap trader')
  const visibleBadges = trustBadges?.slice(0, 3) ?? []

  async function handleCopyLink() {
    const url = absoluteDeckUrl(deckId)
    if (!url) return

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  return (
    <section className="rounded-[2rem] border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(52,211,153,0.14),rgba(15,23,42,0.92),rgba(8,47,73,0.72))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-emerald-200">
            Trade Challenge
          </div>
          <h2 className="mt-4 text-3xl font-semibold text-white">
            {shareHeadline?.trim() || `Would you trade into ${deckName}?`}
          </h2>
          <p className="mt-3 text-sm leading-7 text-emerald-50/80">
            Share this deck with your pod, Discord, or trade group and invite people to compare their inventory against it.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-100">
              {commander || 'Commander not set'}
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-100">
              {getDeckFormatLabel(format)}
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-100">
              {bracketLabel || 'Bracket pending'}
            </span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
              {formatUsd(valueUsd)}
            </span>
          </div>
        </div>

        <div className="w-full max-w-sm rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-emerald-200/80">Share this deck</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
            >
              {copied ? 'Link copied' : 'Copy link'}
            </button>
            <Link
              href={compareHref}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-medium text-white hover:bg-white/10"
            >
              {compareLabel}
            </Link>
          </div>
          <p className="mt-3 text-xs leading-6 text-zinc-400">
            Best loop: share the page, then invite viewers to import a deck and see how close the match is.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">Looking for</div>
          <div className="mt-3 text-lg font-medium text-white">{getTradeGoalLabel(tradeGoal)}</div>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{getTradeGoalDescription(tradeGoal)}</p>

          {wantedProfile?.trim() ? (
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-zinc-200">
              {wantedProfile}
            </p>
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Wanted colors</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(wantedColors?.length ? wantedColors : ['Any color identity']).map((value) => (
                  <span key={value} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                    {value}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Wanted formats</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(wantedFormats?.length ? wantedFormats : ['Any format']).map((value) => (
                  <span key={value} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                    {value === 'Any format' ? value : getDeckFormatLabel(value)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">Trader snapshot</div>
          <div className="mt-3 text-lg font-medium text-white">{profileLabel}</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Completed trades</div>
              <div className="mt-2 text-2xl font-semibold text-white">{completedTradesCount ?? 0}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Successful shipments</div>
              <div className="mt-2 text-2xl font-semibold text-white">{successfulShipmentsCount ?? 0}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {visibleBadges.length > 0 ? (
              visibleBadges.map((badge) => (
                <span key={badge} className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
                  {badge}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                Trust badges pending
              </span>
            )}
          </div>
          <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
            {buildTradeMatchesHref(deckId) === compareHref
              ? 'Import your deck to see your personal match score against this listing.'
              : 'You already have decks. Jump straight into a focused comparison against this listing.'}
          </div>
        </div>
      </div>
    </section>
  )
}
