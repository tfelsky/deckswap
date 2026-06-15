import Link from 'next/link'
import AppHeader from '@/components/app-header'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  DECK_SCORES_SETUP_MESSAGE,
  getDecksForPods,
  getUserDecksWithScores,
} from '@/lib/podmatch/decks'
import { generatePods, type PodOptions } from '@/lib/podmatch/pods'
import PodSelector, { type SelectableDeck } from '@/components/podmatch/pod-selector'
import PrintButton from '@/components/podmatch/print-button'
import { AlertTriangle, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

function parseDeckIds(value: string | string[] | undefined): number[] {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return []
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((n) => Number.isFinite(n) && n > 0)
    )
  )
}

function fitTone(fit: number) {
  if (fit >= 85) return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
  if (fit >= 70) return 'border-amber-400/30 bg-amber-500/10 text-amber-200'
  return 'border-red-400/30 bg-red-500/10 text-red-200'
}

export default async function GeneratePodsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
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
            <h1 className="text-3xl font-semibold">Pod generator</h1>
            <p className="mt-3 text-zinc-400">Sign in to generate balanced Commander pods.</p>
            <Link href="/sign-in" className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
              Sign in
            </Link>
          </div>
        </section>
      </main>
    )
  }

  const { isAdmin } = await getAdminAccessForUser(user)

  const options: PodOptions = {
    allowProxies: params.proxies !== '0',
    allowStax: params.stax !== '0',
    allowCombo: params.combo !== '0',
  }
  const selectedIds = parseDeckIds(params.decks)

  // Selector source: all of the user's scored decks.
  const { decks: allDecks, scores, schemaMissing: listSchemaMissing } =
    await getUserDecksWithScores(supabase, user.id)
  const selectableDecks: SelectableDeck[] = allDecks
    .filter((deck) => scores.get(deck.id)?.overall_power != null)
    .map((deck) => ({
      id: deck.id,
      name: deck.name,
      commander: deck.commander,
      power: scores.get(deck.id)!.overall_power as number,
    }))

  // Results (only when decks are selected).
  let result: ReturnType<typeof generatePods> | null = null
  let unscored: Awaited<ReturnType<typeof getDecksForPods>>['unscored'] = []
  let genSchemaMissing = false
  if (selectedIds.length > 0) {
    const podData = await getDecksForPods(supabase, user.id, selectedIds)
    unscored = podData.unscored
    genSchemaMissing = podData.schemaMissing
    if (podData.decks.length >= 3) {
      result = generatePods(podData.decks, options)
    }
  }

  const schemaMissing = listSchemaMissing || genSchemaMissing

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white print:bg-white print:pt-0 print:text-zinc-900">
      <div className="print:hidden">
        <AppHeader current="podmatch" isSignedIn isAdmin={isAdmin} />
      </div>

      <section className="mx-auto max-w-4xl px-6 py-10 print:py-4">
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold">Pod generator</h1>
              <p className="text-sm text-zinc-400">
                Pick 4+ scored decks and build fair, explainable Commander pods.
              </p>
            </div>
          </div>
          <Link href="/podmatch" className="text-sm text-zinc-400 hover:text-white">
            ← PodMatch
          </Link>
        </div>

        {schemaMissing ? (
          <p className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 print:hidden">
            {DECK_SCORES_SETUP_MESSAGE}
          </p>
        ) : null}

        <div className="mt-6">
          <PodSelector
            decks={selectableDecks}
            initialSelected={selectedIds}
            initialOptions={{
              proxies: options.allowProxies,
              stax: options.allowStax,
              combo: options.allowCombo,
            }}
          />
        </div>

        {unscored.length > 0 ? (
          <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 print:hidden">
            Skipped {unscored.length} unscored deck{unscored.length === 1 ? '' : 's'}:{' '}
            {unscored.map((d) => d.name).join(', ')}. Analyze them in PodMatch to include them.
          </p>
        ) : null}

        {result ? (
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {result.pods.length} pod{result.pods.length === 1 ? '' : 's'}
              </h2>
              <PrintButton />
            </div>

            <div className="mt-4 space-y-5">
              {result.pods.map((pod) => (
                <div
                  key={pod.pod_id}
                  className="rounded-3xl border border-white/10 bg-zinc-900 p-5 print:border-zinc-300 print:bg-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">
                      Table {pod.table_number} · avg power {pod.average_power}
                    </h3>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold print:border-zinc-300 print:text-zinc-900 ${fitTone(pod.fit_score)}`}
                    >
                      Fit {pod.fit_score}
                    </span>
                  </div>

                  <ul className="mt-4 divide-y divide-white/5 print:divide-zinc-200">
                    {pod.decks.map((deck) => (
                      <li key={deck.id} className="flex items-center justify-between py-2">
                        <div>
                          <Link
                            href={`/podmatch/decks/${deck.id}`}
                            className="font-medium hover:text-primary print:text-zinc-900"
                          >
                            {deck.name}
                          </Link>
                          {deck.commander ? (
                            <span className="ml-2 text-sm text-zinc-400">{deck.commander}</span>
                          ) : null}
                        </div>
                        <span className="text-sm text-zinc-400">Power {deck.overall_power}</span>
                      </li>
                    ))}
                  </ul>

                  {pod.warnings.length > 0 ? (
                    <div className="mt-4 space-y-1.5">
                      {pod.warnings.map((warning, i) => (
                        <p
                          key={i}
                          className="flex items-start gap-2 text-sm text-amber-300 print:text-amber-700"
                        >
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          {warning}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-emerald-300 print:text-emerald-700">
                      No table fairness warnings.
                    </p>
                  )}
                </div>
              ))}

              {result.benched.length > 0 ? (
                <p className="text-sm text-zinc-400">
                  Benched (not enough for another pod): {result.benched.map((d) => d.name).join(', ')}
                </p>
              ) : null}
            </div>
          </div>
        ) : selectedIds.length > 0 ? (
          <p className="mt-6 text-sm text-zinc-400">
            Need at least 3 scored decks among your selection to build a pod.
          </p>
        ) : null}
      </section>
    </main>
  )
}
