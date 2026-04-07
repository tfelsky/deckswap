'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CheckCircle2, LockKeyhole } from 'lucide-react'
import { useMemo, useState } from 'react'

type QuoteFocus = 'floor' | 'suggested'

type BuyNowQuoteGateProps = {
  currency: string
  buylistFloor: string
  suggestedBuyNow: string
}

type SpeedChoice = 'fast' | 'patient' | null
type ReadinessChoice = 'ready' | 'needs_help' | null

export function BuyNowQuoteGate({
  currency,
  buylistFloor,
  suggestedBuyNow,
}: BuyNowQuoteGateProps) {
  const [revealed, setRevealed] = useState(false)
  const [speed, setSpeed] = useState<SpeedChoice>(null)
  const [readiness, setReadiness] = useState<ReadinessChoice>(null)

  const canReveal = speed !== null && readiness !== null

  const recommendedFocus = useMemo<QuoteFocus>(() => {
    if (speed === 'fast' || readiness === 'needs_help') return 'floor'
    return 'suggested'
  }, [readiness, speed])

  return (
    <div className="mt-4 min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-white">Buy It Now Quote</div>
          <p className="mt-2 text-sm text-amber-50/80">
            Answer two quick questions to get a starting price in {currency}.
          </p>
        </div>
        <div className="shrink-0 rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300">
          <LockKeyhole className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div>
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
            Speed
          </div>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setSpeed('fast')}
              className={cn(
                'rounded-xl border px-4 py-3 text-left text-sm transition',
                speed === 'fast'
                  ? 'border-rose-300/30 bg-rose-300/10 text-white'
                  : 'border-white/10 bg-zinc-950/60 text-zinc-300 hover:bg-white/5'
              )}
            >
              Sell fast
              <div className="mt-1 text-xs text-zinc-400">Price for faster movement.</div>
            </button>
            <button
              type="button"
              onClick={() => setSpeed('patient')}
              className={cn(
                'rounded-xl border px-4 py-3 text-left text-sm transition',
                speed === 'patient'
                  ? 'border-emerald-300/30 bg-emerald-300/10 text-white'
                  : 'border-white/10 bg-zinc-950/60 text-zinc-300 hover:bg-white/5'
              )}
            >
              Hold for better price
              <div className="mt-1 text-xs text-zinc-400">Wait for a stronger buyer.</div>
            </button>
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
            Shipping ready
          </div>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setReadiness('ready')}
              className={cn(
                'rounded-xl border px-4 py-3 text-left text-sm transition',
                readiness === 'ready'
                  ? 'border-emerald-300/30 bg-emerald-300/10 text-white'
                  : 'border-white/10 bg-zinc-950/60 text-zinc-300 hover:bg-white/5'
              )}
            >
              Yes, sleeved and boxed
              <div className="mt-1 text-xs text-zinc-400">Ready to go.</div>
            </button>
            <button
              type="button"
              onClick={() => setReadiness('needs_help')}
              className={cn(
                'rounded-xl border px-4 py-3 text-left text-sm transition',
                readiness === 'needs_help'
                  ? 'border-amber-300/30 bg-amber-300/10 text-white'
                  : 'border-white/10 bg-zinc-950/60 text-zinc-300 hover:bg-white/5'
              )}
            >
              Not yet
              <div className="mt-1 text-xs text-zinc-400">Still needs prep.</div>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => {
            if (canReveal) setRevealed(true)
          }}
          disabled={!canReveal}
          className="rounded-xl bg-amber-400 text-black hover:bg-amber-300"
        >
          Show quote
        </Button>
        {!canReveal ? (
          <div className="text-xs text-zinc-500">Choose both answers to unlock the quote.</div>
        ) : null}
      </div>

      {revealed ? (
        <div className="mt-5 space-y-4">
          <div
            className={cn(
              'rounded-2xl border p-4 text-sm',
              recommendedFocus === 'floor'
                ? 'border-amber-300/20 bg-amber-300/10 text-amber-50'
                : 'border-emerald-300/20 bg-emerald-300/10 text-emerald-50'
            )}
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4" />
              <div>
                <div className="font-medium text-white">
                  {recommendedFocus === 'floor'
                    ? 'Recommended: start near the floor'
                    : 'Recommended: stronger ask'}
                </div>
                <p className="mt-1 text-xs leading-5">
                  {recommendedFocus === 'floor'
                    ? 'Faster sale: start closer to the floor.'
                    : 'You can wait, so start with the stronger quote.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div
              className={cn(
                'rounded-2xl border p-4',
                recommendedFocus === 'floor'
                  ? 'border-amber-300/20 bg-amber-300/10'
                  : 'border-white/10 bg-zinc-950/60'
              )}
            >
              <div className="text-xs uppercase tracking-wide text-zinc-500">Buylist floor</div>
              <div className="mt-2 break-words text-xl font-semibold text-amber-200">{buylistFloor}</div>
            </div>
            <div
              className={cn(
                'rounded-2xl border p-4',
                recommendedFocus === 'suggested'
                  ? 'border-emerald-300/20 bg-emerald-300/10'
                  : 'border-white/10 bg-zinc-950/60'
              )}
            >
              <div className="text-xs uppercase tracking-wide text-zinc-500">Suggested BIN</div>
              <div className="mt-2 break-words text-xl font-semibold text-white">{suggestedBuyNow}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
