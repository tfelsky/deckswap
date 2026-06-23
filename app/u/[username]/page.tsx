import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/header'
import { createClient } from '@/lib/supabase/server'
import {
  formatShipFrom,
  getProfileInitials,
  getSellerRating,
  getTrustBadges,
  isProfileSchemaMissing,
  marketplaceLinks,
  type ProfileVerification,
  type PublicProfile,
  type ReputationSummary,
} from '@/lib/profiles'
import { getDeckFormatLabel, normalizeDeckFormat } from '@/lib/decks/formats'
import { normalizeSupportedCurrency } from '@/lib/currency'
import { StarRating } from '@/components/store/star-rating'
import {
  asRecord,
  buildDirectionsUrl,
  buildGoogleCalendarUrl,
  calendarEventFromLeague,
  calendarEventFromSummary,
  formatEventCost,
  formatEventDateTime,
  formatStoreAddress,
  getMailerSignup,
  getStoreAddress,
  PREPAID_NO_SHOW_POLICY,
  type PublicCalendarEvent,
  type PublicStoreLeagueRow,
} from '@/lib/podmatch/store-events'

export const dynamic = 'force-dynamic'

type SellerDeck = {
  id: number
  name: string
  commander?: string | null
  format?: string | null
  image_url?: string | null
  price_total_usd_foil?: number | null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const supabase = await createClient()
  const profileResult = await supabase
    .from('profiles')
    .select('user_id, username, display_name, bio, marketplace_tagline')
    .eq('username', username.toLowerCase())
    .maybeSingle()

  const profile = profileResult.data as PublicProfile | null

  if (!profile) {
    return {
      title: 'Trader Profile Not Found | Mythiverse Exchange',
      robots: { index: false, follow: false },
    }
  }

  const profileName = profile.display_name?.trim() || `@${profile.username}`
  const description =
    profile.bio?.trim() ||
    profile.marketplace_tagline?.trim() ||
    `${profileName} on Mythiverse Exchange. Browse seller trust signals, active deck listings, and marketplace links.`
  const canonical = `/u/${profile.username?.trim().toLowerCase() ?? username.toLowerCase()}`
  const title = `${profileName} | Trader Profile | Mythiverse Exchange`

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
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
  const [summaryResult, verificationResult, decksResult, storeLeaguesResult] = await Promise.all([
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
    supabase
      .from('podmatch_leagues')
      .select('id, name, invite_code, settings')
      .eq('admin_user_id', profile.user_id)
      .order('created_at', { ascending: true }),
  ])

  const summary = (summaryResult.data as ReputationSummary | null) ?? null
  const verifications = ((verificationResult.data ?? []) as ProfileVerification[]) ?? []
  const trustBadges = getTrustBadges(summary, verifications)
  const sellerRating = getSellerRating(summary)
  const profileInitials = getProfileInitials(profile)
  const storeCurrency = normalizeSupportedCurrency(profile.preferred_currency)
  const links = marketplaceLinks(profile)
  const decks = ((decksResult.data ?? []) as SellerDeck[]) ?? []
  const storeLeagues = ((storeLeaguesResult.data ?? []) as PublicStoreLeagueRow[]) ?? []
  const mainStoreLeague = storeLeagues.find((row) => Array.isArray(asRecord(row.settings).calendarEvents)) ?? null
  const storeSettings = asRecord(mainStoreLeague?.settings)
  const storeAddress = getStoreAddress(storeSettings)
  const formattedAddress = formatStoreAddress(storeAddress)
  const directionsUrl = buildDirectionsUrl(storeAddress)
  const mailerSignup = getMailerSignup(storeSettings)
  const eventRows = storeLeagues
    .map(calendarEventFromLeague)
    .filter(Boolean) as PublicCalendarEvent[]
  const summaryEvents = Array.isArray(storeSettings.calendarEvents)
    ? storeSettings.calendarEvents.map(calendarEventFromSummary).filter(Boolean) as PublicCalendarEvent[]
    : []
  const calendarEvents = eventRows.length > 0 ? eventRows : summaryEvents

  return (
    <main className="min-h-screen bg-zinc-950 pt-16 text-white">
      <Header />
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/decks" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">
            {'<-'} Back to marketplace
          </Link>

          <div className="mt-6 overflow-hidden rounded-3xl border border-white/10">
            {profile.banner_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.banner_url}
                alt={`${profile.display_name || profile.username || 'Trader'} banner`}
                className="h-40 w-full object-cover sm:h-56"
              />
            ) : (
              <div className="h-40 w-full bg-gradient-to-r from-emerald-500/30 via-zinc-800 to-zinc-900 sm:h-56" />
            )}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="flex items-center gap-4">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={`${profile.display_name || profile.username || 'Trader'} avatar`}
                    className="h-20 w-20 rounded-2xl border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-emerald-400/10 text-2xl font-semibold text-emerald-200">
                    {profileInitials}
                  </div>
                )}
                <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                  Trader Profile
                </div>
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
              {sellerRating ? (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                  <StarRating average={sellerRating.average} />
                  <div>
                    <div className="text-lg font-semibold text-white">
                      {sellerRating.average.toFixed(1)} <span className="text-sm font-normal text-zinc-400">/ 5</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      {sellerRating.count} store rating{sellerRating.count === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
              ) : null}
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
            {(formattedAddress || mailerSignup) && (
              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold">Store Details</h2>
                {formattedAddress ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Address</div>
                    <div className="mt-2 text-sm font-medium text-white">{formattedAddress}</div>
                    {directionsUrl ? (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-white/10"
                      >
                        Get directions {'->'}
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {mailerSignup ? (
                  <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                    <div className="text-xs uppercase tracking-wide text-emerald-200/80">Mailer</div>
                    <p className="mt-2 text-sm text-emerald-50">
                      {mailerSignup.description || 'Sign up for store news, event reminders, and local player updates.'}
                    </p>
                    <a
                      href={mailerSignup.href}
                      target={mailerSignup.href.startsWith('http') ? '_blank' : undefined}
                      rel={mailerSignup.href.startsWith('http') ? 'noreferrer' : undefined}
                      className="mt-4 inline-flex rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:opacity-90"
                    >
                      {mailerSignup.label || 'Sign up for updates'}
                    </a>
                  </div>
                ) : null}
              </div>
            )}

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

          <div className="space-y-6">
            {calendarEvents.length > 0 ? (
              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold">Store Calendar</h2>
                    <p className="mt-2 text-sm text-zinc-400">
                      Sample events seeded for this store profile. Use the invite code in PodMatch to join.
                    </p>
                  </div>
                  <Link href="/podmatch/play" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-400/20">
                    Join by code
                  </Link>
                </div>
                <div className="mt-5 space-y-4">
                  {calendarEvents.map((event) => {
                    const calendarUrl = buildGoogleCalendarUrl(event, formattedAddress)
                    const eventHref =
                      event.id && profile.username ? `/u/${profile.username}/events/${event.id}` : null
                    return (
                      <div key={`${event.id ?? event.name}-${event.inviteCode ?? event.localDate ?? ''}`} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-emerald-300/80">
                              {event.format || 'Store event'}
                            </div>
                            <h3 className="mt-2 text-xl font-semibold text-white">
                              {eventHref ? (
                                <Link href={eventHref} className="hover:text-emerald-200">
                                  {event.publicTitle || event.name}
                                </Link>
                              ) : (
                                event.publicTitle || event.name
                              )}
                            </h3>
                            <p className="mt-1 text-sm text-zinc-400">{formatEventDateTime(event)}</p>
                          </div>
                          {event.inviteCode ? (
                            <div className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-right">
                              <div className="text-[10px] uppercase tracking-wide text-zinc-500">Invite code</div>
                              <div className="mt-1 font-mono text-sm font-semibold text-emerald-300">{event.inviteCode}</div>
                            </div>
                          ) : null}
                        </div>
                        {event.audience ? <p className="mt-4 text-sm text-zinc-300">{event.audience}</p> : null}
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          {event.cost != null ? (
                            <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3">
                              <div className="text-xs text-zinc-500">Entry</div>
                              <div className="mt-1 text-sm font-medium text-white">{formatEventCost(event.cost, storeCurrency)}</div>
                            </div>
                          ) : null}
                          {event.capacity != null ? (
                            <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3">
                              <div className="text-xs text-zinc-500">Capacity</div>
                              <div className="mt-1 text-sm font-medium text-white">{event.capacity} players</div>
                            </div>
                          ) : null}
                          {event.rounds ? (
                            <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3">
                              <div className="text-xs text-zinc-500">Rounds</div>
                              <div className="mt-1 text-sm font-medium text-white">{event.rounds}</div>
                            </div>
                          ) : null}
                        </div>
                        {event.prize ? <p className="mt-4 text-sm text-zinc-400">Prize support: {event.prize}</p> : null}
                        {event.cost != null ? (
                          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                            <div className="text-xs uppercase tracking-wide text-amber-200/80">
                              Prepaid no-show policy
                            </div>
                            <p className="mt-2 text-sm leading-6 text-amber-50">
                              {event.noShowPolicy || PREPAID_NO_SHOW_POLICY}
                            </p>
                          </div>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-3">
                          {event.cost != null ? (
                            <Link
                              href={eventHref ?? '/podmatch/play'}
                              className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950 hover:opacity-90"
                            >
                              Prepay &amp; skip the line
                            </Link>
                          ) : (
                            <Link href="/podmatch/play" className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:opacity-90">
                              Sign up in PodMatch
                            </Link>
                          )}
                          {eventHref ? (
                            <Link href={eventHref} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10">
                              View event
                            </Link>
                          ) : null}
                          {calendarUrl ? (
                            <a href={calendarUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10">
                              Add to calendar
                            </a>
                          ) : null}
                        </div>
                        {event.publicEventBasis ? (
                          <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-5 text-zinc-500">
                            Basis: {event.publicEventBasis}
                          </p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

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
        </div>
      </section>
    </main>
  )
}
