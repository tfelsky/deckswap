import Link from 'next/link'
import AppHeader from '@/components/app-header'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { JoinLeagueForm } from '@/components/podmatch/league-forms'

export const dynamic = 'force-dynamic'

export default async function JoinLeaguePage({
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

  if (!user) {
    const next = `/podmatch/leagues/join${code ? `?code=${encodeURIComponent(code)}` : ''}`
    return (
      <main className="min-h-screen bg-zinc-950 pt-32 text-white">
        <AppHeader current="podmatch" isSignedIn={false} />
        <section className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-8">
            <h1 className="text-3xl font-semibold">Join a league</h1>
            <p className="mt-3 text-zinc-400">Sign in to join with your invite code.</p>
            <Link
              href={`/sign-in?next=${encodeURIComponent(next)}`}
              className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Sign in
            </Link>
          </div>
        </section>
      </main>
    )
  }

  const { isAdmin } = await getAdminAccessForUser(user)

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="podmatch" isSignedIn isAdmin={isAdmin} />
      <section className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/podmatch/leagues" className="text-sm text-zinc-400 hover:text-white">
          ← Leagues
        </Link>
        <div className="mt-4 rounded-3xl border border-white/10 bg-zinc-900 p-8">
          <h1 className="text-2xl font-semibold">Join a league</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Enter the invite code your league admin shared. You&apos;ll then register your own
            deck and play.
          </p>
          <div className="mt-5">
            <JoinLeagueForm defaultCode={code} />
          </div>
        </div>
      </section>
    </main>
  )
}
