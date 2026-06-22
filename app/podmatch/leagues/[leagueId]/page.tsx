import Link from 'next/link'
import { notFound } from 'next/navigation'
import AppHeader from '@/components/app-header'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  getGames,
  getLeagueForViewer,
  getLeaguePlayers,
  getMyPlayer,
  type GameSummary,
} from '@/lib/podmatch/leagues'
import { confirmGameAction, finalizeGameAction } from '../actions'
import LeagueTabs from '@/components/podmatch/league-tabs'
import InviteCode from '@/components/podmatch/invite-code'
import AchievementSelfReport from '@/components/podmatch/achievement-self-report'
import { CheckCircle2, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LeagueOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { leagueId } = await params
  const sp = await searchParams
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

  const [players, games, myPlayer] = await Promise.all([
    getLeaguePlayers(supabase, leagueId),
    getGames(supabase, leagueId),
    isLeagueAdmin ? Promise.resolve(null) : getMyPlayer(supabase, leagueId, user.id),
  ])
  const myPlayerId = myPlayer?.id ?? null

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="podmatch" isSignedIn isAdmin={isAdmin} />

      <section className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/podmatch/leagues" className="text-sm text-zinc-400 hover:text-white">
          ← Leagues
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">{league.name}</h1>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
              isLeagueAdmin
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-white/10 text-zinc-400'
            }`}
          >
            {isLeagueAdmin ? 'Admin' : 'Member'}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Pod size {league.pod_size} · {league.scoring_model.replace('_', ' ')} ·{' '}
          {players.length} player{players.length === 1 ? '' : 's'}
        </p>

        <LeagueTabs leagueId={leagueId} current="overview" />

        {sp.reported === '1' ? (
          <p className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            Game reported. It&apos;s provisional until two players confirm or the admin finalizes it.
          </p>
        ) : null}

        {/* Admin: invite code */}
        {isLeagueAdmin && league.invite_code ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold text-zinc-300">Invite players</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Share this code (or link) — anyone signed in can join, register their own deck, and play.
            </p>
            <div className="mt-3">
              <InviteCode code={league.invite_code} />
            </div>
          </div>
        ) : null}

        {/* Member: prompt to register a deck */}
        {!isLeagueAdmin ? (
          <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-300">
            You&apos;ve joined this league.{' '}
            <Link
              href={`/podmatch/leagues/${leagueId}/players`}
              className="text-primary hover:underline"
            >
              Register your deck
            </Link>{' '}
            so the admin can pod you in.
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/podmatch/leagues/${leagueId}/report-game`}
            className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Report a game
          </Link>
          <Link
            href={`/podmatch/leagues/${leagueId}/standings`}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium hover:bg-white/10"
          >
            Standings
          </Link>
        </div>

        <h2 className="mt-10 text-xl font-semibold">Recent games</h2>
        {games.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-white/10 bg-zinc-900 p-5 text-sm text-zinc-400">
            No games reported yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                leagueId={leagueId}
                isAdmin={isLeagueAdmin}
                myPlayerId={myPlayerId}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function GameCard({
  game,
  leagueId,
  isAdmin,
  myPlayerId,
}: {
  game: GameSummary
  leagueId: string
  isAdmin: boolean
  myPlayerId: string | null
}) {
  const isFinal = game.status === 'final'
  return (
    <li className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">
          Round {game.round_number} · {new Date(game.played_at).toLocaleDateString()}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
            isFinal
              ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
              : 'border-amber-400/30 bg-amber-500/10 text-amber-200'
          }`}
        >
          {isFinal ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          {isFinal ? 'Final' : `Provisional · ${game.confirmations}/2 confirmed`}
        </span>
      </div>

      <ul className="mt-3 divide-y divide-white/5">
        {game.players.map((p) => {
          // Admin can confirm any row (on behalf); a member only their own.
          const canConfirm = !isFinal && (isAdmin || p.player_id === myPlayerId)
          return (
            <li key={p.player_id} className="py-2 text-sm">
              <div className="flex items-center justify-between">
                <span>
                  <span className="text-zinc-500">{p.placement ? `#${p.placement}` : '—'}</span>{' '}
                  <span className="font-medium">{p.display_name}</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400">{p.points_awarded} pts</span>
                  {canConfirm ? (
                    <form action={confirmGameAction}>
                      <input type="hidden" name="leagueId" value={leagueId} />
                      <input type="hidden" name="gameId" value={game.id} />
                      <input type="hidden" name="playerId" value={p.player_id} />
                      <button className="rounded-lg border border-white/10 px-2 py-1 text-xs hover:bg-white/10">
                        Confirm
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
              <AchievementSelfReport
                leagueId={leagueId}
                gameId={game.id}
                playerId={p.player_id}
                goals={p.achievement_goals}
                canReport={p.player_id === myPlayerId}
              />
            </li>
          )
        })}
      </ul>

      {isAdmin && !isFinal ? (
        <form action={finalizeGameAction} className="mt-3">
          <input type="hidden" name="leagueId" value={leagueId} />
          <input type="hidden" name="gameId" value={game.id} />
          <button className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20">
            Finalize now (admin)
          </button>
        </form>
      ) : null}
    </li>
  )
}
