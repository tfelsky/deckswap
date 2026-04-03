import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  formatShipFrom,
  getTrustBadges,
  isProfileSchemaMissing,
  marketplaceLinks,
  type ProfileVerification,
  type PublicProfile,
  type ReputationSummary,
} from '@/lib/profiles'
import { getDeckFormatLabel, normalizeDeckFormat } from '@/lib/decks/formats'

export const dynamic = 'force-dynamic'

type SellerDeck = {
  id: number
  name: string
  commander?: string | null
  format?: string | null
  image_url?: string | null
  price_total_usd_foil?: number | null
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()

  const profileResult = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .maybeSingle()

  if (!profileResult.data) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-zinc-900 p-8">
          <h1 className="text-3xl font-semibold">Profile not found</h1>
          <p className="mt-3 text-zinc-400">
            {isProfileSchemaMissing(profileResult.error?.message)
              ? 'Profile tables have not been added in Supabase yet.'
              : `No public profile was found for @${username}.`}
          </p>
          <Link href="/decks" className="mt-6 inline-block rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">
            Browse decks
          </Link>
        </div>
      </main>
    )
  }

  const profile = profileResult.data as PublicProfile
  const [summaryResult, verificationResult, decksResult] = await Promise.all([
    supabase.from('profile_reputation_summary').select('*').eq('user_id', profile.user_id).maybeSingle(),
    supabase
      .from('profile_verifications')
      .select('id, user_id, verification_type, status, notes')
      .eq('user_id', profile.user_id),
    supabase
      .from('decks')
      .select('id, name, commander, format, image_url, price_total_usd_foil')
      .eq('user_id', profile.user_id)
      .order('id', { ascending: false }),
  ])

  const summary = (summaryResult.data as ReputationSummary | null) ?? null
  const verifications = ((verificationResult.data ?? []) as ProfileVerification[]) ?? []
  const trustBadges = getTrustBadges(summary, verifications)
  const links = marketplaceLinks(profile)
  const decks = ((decksResult.data ?? []) as SellerDeck[]) ?? []

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/decks" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">
            {'<-'} Back to marketplace
          </Link>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                Trader Profile
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">{profile.display_name || `@${profile.username}`}</h1>
              <p className="mt-2 text-zinc-400">{profile.username ? `@${profile.username}` : 'Username not set'}</p>
              <p className="mt-4 max-w-2xl text-zinc-300">{profile.bio || profile.marketplace_tagline || 'This trader has not added a public bio yet.'}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {trustBadges.length > 0 ? (
                  trustBadges.map((badge) => (
                    <span key={badge} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                      {badge}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
                    Trust badges pending
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Trust Snapshot</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Ship From</div>
                  <div className="mt-2 text-sm font-medium text-white">{formatShipFrom(profile)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Completed Trades</div>
                  <div className="mt-2 text-sm font-medium text-white">{summary?.completed_trades_count ?? 0}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Successful Shipments</div>
                  <div className="mt-2 text-sm font-medium text-white">{summary?.successful_shipments_count ?? 0}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Account Status</div>
                  <div className="mt-2 text-sm font-medium text-white">{summary?.banned_status && summary.banned_status !== 'active' ? 'Restricted' : 'Active'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">External Marketplace Links</h2>
              <div className="mt-4 space-y-3">
                {links.length > 0 ? (
                  links.map((link) => (
                    <a key={`${link.label}-${link.href}`} href={link.href} target="_blank" rel="noreferrer" className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-zinc-200 hover:bg-white/10">
                      {link.label}
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-zinc-400">No marketplace links have been added yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Active Decks</h2>
            {decks.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-400">No public deck listings from this trader yet.</p>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {decks.map((deck) => (
                  <Link key={deck.id} href={`/decks/${deck.id}`} className="rounded-3xl border border-white/10 bg-white/5 p-4 hover:bg-white/10">
                    <div className="text-xs uppercase tracking-wide text-emerald-300/80">{getDeckFormatLabel(normalizeDeckFormat(deck.format))}</div>
                    <div className="mt-2 text-lg font-semibold text-white">{deck.name}</div>
                    <div className="mt-1 text-sm text-zinc-400">{deck.commander || 'Commander not set'}</div>
                    <div className="mt-4 text-sm font-medium text-emerald-300">${Number(deck.price_total_usd_foil ?? 0).toFixed(2)}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
