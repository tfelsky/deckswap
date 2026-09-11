'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

export type ReviewDeck = {
  id: number
  name: string
  commander: string | null
  formatLabel: string
  bracketLabel: string | null
  gameChangerCount: number
  valueUsd: number
  buyNowLabel: string | null
  statusLabel: string
  statusBadgeClass: string
  imageUrl: string | null
  cardCount: number
  tokenCount: number
  colorLabel: string
  chips: string[]
}

export type ReviewDecision = 'watch' | 'pass'

const PASS_REASONS = [
  'Too pricey',
  'Wrong colors',
  'Not my format',
  'Power level mismatch',
  'Already have similar',
] as const

const COMMIT_DISTANCE = 110

type DeckReviewClientProps = {
  decks: ReviewDeck[]
  canWatch: boolean
  canPass: boolean
  decideAction: (
    deckId: number,
    decision: ReviewDecision,
    reason: string | null
  ) => Promise<{ ok: boolean }>
}

export default function DeckReviewClient({
  decks,
  canWatch,
  canPass,
  decideAction,
}: DeckReviewClientProps) {
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [watchCount, setWatchCount] = useState(0)
  const [passCount, setPassCount] = useState(0)
  const [skipCount, setSkipCount] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [leaving, setLeaving] = useState<'left' | 'right' | null>(null)
  const dragStartX = useRef<number | null>(null)

  const deck = decks[index] ?? null
  const reviewedEverything = decks.length > 0 && index >= decks.length

  const decide = useCallback(
    async (decision: ReviewDecision, reason: string | null) => {
      if (!deck || busy) return
      if (decision === 'pass' && !canPass) return
      if (decision === 'watch' && !canWatch) return

      setBusy(true)
      setError(null)
      setLeaving(decision === 'pass' ? 'left' : 'right')

      const result = await decideAction(deck.id, decision, reason).catch(() => ({ ok: false }))

      if (!result.ok) {
        setLeaving(null)
        setDragX(0)
        setBusy(false)
        setError('That decision was not saved. Check your connection and try again.')
        return
      }

      if (decision === 'watch') setWatchCount((count) => count + 1)
      else setPassCount((count) => count + 1)

      setIndex((current) => current + 1)
      setLeaving(null)
      setDragX(0)
      setBusy(false)
    },
    [deck, busy, canPass, canWatch, decideAction]
  )

  const skip = useCallback(() => {
    if (!deck || busy) return
    setError(null)
    setSkipCount((count) => count + 1)
    setIndex((current) => current + 1)
    setDragX(0)
  }, [deck, busy])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') decide('pass', null)
      else if (event.key === 'ArrowRight') decide('watch', null)
      else if (event.key === 'ArrowDown') skip()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [decide, skip])

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (busy || leaving) return
    dragStartX.current = event.clientX
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStartX.current == null || busy || leaving) return
    setDragX(event.clientX - dragStartX.current)
  }

  function onPointerUp() {
    if (dragStartX.current == null) return
    const dx = dragX
    dragStartX.current = null

    if (dx <= -COMMIT_DISTANCE && canPass) decide('pass', null)
    else if (dx >= COMMIT_DISTANCE && canWatch) decide('watch', null)
    else setDragX(0)
  }

  if (decks.length === 0 || reviewedEverything) {
    return (
      <div className="rounded-3xl border border-white/10 bg-zinc-900/55 p-10 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          {decks.length === 0 ? 'Nothing left to review' : 'Queue reviewed'}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {decks.length === 0
            ? 'Every live deck already has a decision from you. New listings will show up here.'
            : 'Every decision was recorded against your account.'}
        </p>

        {reviewedEverything ? (
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-emerald-200">
              {watchCount} watchlisted
            </span>
            <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-rose-200">
              {passCount} not interested
            </span>
            {skipCount > 0 ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-zinc-300">
                {skipCount} skipped
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8">
          <Link
            href="/decks"
            className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
          >
            Back to browsing
          </Link>
        </div>
      </div>
    )
  }

  const offsetX = leaving === 'left' ? -560 : leaving === 'right' ? 560 : dragX
  const passHintOpacity = Math.min(1, Math.max(0, -offsetX) / COMMIT_DISTANCE)
  const watchHintOpacity = Math.min(1, Math.max(0, offsetX) / COMMIT_DISTANCE)

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>
          Deck {index + 1} of {decks.length}
        </span>
        <span>
          {watchCount} watchlisted · {passCount} not interested
          {skipCount > 0 ? ` · ${skipCount} skipped` : ''}
        </span>
      </div>

      {error ? (
        <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div
        className="relative mt-4 touch-pan-y select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <article
          className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/80"
          style={{
            transform: `translateX(${offsetX}px) rotate(${offsetX / 22}deg)`,
            opacity: leaving ? 0 : 1,
            transition:
              dragStartX.current != null && !leaving
                ? 'none'
                : 'transform 200ms ease, opacity 200ms ease',
          }}
        >
          <div className="relative aspect-[16/10] overflow-hidden border-b border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950">
            {deck!.imageUrl ? (
              <img
                src={deck!.imageUrl}
                alt={deck!.name}
                draggable={false}
                className="h-full w-full object-cover object-top"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                {deck!.formatLabel}
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {deck!.commander || deck!.name}
              </div>
            </div>

            {deck!.bracketLabel ? (
              <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                {deck!.bracketLabel}
              </div>
            ) : null}
            <div
              className={`absolute right-4 top-4 rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur ${deck!.statusBadgeClass}`}
            >
              {deck!.statusLabel}
            </div>

            <div
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 rounded-xl border border-emerald-400/40 bg-emerald-400/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-emerald-100"
              style={{ opacity: watchHintOpacity }}
            >
              Watchlist
            </div>
            <div
              className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 rounded-xl border border-rose-400/40 bg-rose-400/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-rose-100"
              style={{ opacity: passHintOpacity }}
            >
              Not interested
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{deck!.name}</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {deck!.commander ? `Commander: ${deck!.commander}` : `Format: ${deck!.formatLabel}`}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-right">
                <div className="text-[10px] uppercase tracking-wide text-emerald-300/80">Value</div>
                <div className="text-lg font-semibold text-emerald-300">
                  ${deck!.valueUsd.toFixed(2)}
                </div>
              </div>
            </div>

            {deck!.buyNowLabel ? (
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
                <div className="text-[10px] uppercase tracking-wide text-amber-200/80">
                  Buy It Now
                </div>
                <div className="mt-1 text-lg font-semibold text-amber-200">
                  {deck!.buyNowLabel}
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                {deck!.colorLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                {deck!.cardCount} cards
              </span>
              {deck!.tokenCount > 0 ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                  {deck!.tokenCount} token{deck!.tokenCount === 1 ? '' : 's'}
                </span>
              ) : null}
              {deck!.gameChangerCount > 0 ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                  {deck!.gameChangerCount} Game Changer{deck!.gameChangerCount === 1 ? '' : 's'}
                </span>
              ) : null}
              {deck!.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200"
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="mt-4">
              <Link
                href={`/decks/${deck!.id}`}
                target="_blank"
                className="text-sm text-emerald-300 hover:text-emerald-200"
              >
                View full deck list →
              </Link>
            </div>
          </div>
        </article>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => decide('pass', null)}
          disabled={!canPass || busy}
          className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Not interested
        </button>
        <button
          onClick={() => decide('watch', null)}
          disabled={!canWatch || busy}
          className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add to watchlist
        </button>
      </div>

      {canPass ? (
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">
            Not interested because…
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {PASS_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => decide('pass', reason)}
                disabled={busy}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-rose-400/30 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between text-sm">
        <button
          onClick={skip}
          disabled={busy}
          className="text-zinc-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Skip — no decision recorded
        </button>
        <span className="hidden text-xs text-zinc-600 sm:block">
          ← not interested · → watchlist · ↓ skip · or drag the card
        </span>
      </div>
    </div>
  )
}
