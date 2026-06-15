import Link from 'next/link'
import { notFound } from 'next/navigation'
import AppHeader from '@/components/app-header'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  getLeagueForViewer,
  getLeaguePlayers,
  getPods,
  getRegisteredDecks,
} from '@/lib/podmatch/leagues'
import ReportGameForm, { type ReportSeat } from '@/components/podmatch/report-game-form'
import LeagueTabs from '@/components/podmatch/league-tabs'

export const dynamic = 'force-dynamic'

export default async function ReportGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { leagueId } = await params
  const sp = await searchParams
  const podId = (Array.isArray(sp.pod) ? sp.pod[0] : sp.pod) || null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { isAdmin } = await getAdminAccessForUser(user)
  const viewer = await getLeagueForViewer(supabase, leagueId, user.id)
  if (!viewer) notFound()
  const { league } = viewer

  let seats: ReportSeat[] = []
  let roundNumber = 1

  if (podId) {
    const pods = await getPods(supabase, leagueId)
    const pod = pods.find((p) => p.id === podId)
    if (pod) {
      roundNumber = pod.round_number
      seats = pod.seats.map((s) => ({
        player_id: s.player_id,
        player_name: s.player_name,
        deck_id: s.deck_id,
        deck_name: s.deck_name,
      }))
    }
  }

  if (seats.length === 0) {
    // Ad-hoc game: every league player, with their first approved deck if any.
    const [players, registered] = await Promise.all([
      getLeaguePlayers(supabase, leagueId),
      getRegisteredDecks(supabase, leagueId),
    ])
    const deckByPlayer = new Map<string, { deck_id: number; deck_name: string }>()
    for (const deck of registered) {
      if (deck.player_id && deck.approved && !deckByPlayer.has(deck.player_id)) {
        deckByPlayer.set(deck.player_id, { deck_id: deck.deck_id, deck_name: deck.deck_name })
      }
    }
    seats = players.map((p) => {
      const deck = deckByPlayer.get(p.id)
      return {
        player_id: p.id,
        player_name: p.display_name,
        deck_id: deck?.deck_id ?? null,
        deck_name: deck?.deck_name ?? 'No deck registered',
      }
    })
  }

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="podmatch" isSignedIn isAdmin={isAdmin} />

      <section className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold">{league.name}</h1>
        <LeagueTabs leagueId={leagueId} current="overview" />

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Report a game</h2>
          <Link href={`/podmatch/leagues/${leagueId}`} className="text-sm text-zinc-400 hover:text-white">
            ← Back
          </Link>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          {podId ? `Result for a generated pod (round ${roundNumber}).` : 'Ad-hoc result.'} Points
          are computed from the league&apos;s scoring rules.
        </p>

        {seats.length < 2 ? (
          <p className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            You need at least two players in this league to report a game.
          </p>
        ) : (
          <div className="mt-6">
            <ReportGameForm leagueId={leagueId} podId={podId} roundNumber={roundNumber} seats={seats} />
          </div>
        )}
      </section>
    </main>
  )
}
