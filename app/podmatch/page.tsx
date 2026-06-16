import Link from 'next/link'
import AppHeader from '@/components/app-header'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  DECK_SCORES_SETUP_MESSAGE,
  getUserDecksWithScores,
  type DeckScoreRow,
} from '@/lib/podmatch/decks'
import ScoreDeckForm from '@/components/podmatch/score-deck-form'
import { Sparkles, ScrollText, Scale, Users, Trophy, MapPin } from 'lucide-react'

export const dynamic = 'force-dynamic'

function powerTone(power: number | null) {
  if (power == null) return 'border-white/10 bg-white/5 text-zinc-300'
  if (power >= 8) return 'border-red-400/30 bg-red-500/10 text-red-200'
  if (power >= 6.5) return 'border-amber-400/30 bg-amber-500/10 text-amber-200'
  if (power >= 4.5) return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
  return 'border-sky-400/30 bg-sky-500/10 text-sky-200'
}

export default async function PodMatchPage() {
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
            <h1 className="text-3xl font-semibold">PodMatch</h1>
            <p className="mt-3 text-zinc-400">
              Sign in to analyze your decks, see explainable power scores, and generate
              rule-zero profiles for fairer Commander pods.
            </p>
            <Link
              href="/sign-in"
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

  let decks: Awaited<ReturnType<typeof getUserDecksWithScores>>['decks'] = []
  let scores = new Map<number, DeckScoreRow>()
  let schemaMissing = false
  let loadError: string | null = null

  try {
    const result = await getUserDecksWithScores(supabase, user.id)
    decks = result.decks
    scores = result.scores
    schemaMissing = result.schemaMissing
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Failed to load decks.'
  }

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="podmatch" isSignedIn isAdmin={isAdmin} />

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-900/40 p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Scale className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-3xl font-semibold">PodMatch</h1>
              <p className="text-sm text-zinc-400">
                Fair Commander pods, explainable deck scoring, and rule-zero profiles —
                based on your actual decklists.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Feature icon={<Sparkles className="h-5 w-5" />} title="Explainable scoring">
              Power, speed, consistency, interaction, combo, tutors, salt, budget &amp;
              casual friction — each with the reasons behind it.
            </Feature>
            <Feature icon={<ScrollText className="h-5 w-5" />} title="Rule-zero profiles">
              A printable pre-game disclosure that flags combos, stax, extra turns and
              budget so tables can rule-zero fairly.
            </Feature>
            <Feature icon={<Scale className="h-5 w-5" />} title="Deterministic">
              No opaque AI number. Same deck, same score, every time — so you can trust
              and adjust it.
            </Feature>
          </div>
        </div>

        {loadError ? (
          <p className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {loadError}
          </p>
        ) : null}

        {schemaMissing ? (
          <p className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            {DECK_SCORES_SETUP_MESSAGE}
          </p>
        ) : null}

        <Link
          href="/podmatch/play"
          className="mt-6 flex items-center justify-between gap-3 rounded-3xl border border-primary/30 bg-primary/10 p-5 transition hover:bg-primary/15"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <MapPin className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold">Play at a shop</span>
              <span className="block text-sm text-zinc-400">
                Join an in-store event by code, get your table, report results — no deck setup.
              </span>
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-primary">Open →</span>
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/podmatch/pods/generate"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Users className="h-4 w-4" /> Generate pods
          </Link>
          <Link
            href="/podmatch/leagues"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <Trophy className="h-4 w-4" /> Leagues
          </Link>
          <span className="text-sm text-zinc-500">
            Build fair tables, or run a full season.
          </span>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your decks</h2>
          <Link href="/import-deck" className="text-sm text-primary hover:underline">
            Import a deck
          </Link>
        </div>

        {decks.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-white/10 bg-zinc-900 p-8 text-center">
            <p className="text-zinc-400">
              You have no decks yet. Import a decklist to start analyzing.
            </p>
            <Link
              href="/import-deck"
              className="mt-5 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Import your first deck
            </Link>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => {
              const score = scores.get(deck.id)
              const power = score?.overall_power ?? null
              return (
                <li
                  key={deck.id}
                  className="flex flex-col justify-between rounded-3xl border border-white/10 bg-zinc-900 p-5"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/podmatch/decks/${deck.id}`}
                        className="text-lg font-semibold hover:text-primary"
                      >
                        {deck.name}
                      </Link>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${powerTone(power)}`}
                      >
                        {power != null ? `Power ${power}` : 'Not scored'}
                      </span>
                    </div>
                    {deck.commander ? (
                      <p className="mt-1 text-sm text-zinc-400">{deck.commander}</p>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    {power != null ? (
                      <Link
                        href={`/podmatch/decks/${deck.id}`}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
                      >
                        View analysis
                      </Link>
                    ) : (
                      <ScoreDeckForm deckId={deck.id} label="Analyze" pendingLabel="Analyzing…" />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">{children}</p>
    </div>
  )
}
