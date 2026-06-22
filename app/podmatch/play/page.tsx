import Link from 'next/link'
import AppHeader from '@/components/app-header'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { getMyLeagues, isLeagueSchemaMissing, LEAGUE_SETUP_MESSAGE } from '@/lib/podmatch/leagues'
import { isEvent } from '@/lib/podmatch/events'
import { formatEventDateTime } from '@/lib/podmatch/event-reminders'
import { CreateEventForm, JoinEventForm } from '@/components/podmatch/event-forms'
import { MapPin, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PlayHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const code = (Array.isArray(sp.code) ? sp.code[0] : sp.code) || ''

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { isAdmin } = user ? await getAdminAccessForUser(user) : { isAdmin: false }

  let events: Awaited<ReturnType<typeof getMyLeagues>> = []
  let schemaMissing = false
  if (user) {
    try {
      const leagues = await getMyLeagues(supabase, user.id)
      events = leagues.filter((l) => isEvent(l))
    } catch (error) {
      if (isLeagueSchemaMissing(error instanceof Error ? error.message : '')) schemaMissing = true
      else throw error
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="podmatch" isSignedIn={!!user} isAdmin={isAdmin} />

      <section className="mx-auto max-w-md px-5 py-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <MapPin className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Play at a shop</h1>
            <p className="text-sm text-zinc-400">Join tonight&apos;s event and get your table.</p>
          </div>
        </div>

        {schemaMissing ? (
          <p className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            {LEAGUE_SETUP_MESSAGE}
          </p>
        ) : null}

        {/* Join — the primary walk-in action */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-5">
          <h2 className="text-base font-semibold">Have an event code?</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Ask the organizer for tonight&apos;s code, then join.
          </p>
          <div className="mt-4">
            <JoinEventForm defaultCode={code} />
          </div>
          {!user ? (
            <p className="mt-3 text-xs text-zinc-500">
              You&apos;ll sign in (or make a quick account) first — your code is saved.
            </p>
          ) : null}
        </div>

        {/* Your events */}
        {user && events.length > 0 ? (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-zinc-300">Your events</h2>
            <ul className="mt-3 space-y-2">
              {events.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/podmatch/play/${event.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-4 transition hover:border-primary/30"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Users className="h-4 w-4 shrink-0 text-zinc-500" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{event.name}</span>
                        {formatEventDateTime(event) ? (
                          <span className="block text-xs text-zinc-500">
                            {formatEventDateTime(event)}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${
                        event.role === 'admin'
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-white/10 text-zinc-400'
                      }`}
                    >
                      {event.role === 'admin' ? 'Host' : 'Playing'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Host */}
        <details className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-5">
          <summary className="cursor-pointer text-base font-semibold">
            Running the event?
          </summary>
          <p className="mt-2 text-sm text-zinc-400">
            Create an event, share the code, and pair tables in one tap.
          </p>
          <div className="mt-4">
            {user ? (
              <CreateEventForm />
            ) : (
              <Link
                href="/sign-in?next=/podmatch/play"
                className="inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                Sign in to host
              </Link>
            )}
          </div>
        </details>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Want deck power scoring and full leagues?{' '}
          <Link href="/podmatch" className="text-zinc-400 hover:underline">
            Open PodMatch
          </Link>
        </p>
      </section>
    </main>
  )
}
