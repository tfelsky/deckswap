import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/header'
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

type PublicStoreLeagueRow = {
  id: string
  name: string
  invite_code?: string | null
  settings?: Record<string, unknown> | null
}

type StoreAddress = {
  line1?: string | null
  city?: string | null
  region?: string | null
  postalCode?: string | null
  country?: string | null
}

type MailerSignup = {
  label: string
  href: string
  description?: string | null
}

type PublicCalendarEvent = {
  id?: string | null
  name: string
  publicTitle?: string | null
  day?: string | null
  localDate?: string | null
  startTime?: string | null
  endTime?: string | null
  eventStartAt?: string | null
  eventEndAt?: string | null
  format?: string | null
  audience?: string | null
  cost?: number | null
  capacity?: number | null
  rounds?: string | null
  prize?: string | null
  source?: string | null
  publicEventBasis?: string | null
  inviteCode?: string | null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function textValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getStoreAddress(settings?: Record<string, unknown> | null): StoreAddress | null {
  const address = asRecord(settings?.address)
  const line1 = textValue(address.line1)
  const city = textValue(address.city)
  const region = textValue(address.region)
  const postalCode = textValue(address.postalCode)
  const country = textValue(address.country)

  if (!line1 && !city && !region && !postalCode && !country) return null
  return { line1, city, region, postalCode, country }
}

function formatStoreAddress(address?: StoreAddress | null) {
  if (!address) return null
  const cityLine = [address.city, address.region, address.postalCode].filter(Boolean).join(', ')
  return [address.line1, cityLine, address.country].filter(Boolean).join(' · ')
}

function getMailerSignup(settings?: Record<string, unknown> | null): MailerSignup | null {
  const signup = asRecord(settings?.mailerSignup)
  const href = textValue(signup.href)
  if (!href) return null

  return {
    href,
    label: textValue(signup.label) ?? 'Sign up for store updates',
    description: textValue(signup.description),
  }
}

function calendarEventFromSummary(value: unknown): PublicCalendarEvent | null {
  const event = asRecord(value)
  const name = textValue(event.name) ?? textValue(event.publicTitle)
  if (!name) return null

  return {
    name,
    publicTitle: textValue(event.publicTitle),
    day: textValue(event.day),
    localDate: textValue(event.localDate),
    startTime: textValue(event.startTime),
    endTime: textValue(event.endTime),
    format: textValue(event.format),
    audience: textValue(event.audience),
    cost: numberValue(event.cost),
    capacity: numberValue(event.capacity),
    rounds: textValue(event.rounds),
    prize: textValue(event.prize),
    source: textValue(event.source),
    publicEventBasis: textValue(event.publicEventBasis),
    inviteCode: textValue(event.inviteCode),
  }
}

function calendarEventFromLeague(row: PublicStoreLeagueRow): PublicCalendarEvent | null {
  const settings = asRecord(row.settings)
  if (settings.mode !== 'event') return null

  return {
    id: row.id,
    name: row.name,
    publicTitle: textValue(settings.publicTitle),
    day: textValue(asRecord(settings.recurring).day),
    startTime: textValue(asRecord(settings.recurring).startTime),
    endTime: textValue(asRecord(settings.recurring).endTime),
    eventStartAt: textValue(settings.event_start_at),
    eventEndAt: textValue(settings.event_end_at),
    format: textValue(settings.format),
    audience: textValue(settings.audience),
    cost: numberValue(settings.cost),
    capacity: numberValue(settings.capacity),
    rounds: textValue(settings.rounds),
    prize: textValue(settings.prize),
    source: textValue(settings.source),
    publicEventBasis: textValue(settings.publicEventBasis),
    inviteCode: row.invite_code ?? null,
  }
}

function formatEventDateTime(event: PublicCalendarEvent) {
  const start = event.eventStartAt ? new Date(event.eventStartAt) : null
  if (start && !Number.isNaN(start.getTime())) {
    return new Intl.DateTimeFormat('en-CA', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Toronto',
    }).format(start)
  }

  return [event.day, event.localDate, event.startTime].filter(Boolean).join(' · ')
}

function toCalendarDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z')
}

function buildGoogleCalendarUrl(event: PublicCalendarEvent, location?: string | null) {
  const start = toCalendarDate(event.eventStartAt)
  const end = toCalendarDate(event.eventEndAt)
  if (!start || !end) return null

  const url = new URL('https://calendar.google.com/calendar/render')
  url.searchParams.set('action', 'TEMPLATE')
  url.searchParams.set('text', event.publicTitle || event.name)
  url.searchParams.set('dates', `${start}/${end}`)
  url.searchParams.set(
    'details',
    [
      event.audience,
      event.rounds,
      event.prize,
      event.inviteCode ? `PodMatch invite code: ${event.inviteCode}` : null,
    ]
      .filter(Boolean)
      .join('\n')
  )
  if (location) url.searchParams.set('location', location)
  return url.toString()
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
  const links = marketplaceLinks(profile)
  const decks = ((decksResult.data ?? []) as SellerDeck[]) ?? []
  const storeLeagues = ((storeLeaguesResult.data ?? []) as PublicStoreLeagueRow[]) ?? []
  const mainStoreLeague = storeLeagues.find((row) => Array.isArray(asRecord(row.settings).calendarEvents)) ?? null
  const storeSettings = asRecord(mainStoreLeague?.settings)
  const storeAddress = getStoreAddress(storeSettings)
  const formattedAddress = formatStoreAddress(storeAddress)
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
            {(formattedAddress || mailerSignup) && (
              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold">Store Details</h2>
                {formattedAddress ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Address</div>
                    <div className="mt-2 text-sm font-medium text-white">{formattedAddress}</div>
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
                    return (
                      <div key={`${event.id ?? event.name}-${event.inviteCode ?? event.localDate ?? ''}`} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-emerald-300/80">
                              {event.format || 'Store event'}
                            </div>
                            <h3 className="mt-2 text-xl font-semibold text-white">{event.publicTitle || event.name}</h3>
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
                              <div className="mt-1 text-sm font-medium text-white">${event.cost} CAD</div>
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
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Link href="/podmatch/play" className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:opacity-90">
                            Sign up in PodMatch
                          </Link>
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
