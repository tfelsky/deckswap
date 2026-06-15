import { notFound } from 'next/navigation'
import AppHeader from '@/components/app-header'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { getLeagueForViewer, getStandings } from '@/lib/podmatch/leagues'
import { getPlayerRatings } from '@/lib/podmatch/league-ratings'
import { syncRatingsAction } from '../../actions'
import PrintButton from '@/components/podmatch/print-button'
import LeagueTabs from '@/components/podmatch/league-tabs'

export const dynamic = 'force-dynamic'

export default async function LeagueStandingsPage({
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

  const [standings, { ratings }] = await Promise.all([
    getStandings(supabase, leagueId),
    getPlayerRatings(supabase, leagueId),
  ])
  const ratingByPlayer = new Map(ratings.map((r) => [r.player_id, r.rating]))

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white print:bg-white print:pt-0 print:text-zinc-900">
      <div className="print:hidden">
        <AppHeader current="podmatch" isSignedIn isAdmin={isAdmin} />
      </div>

      <section className="mx-auto max-w-3xl px-6 py-10 print:py-4">
        <h1 className="text-2xl font-semibold">{league.name}</h1>
        <div className="print:hidden">
          <LeagueTabs leagueId={leagueId} current="standings" />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Standings</h2>
          <div className="flex items-center gap-2 print:hidden">
            {isLeagueAdmin ? (
              <form action={syncRatingsAction}>
                <input type="hidden" name="leagueId" value={leagueId} />
                <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10">
                  Sync ratings
                </button>
              </form>
            ) : null}
            {standings.length > 0 ? <PrintButton /> : null}
          </div>
        </div>
        <p className="mt-1 text-sm text-zinc-500 print:text-zinc-600">
          Computed from finalized games only.
          {isLeagueAdmin
            ? ' Use "Sync ratings" after member-confirmed games to update Elo.'
            : ''}
        </p>

        {standings.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-5 text-sm text-zinc-400 print:hidden">
            No players yet — add players and finalize some games to build standings.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 print:border-zinc-300">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-zinc-400 print:bg-zinc-100 print:text-zinc-700">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Player</th>
                  <th className="p-3 text-right">Points</th>
                  <th className="p-3 text-right">Wins</th>
                  <th className="p-3 text-right">Games</th>
                  <th className="p-3 text-right">Avg place</th>
                  <th className="p-3 text-right">Rating</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr
                    key={row.player_id}
                    className="border-t border-white/5 print:border-zinc-200"
                  >
                    <td className="p-3 text-zinc-400">{row.rank}</td>
                    <td className="p-3 font-medium">{row.display_name}</td>
                    <td className="p-3 text-right font-semibold">{row.points}</td>
                    <td className="p-3 text-right text-zinc-400 print:text-zinc-600">{row.wins}</td>
                    <td className="p-3 text-right text-zinc-400 print:text-zinc-600">{row.games}</td>
                    <td className="p-3 text-right text-zinc-400 print:text-zinc-600">
                      {row.average_placement ?? '—'}
                    </td>
                    <td className="p-3 text-right text-zinc-400 print:text-zinc-600">
                      {ratingByPlayer.get(row.player_id) ?? 1500}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
