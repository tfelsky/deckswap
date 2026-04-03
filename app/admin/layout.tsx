import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const ADMIN_EMAIL = 'tim.felsky@gmail.com'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  if (user.email !== ADMIN_EMAIL) {
    redirect('/decks')
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <Link
            href="/decks"
            className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
          >
            {'<-'} Back to marketplace
          </Link>

          <div className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                Admin Control
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">Admin Dashboard</h1>
              <p className="mt-3 max-w-3xl text-zinc-400">
                Monitor marketplace health, review business signals, and run maintenance actions like commander backfills and full re-enrichment.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/backfill-decks"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Maintenance
              </Link>
              <Link
                href="/admin/trends"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Trend Watcher
              </Link>
            </div>
          </div>
        </div>
      </section>

      {children}
    </main>
  )
}
