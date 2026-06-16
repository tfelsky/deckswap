import Link from 'next/link'
import { notFound } from 'next/navigation'
import AppHeader from '@/components/app-header'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  getLeagueForViewer,
  getMyPlayer,
  getPods,
  type GameSummary,
  type PodWithSeats,
} from '@/lib/podmatch/leagues'
import { getEventStandings, getGames, isEvent } from '@/lib/podmatch/events'
import InviteCode from '@/components/podmatch/invite-code'
import {
  ReportResultForm,
  SetNameForm,
  StartRoundButton,
} from '@/components/podmatch/event-forms'
import { confirmResultAction, finalizeResultAction } from '../actions'
import { CheckCircle2, Clock, Trophy } from 'lucide-react'

export const dynamic = 'force-dynamic'

function winnerName(game: GameSummary): string {
  return game.players.find((p) => p.placement === 1)?.display_name ?? '—'
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { isAdmin } = await getAdminAccessForUser(user)
  const viewer = await getLeagueForViewer(supabase, eventId, user.id)
  if (!viewer || !isEvent(viewer.league)) notFound()
  const { league, role } = viewer
  const isHost = role === 'admin'

  const [standings, pods, games, myPlayer] = await Promise.all([
    getEventStandings(supabase, eventId),
    getPods(supabase, eventId),
    getGames(supabase, eventId),
    getMyPlayer(supabase, eventId, user.id),
  ])
  const myPlayerId = myPlayer?.id ?? null

  const latestRound = pods.reduce((max, p) => Math.max(max, p.round_number), 0)
  const currentPods = pods
    .filter((p) => p.round_number === latestRound)
    .sort((a, b) => a.table_number - b.table_number)
  const myPod = currentPods.find((p) => p.seats.some((s) => s.player_id === myPlayerId)) ?? null

  // pod_id -> most recent reported game for the current round.
  const gameByPod = new Map<string, GameSummary>()
  for (const game of games) {
    if (game.pod_id && !gameByPod.has(game.pod_id)) gameByPod.set(game.pod_id, game)
  }

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="podmatch" isSignedIn isAdmin={isAdmin} />

      <section className="mx-auto max-w-md px-5 py-8">
        <Link href="/podmatch/play" className="text-sm text-zinc-400 hover:text-white">
          ← Events
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{league.name}</h1>
          <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400">
            {latestRound > 0 ? `Round ${latestRound}` : 'Not started'}
          </span>
        </div>

        {/* Player: confirm name */}
        {myPlayer ? (
          <div className="mt-5 rounded-3xl border border-white/10 bg-zinc-900 p-4">
            <p className="text-sm font-medium text-zinc-300">You&apos;re registered. Your name:</p>
            <div className="mt-3">
              <SetNameForm leagueId={eventId} defaultName={myPlayer.display_name} />
            </div>
          </div>
        ) : null}

        {/* Player: your table this round */}
        {myPlayer ? (
          <div className="mt-5">
            <h2 className="text-sm font-semibold text-zinc-300">Your table</h2>
            {latestRound === 0 ? (
              <p className="mt-2 rounded-2xl border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-400">
                Waiting for the host to start round 1. Sit tight.
              </p>
            ) : !myPod ? (
              <p className="mt-2 rounded-2xl border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-400">
                You&apos;ll be paired in the next round.
              </p>
            ) : (
              <MyTableCard
                pod={myPod}
                game={gameByPod.get(myPod.id) ?? null}
                leagueId={eventId}
                myPlayerId={myPlayerId}
              />
            )}
          </div>
        ) : null}

        {/* Host controls */}
        {isHost ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold text-zinc-300">Invite players</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Share this code — players join, then you pair tables.
              </p>
              {league.invite_code ? (
                <div className="mt-3">
                  <InviteCode code={league.invite_code} joinPath="/podmatch/play" />
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold text-zinc-300">
                {standings.length} player{standings.length === 1 ? '' : 's'} registered
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {latestRound === 0
                  ? 'Pair the first round once players have joined.'
                  : 'Pair the next round when this one is reported.'}
              </p>
              <div className="mt-4">
                <StartRoundButton
                  leagueId={eventId}
                  label={latestRound === 0 ? 'Start round 1' : `Start round ${latestRound + 1}`}
                />
              </div>
            </div>

            {currentPods.length > 0 ? (
              <div>
                <h2 className="text-sm font-semibold text-zinc-300">
                  Round {latestRound} tables
                </h2>
                <ul className="mt-3 space-y-3">
                  {currentPods.map((pod) => (
                    <HostTableCard
                      key={pod.id}
                      pod={pod}
                      game={gameByPod.get(pod.id) ?? null}
                      leagueId={eventId}
                    />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Standings */}
        <div className="mt-7">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <Trophy className="h-4 w-4 text-amber-300" /> Standings
          </h2>
          {standings.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-400">
              No players yet.
            </p>
          ) : (
            <ol className="mt-3 space-y-1.5">
              {standings.map((row, i) => (
                <li
                  key={row.player.id}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 text-sm ${
                    row.player.id === myPlayerId
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-white/10 bg-zinc-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-5 text-zinc-500">{i + 1}</span>
                    <span className="font-medium">
                      {row.player.display_name}
                      {row.player.id === myPlayerId ? (
                        <span className="ml-2 text-xs text-primary">you</span>
                      ) : null}
                    </span>
                  </span>
                  <span className="text-zinc-400">
                    {row.wins}W · {row.games_played} played
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </main>
  )
}

function GameStatus({ game }: { game: GameSummary }) {
  const isFinal = game.status === 'final'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        isFinal
          ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
          : 'border-amber-400/30 bg-amber-500/10 text-amber-200'
      }`}
    >
      {isFinal ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
      {isFinal ? 'Final' : `${game.confirmations}/2 confirmed`}
    </span>
  )
}

function MyTableCard({
  pod,
  game,
  leagueId,
  myPlayerId,
}: {
  pod: PodWithSeats
  game: GameSummary | null
  leagueId: string
  myPlayerId: string | null
}) {
  return (
    <div className="mt-2 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 to-zinc-900 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Table {pod.table_number}</h3>
        {game ? <GameStatus game={game} /> : null}
      </div>
      <ul className="mt-3 space-y-1.5">
        {pod.seats.map((seat) => (
          <li
            key={seat.player_id}
            className={`rounded-xl px-3 py-2 text-sm ${
              seat.player_id === myPlayerId ? 'bg-primary/15 font-medium' : 'bg-white/5'
            }`}
          >
            {seat.player_name}
            {seat.player_id === myPlayerId ? (
              <span className="ml-2 text-xs text-primary">you</span>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-4">
        {!game ? (
          <ReportResultForm
            leagueId={leagueId}
            podId={pod.id}
            roundNumber={pod.round_number}
            seats={pod.seats.map((s) => ({ id: s.player_id, name: s.player_name }))}
          />
        ) : game.status === 'final' ? (
          <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Winner: <span className="font-semibold">{winnerName(game)}</span>
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-zinc-300">
              Reported winner: <span className="font-semibold">{winnerName(game)}</span>. Confirm to
              lock it in.
            </p>
            {myPlayerId ? (
              <form action={confirmResultAction}>
                <input type="hidden" name="leagueId" value={leagueId} />
                <input type="hidden" name="gameId" value={game.id} />
                <input type="hidden" name="playerId" value={myPlayerId} />
                <button className="w-full rounded-2xl bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:opacity-90">
                  Confirm result
                </button>
              </form>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

function HostTableCard({
  pod,
  game,
  leagueId,
}: {
  pod: PodWithSeats
  game: GameSummary | null
  leagueId: string
}) {
  return (
    <li className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">Table {pod.table_number}</span>
        {game ? (
          <GameStatus game={game} />
        ) : (
          <span className="text-xs text-zinc-500">No result yet</span>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-400">
        {pod.seats.map((s) => s.player_name).join(' · ')}
      </p>

      {!game ? (
        <div className="mt-3">
          <ReportResultForm
            leagueId={leagueId}
            podId={pod.id}
            roundNumber={pod.round_number}
            seats={pod.seats.map((s) => ({ id: s.player_id, name: s.player_name }))}
          />
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-sm">
            Winner: <span className="font-semibold">{winnerName(game)}</span>
          </span>
          {game.status !== 'final' ? (
            <form action={finalizeResultAction}>
              <input type="hidden" name="leagueId" value={leagueId} />
              <input type="hidden" name="gameId" value={game.id} />
              <button className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20">
                Finalize
              </button>
            </form>
          ) : null}
        </div>
      )}
    </li>
  )
}
