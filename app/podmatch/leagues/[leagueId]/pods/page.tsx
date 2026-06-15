import Link from 'next/link'
import { notFound } from 'next/navigation'
import AppHeader from '@/components/app-header'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { getLeagueForViewer, getPods, type PodWithSeats } from '@/lib/podmatch/leagues'
import { GeneratePodsButton } from '@/components/podmatch/league-forms'
import PrintButton from '@/components/podmatch/print-button'
import LeagueTabs from '@/components/podmatch/league-tabs'
import { AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LeaguePodsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const { leagueId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { isAdmin } = await getAdminAccessForUser(user)
  const viewer = await getLeagueForViewer(supabase, leagueId, user.id)
  if (!viewer) notFound()
  const { league, role } = viewer
  const isLeagueAdmin = role === 'admin'

  const pods = await getPods(supabase, leagueId)
  const byRound = new Map<number, PodWithSeats[]>()
  for (const pod of pods) {
    const list = byRound.get(pod.round_number) ?? []
    list.push(pod)
    byRound.set(pod.round_number, list)
  }
  const rounds = Array.from(byRound.keys()).sort((a, b) => b - a)

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white print:bg-white print:pt-0 print:text-zinc-900">
      <div className="print:hidden">
        <AppHeader current="podmatch" isSignedIn isAdmin={isAdmin} />
      </div>

      <section className="mx-auto max-w-4xl px-6 py-10 print:py-4">
        <h1 className="text-2xl font-semibold">{league.name}</h1>
        <div className="print:hidden">
          <LeagueTabs leagueId={leagueId} current="pods" />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 print:hidden">
          {isLeagueAdmin ? <GeneratePodsButton leagueId={leagueId} /> : null}
          {pods.length > 0 ? <PrintButton /> : null}
        </div>

        {pods.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-5 text-sm text-zinc-400 print:hidden">
            {isLeagueAdmin
              ? 'No pods yet. Generate a round once players have approved, scored decks.'
              : 'No pods yet. The admin will generate the next round.'}
          </p>
        ) : (
          <div className="mt-8 space-y-8">
            {rounds.map((round) => (
              <div key={round}>
                <h2 className="text-lg font-semibold">Round {round}</h2>
                <div className="mt-3 space-y-4">
                  {byRound.get(round)!.map((pod) => (
                    <div
                      key={pod.id}
                      className="rounded-3xl border border-white/10 bg-zinc-900 p-5 print:border-zinc-300 print:bg-white"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-base font-semibold">
                          Table {pod.table_number} · avg power {pod.average_power ?? '—'}
                        </h3>
                        <div className="flex items-center gap-3">
                          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-zinc-300 print:text-zinc-900">
                            Fit {pod.fit_score ?? '—'}
                          </span>
                          <Link
                            href={`/podmatch/leagues/${leagueId}/report-game?pod=${pod.id}`}
                            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground print:hidden"
                          >
                            Report result
                          </Link>
                        </div>
                      </div>

                      <ul className="mt-3 divide-y divide-white/5 print:divide-zinc-200">
                        {pod.seats.map((seat) => (
                          <li key={seat.player_id} className="flex items-center justify-between py-2 text-sm">
                            <span className="font-medium">{seat.player_name}</span>
                            <span className="text-zinc-400 print:text-zinc-600">{seat.deck_name}</span>
                          </li>
                        ))}
                      </ul>

                      {pod.warnings.length > 0 ? (
                        <div className="mt-3 space-y-1">
                          {pod.warnings.map((w, i) => (
                            <p
                              key={i}
                              className="flex items-start gap-2 text-xs text-amber-300 print:text-amber-700"
                            >
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              {w}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
