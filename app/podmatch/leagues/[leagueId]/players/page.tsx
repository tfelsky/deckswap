import { notFound } from 'next/navigation'
import AppHeader from '@/components/app-header'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { getUserDecksWithScores } from '@/lib/podmatch/decks'
import {
  getLeague,
  getLeaguePlayers,
  getRegisteredDecks,
  type RegisteredDeck,
} from '@/lib/podmatch/leagues'
import { AddPlayerForm, RegisterDeckForm } from '@/components/podmatch/league-forms'
import { toggleDeckApprovalAction } from '../../actions'
import LeagueTabs from '@/components/podmatch/league-tabs'

export const dynamic = 'force-dynamic'

export default async function LeaguePlayersPage({
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

  const [players, registered, { decks: allDecks, scores }] = await Promise.all([
    getLeaguePlayers(supabase, leagueId),
    getRegisteredDecks(supabase, leagueId),
    getUserDecksWithScores(supabase, user.id),
  ])

  const selectableDecks = allDecks.map((deck) => ({
    id: deck.id,
    name: deck.name,
    power: (scores.get(deck.id)?.overall_power as number | undefined) ?? null,
  }))

  const decksByPlayer = new Map<string, RegisteredDeck[]>()
  for (const deck of registered) {
    if (!deck.player_id) continue
    const list = decksByPlayer.get(deck.player_id) ?? []
    list.push(deck)
    decksByPlayer.set(deck.player_id, list)
  }

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="podmatch" isSignedIn isAdmin={isAdmin} />

      <section className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold">{league.name}</h1>
        <LeagueTabs leagueId={leagueId} current="players" />

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold">Add a player</h2>
            <p className="mt-1 text-sm text-zinc-400">Roster entries you manage as the host.</p>
            <div className="mt-4">
              <AddPlayerForm leagueId={leagueId} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold">Register a deck</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Assign one of your decks to a player. Scored decks are eligible for pods.
            </p>
            <div className="mt-4">
              <RegisterDeckForm leagueId={leagueId} players={players} decks={selectableDecks} />
            </div>
          </div>
        </div>

        <h2 className="mt-10 text-xl font-semibold">Roster</h2>
        {players.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-white/10 bg-zinc-900 p-5 text-sm text-zinc-400">
            No players yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {players.map((player) => {
              const decks = decksByPlayer.get(player.id) ?? []
              return (
                <li key={player.id} className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{player.display_name}</span>
                    <span className="text-xs text-zinc-500">
                      {decks.length} deck{decks.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {decks.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {decks.map((deck) => (
                        <li
                          key={deck.deck_id}
                          className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm"
                        >
                          <span>
                            {deck.deck_name}
                            <span className="ml-2 text-xs text-zinc-500">
                              {deck.power != null ? `power ${deck.power}` : 'not scored'}
                            </span>
                          </span>
                          <form action={toggleDeckApprovalAction}>
                            <input type="hidden" name="leagueId" value={leagueId} />
                            <input type="hidden" name="deckId" value={deck.deck_id} />
                            <input type="hidden" name="approved" value={(!deck.approved).toString()} />
                            <button
                              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                                deck.approved
                                  ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                                  : 'border border-white/10 text-zinc-400 hover:bg-white/10'
                              }`}
                            >
                              {deck.approved ? 'Approved' : 'Approve'}
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">No decks registered.</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
