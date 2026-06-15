import Link from 'next/link'
import { notFound } from 'next/navigation'
import AppHeader from '@/components/app-header'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import {
  DECK_SCORES_SETUP_MESSAGE,
  getDeckForScoring,
  getDeckScore,
} from '@/lib/podmatch/decks'
import { SUB_SCORE_LABELS, type SubScoreKey } from '@/lib/podmatch/scoring'
import type { RuleZeroProfile } from '@/lib/podmatch/rule-zero'
import ScoreDeckForm from '@/components/podmatch/score-deck-form'
import { Printer } from 'lucide-react'

export const dynamic = 'force-dynamic'

function barTone(value: number) {
  if (value >= 8) return '[&_[data-slot=progress-indicator]]:bg-red-400'
  if (value >= 6.5) return '[&_[data-slot=progress-indicator]]:bg-amber-400'
  if (value >= 4.5) return '[&_[data-slot=progress-indicator]]:bg-emerald-400'
  return '[&_[data-slot=progress-indicator]]:bg-sky-400'
}

export default async function PodMatchDeckPage({
  params,
}: {
  params: Promise<{ deckId: string }>
}) {
  const { deckId: deckIdParam } = await params
  const deckId = Number(deckIdParam)
  if (!Number.isFinite(deckId) || deckId <= 0) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 pt-32 text-white">
        <AppHeader current="podmatch" isSignedIn={false} />
        <section className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-8">
            <h1 className="text-3xl font-semibold">Sign in required</h1>
            <p className="mt-3 text-zinc-400">Sign in to analyze this deck.</p>
            <Link href="/sign-in" className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
              Sign in
            </Link>
          </div>
        </section>
      </main>
    )
  }

  const { isAdmin } = await getAdminAccessForUser(user)

  const bundle = await getDeckForScoring(supabase, deckId, user.id)
  if (!bundle) notFound()

  const { deck, cards } = bundle
  const { score, schemaMissing } = await getDeckScore(supabase, deckId)

  const bracket = getCommanderBracketSummary(
    cards.map((card) => ({
      card_name: card.card_name,
      section:
        card.section === 'mainboard' ||
        card.section === 'commander' ||
        card.section === 'sideboard' ||
        card.section === 'token'
          ? card.section
          : 'mainboard',
      quantity: card.quantity,
      mana_cost: card.mana_cost ?? null,
      cmc: typeof card.cmc === 'number' ? card.cmc : null,
    }))
  )

  const explanation = score?.explanation ?? null
  const ruleZero = (score?.rule_zero as RuleZeroProfile | null) ?? null
  const subKeys = Object.keys(SUB_SCORE_LABELS) as Array<Exclude<SubScoreKey, 'overall_power'>>

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="podmatch" isSignedIn isAdmin={isAdmin} />

      <section className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/podmatch" className="text-sm text-zinc-400 hover:text-white">
          ← Back to PodMatch
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{deck.name}</h1>
            {deck.commander ? (
              <p className="mt-1 text-zinc-400">{deck.commander}</p>
            ) : null}
            <p className="mt-1 text-sm text-zinc-500">
              {bracket.label} · {cards.length} card rows
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ScoreDeckForm
              deckId={deck.id}
              label={score ? 'Recalculate' : 'Score deck'}
              pendingLabel="Scoring…"
            />
            {score ? (
              <Link
                href={`/podmatch/decks/${deck.id}/print`}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
              >
                <Printer className="h-4 w-4" /> Print sheet
              </Link>
            ) : null}
          </div>
        </div>

        {schemaMissing ? (
          <p className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            {DECK_SCORES_SETUP_MESSAGE}
          </p>
        ) : null}

        {!score ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-8 text-center">
            <p className="text-zinc-400">
              This deck hasn&apos;t been analyzed yet. Run the scorer to see its
              explainable power profile.
            </p>
          </div>
        ) : (
          <>
            {/* Overall power */}
            <div className="mt-8 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-900/40 p-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-zinc-400">
                    Overall power
                  </p>
                  <p className="mt-1 text-5xl font-bold">{score.overall_power}</p>
                  <p className="text-sm text-zinc-500">out of 10</p>
                </div>
              </div>
              {explanation?.overall_power?.drivers?.length ? (
                <ul className="mt-4 space-y-1 text-sm text-zinc-300">
                  {explanation.overall_power.drivers.map((d, i) => (
                    <li key={i}>• {d}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            {/* Sub-scores */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {subKeys.map((key) => {
                const value = (score[key] as number | null) ?? 0
                const drivers = explanation?.[key]?.drivers ?? []
                return (
                  <details
                    key={key}
                    className="group rounded-2xl border border-white/10 bg-zinc-900 p-4"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between">
                      <span className="font-medium">{SUB_SCORE_LABELS[key]}</span>
                      <span className="text-sm font-semibold text-zinc-300">
                        {value}/10
                      </span>
                    </summary>
                    <Progress
                      value={value * 10}
                      className={`mt-3 ${barTone(value)}`}
                    />
                    {drivers.length ? (
                      <ul className="mt-3 space-y-1 text-sm text-zinc-400">
                        {drivers.map((d, i) => (
                          <li key={i}>• {d}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-zinc-500">No notable signals.</p>
                    )}
                  </details>
                )
              })}
            </div>

            {/* Rule-zero profile */}
            {ruleZero ? (
              <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-xl font-semibold">Rule-Zero profile</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Share this before the game so the table can rule-zero fairly.
                </p>
                <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Row label="Estimated power" value={String(ruleZero.estimated_power)} />
                  <Row label="Speed" value={ruleZero.speed_band} />
                  <Row label="Tutors" value={ruleZero.tutor_band} />
                  <Row label="Salt" value={ruleZero.salt_band} />
                  <Row
                    label="Combos"
                    value={
                      ruleZero.combo.present
                        ? `Yes — ${ruleZero.combo.count} known line${ruleZero.combo.count === 1 ? '' : 's'}`
                        : 'None detected'
                    }
                  />
                  <Row label="Proxies" value={ruleZero.proxy_use} />
                  <Row
                    label="Estimated value"
                    value={
                      ruleZero.estimated_value_usd > 0
                        ? `~$${ruleZero.estimated_value_usd.toLocaleString('en-US')}`
                        : 'Unknown'
                    }
                  />
                </dl>

                {ruleZero.flags.length ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {ruleZero.flags.map((flag, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <p className="mt-5 text-sm text-zinc-300">{ruleZero.notes}</p>
              </div>
            ) : null}

            {score.calculated_at ? (
              <p className="mt-6 text-xs text-zinc-600">
                Last scored {new Date(score.calculated_at).toLocaleString()}
              </p>
            ) : null}
          </>
        )}
      </section>
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2">
      <dt className="text-sm text-zinc-400">{label}</dt>
      <dd className="text-sm font-medium text-white">{value}</dd>
    </div>
  )
}
