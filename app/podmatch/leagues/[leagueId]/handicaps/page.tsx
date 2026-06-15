import { notFound } from 'next/navigation'
import AppHeader from '@/components/app-header'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { getLeague } from '@/lib/podmatch/leagues'
import { getHandicapData, getPlayerRatings } from '@/lib/podmatch/league-ratings'
import { computeHandicap, resolveHandicapConfig } from '@/lib/podmatch/handicap'
import { setHandicapsAction } from '../../actions'
import LeagueTabs from '@/components/podmatch/league-tabs'

export const dynamic = 'force-dynamic'

const bandTone: Record<string, string> = {
  leader: 'border-red-400/30 bg-red-500/10 text-red-200',
  trailer: 'border-sky-400/30 bg-sky-500/10 text-sky-200',
  neutral: 'border-white/10 bg-white/5 text-zinc-300',
}

export default async function LeagueHandicapsPage({
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
  const league = await getLeague(supabase, leagueId, user.id)
  if (!league) notFound()

  const config = resolveHandicapConfig(league.settings)
  const [{ ratings, schemaMissing }, handicapData] = await Promise.all([
    getPlayerRatings(supabase, leagueId),
    getHandicapData(supabase, leagueId),
  ])
  const ratingByPlayer = new Map(ratings.map((r) => [r.player_id, r]))

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="podmatch" isSignedIn isAdmin={isAdmin} />

      <section className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold">{league.name}</h1>
        <LeagueTabs leagueId={leagueId} current="handicaps" />

        {schemaMissing ? (
          <p className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            Ratings need the latest migration
            (supabase/migrations/..._create_podmatch_ratings.sql). Run it to track Elo and enable
            handicaps.
          </p>
        ) : null}

        {/* Toggle + formula */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Soft handicaps</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {config.enabled ? 'Enabled' : 'Disabled'} · transparent and fully optional.
              </p>
            </div>
            <form action={setHandicapsAction}>
              <input type="hidden" name="leagueId" value={leagueId} />
              <input type="hidden" name="enabled" value={(!config.enabled).toString()} />
              <button
                className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition ${
                  config.enabled
                    ? 'border border-white/10 bg-white/5 hover:bg-white/10'
                    : 'bg-primary text-primary-foreground hover:opacity-90'
                }`}
              >
                {config.enabled ? 'Disable handicaps' : 'Enable handicaps'}
              </button>
            </form>
          </div>

          <div className="mt-4 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-zinc-300">
            <p className="font-medium text-white">How it works (no hidden math)</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-400">
              <li>
                <strong>Leaders</strong> (top third, ≥50% recent win rate, or rating ≥1600) are
                placed in stronger pods and earn bonus points at{' '}
                {config.bonus_point_multiplier}×. Placement points always count in full.
              </li>
              <li>
                <strong>Trailers</strong> (bottom third, rating ≤1425, or avg placement ≥3) get a
                +{config.catch_up_bonus} catch-up bonus per game and precon/jank eligibility.
              </li>
              <li>Everyone else is neutral. Mechanical handicaps stay off unless you opt in.</li>
            </ul>
          </div>
        </div>

        {/* Ratings + per-player handicap */}
        <h2 className="mt-10 text-xl font-semibold">Players</h2>
        {handicapData.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-white/10 bg-zinc-900 p-5 text-sm text-zinc-400">
            Add players and finalize games to build ratings.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {handicapData.map((datum) => {
              const out = computeHandicap(datum.input, config)
              const rating = ratingByPlayer.get(datum.player_id)
              return (
                <li
                  key={datum.player_id}
                  className="rounded-2xl border border-white/10 bg-zinc-900 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="font-medium">{datum.display_name}</span>
                      <span className="ml-2 text-sm text-zinc-500">
                        rating {rating?.rating ?? 1500} · {rating?.games ?? 0} games · rank{' '}
                        {datum.input.league_rank}/{datum.input.league_size}
                      </span>
                    </div>
                    {config.enabled ? (
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${bandTone[out.band]}`}
                      >
                        {out.band} · {out.matchmaking_adjustment.replace('_', ' ')}
                      </span>
                    ) : null}
                  </div>
                  {config.enabled ? (
                    <ul className="mt-3 space-y-1 text-sm text-zinc-400">
                      {out.explanation.map((line, i) => (
                        <li key={i}>• {line}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
