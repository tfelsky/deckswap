import { CARD_CONDITION_DETAILS, CARD_CONDITIONS } from '@/lib/decks/conditions'

type DeckMarketingGuidanceProps = {
  className?: string
}

export function DeckMarketingGuidance({
  className = '',
}: DeckMarketingGuidanceProps) {
  return (
    <section className={className}>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-400">
            Listing Guide
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">
            Check condition before you price or launch
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
              Check cards in bright, indirect light and review the front, back, edges,
              and corners outside sleeves.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
              Grade from the worst visible issue, not the best angle. Whitening, dents,
              bends, ink wear, and clouding all count.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
              If a card sits between two grades, list the lower one. Conservative
              grading protects trust and reduces disputes.
            </div>
          </div>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-wide text-zinc-500">
              Card Condition
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {CARD_CONDITIONS.map((condition) => {
                const detail = CARD_CONDITION_DETAILS[condition]
                return (
                  <div
                    key={condition}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="text-xs uppercase tracking-wide text-emerald-300">
                      {detail.shortLabel}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">{detail.label}</div>
                    <p className="mt-2 text-sm text-zinc-400">{detail.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-300">
            Escrow Review
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">What happens if condition is challenged</h2>
          <div className="mt-4 space-y-3 text-sm text-zinc-300">
            <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              Mythiverse compares the received deck against the saved list, declared
              conditions, and any notes attached to the listing before release.
            </p>
            <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              If a card arrives materially below the listed condition, release pauses
              while support reviews photos, timestamps, and the inventory record.
            </p>
            <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              Resolution can include proceeding as-is, renegotiating equalization,
              applying partial credit, or returning the shipment depending on the
              mismatch.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
