import Link from 'next/link'
import AppHeader from '@/components/app-header'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  getMyLeagues,
  isLeagueSchemaMissing,
  LEAGUE_SETUP_MESSAGE,
  type LeagueWithRole,
} from '@/lib/podmatch/leagues'
import { CreateLeagueForm } from '@/components/podmatch/league-forms'
import { Trophy, Ticket } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LeaguesPage() {
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
            <h1 className="text-3xl font-semibold">Leagues</h1>
            <p className="mt-3 text-zinc-400">Sign in to run or join a Commander league.</p>
            <Link href="/sign-in" className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
              Sign in
            </Link>
          </div>
        </section>
      </main>
    )
  }

  const { isAdmin } = await getAdminAccessForUser(user)

  let leagues: LeagueWithRole[] = []
  let schemaMissing = false
  try {
    leagues = await getMyLeagues(supabase, user.id)
  } catch (error) {
    if (isLeagueSchemaMissing(error instanceof Error ? error.message : '')) schemaMissing = true
    else throw error
  }

  const adminLeagues = leagues.filter((l) => l.role === 'admin')
  const joinedLeagues = leagues.filter((l) => l.role === 'member')

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="podmatch" isSignedIn isAdmin={isAdmin} />

      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold">Leagues</h1>
              <p className="text-sm text-zinc-400">Run a season, or join one with an invite code.</p>
            </div>
          </div>
          <Link
            href="/podmatch/leagues/join"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
          >
            <Ticket className="h-4 w-4" /> Join with code
          </Link>
        </div>

        {schemaMissing ? (
          <p className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            {LEAGUE_SETUP_MESSAGE}
          </p>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold">New league</h2>
            <p className="mt-1 text-sm text-zinc-400">You&apos;ll be the league admin.</p>
            <div className="mt-4">
              <CreateLeagueForm />
            </div>
          </div>

          <div className="space-y-6">
            <LeagueGroup title="Leagues you run" leagues={adminLeagues} empty="No leagues yet. Create one." />
            <LeagueGroup
              title="Leagues you've joined"
              leagues={joinedLeagues}
              empty="None yet. Use an invite code to join."
            />
          </div>
        </div>
      </section>
    </main>
  )
}

function LeagueGroup({
  title,
  leagues,
  empty,
}: {
  title: string
  leagues: LeagueWithRole[]
  empty: string
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {leagues.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-white/10 bg-zinc-900 p-5 text-sm text-zinc-400">
          {empty}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {leagues.map((league) => (
            <li key={league.id}>
              <Link
                href={`/podmatch/leagues/${league.id}`}
                className="block rounded-2xl border border-white/10 bg-zinc-900 p-4 transition hover:border-primary/30 hover:bg-zinc-900/60"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{league.name}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${
                      league.role === 'admin'
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-white/10 text-zinc-400'
                    }`}
                  >
                    {league.role}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  Pod size {league.pod_size} · {league.scoring_model.replace('_', ' ')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
