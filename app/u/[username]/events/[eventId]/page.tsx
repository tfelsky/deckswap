import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/header'
import { createClient } from '@/lib/supabase/server'
import { normalizeSupportedCurrency } from '@/lib/currency'
import { type PublicProfile } from '@/lib/profiles'
import {
  asRecord,
  buildDirectionsUrl,
  buildGoogleCalendarUrl,
  calendarEventFromLeague,
  formatEventCost,
  formatEventDateTime,
  formatStoreAddress,
  getStoreAddress,
  PREPAID_NO_SHOW_POLICY,
  textValue,
  type PublicStoreLeagueRow,
} from '@/lib/podmatch/store-events'

export const dynamic = 'force-dynamic'

async function loadEvent(username: string, eventId: string) {
  const supabase = await createClient()

  const profileResult = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .maybeSingle()

  const profile = profileResult.data as PublicProfile | null
  if (!profile) return null

  const leagueResult = await supabase
    .from('podmatch_leagues')
    .select('id, name, invite_code, settings, admin_user_id')
    .eq('id', eventId)
    .maybeSingle()

  const league = leagueResult.data as (PublicStoreLeagueRow & { admin_user_id?: string }) | null
  if (!league || league.admin_user_id !== profile.user_id) return null

  const event = calendarEventFromLeague(league)
  if (!event) return null

  return { profile, league, event }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; eventId: string }>
}): Promise<Metadata> {
  const { username, eventId } = await params
  const data = await loadEvent(username, eventId)

  if (!data) {
    return { title: 'Event Not Found | Mythiverse Exchange', robots: { index: false, follow: false } }
  }

  const storeName = data.profile.display_name?.trim() || `@${data.profile.username}`
  const title = `${data.event.publicTitle || data.event.name} | ${storeName} | Mythiverse Exchange`
  const description =
    data.event.audience?.trim() ||
    `${data.event.publicTitle || data.event.name} at ${storeName}. ${formatEventDateTime(data.event)}.`

  return {
    title,
    description,
    alternates: { canonical: `/u/${data.profile.username}/events/${data.league.id}` },
    openGraph: { title, description, type: 'website' },
  }
}

export default async function StoreEventPage({
  params,
}: {
  params: Promise<{ username: string; eventId: string }>
}) {
  const { username, eventId } = await params
  const data = await loadEvent(username, eventId)

  if (!data) {
    return (
      <main className="min-h-screen bg-zinc-950 pt-16 text-white">
        <Header />
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-3xl font-semibold">Event not found</h1>
          <p className="mt-3 text-zinc-400">This event is no longer listed.</p>
          <Link href={`/u/${username}`} className="mt-6 inline-block rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">
            Back to store profile
          </Link>
        </div>
      </main>
    )
  }

  const { profile, league, event } = data
  const storeName = profile.display_name?.trim() || `@${profile.username}`
  const settings = asRecord(league.settings)
  const storeAddress = getStoreAddress(settings)
  const formattedAddress = formatStoreAddress(storeAddress)
  const directionsUrl = buildDirectionsUrl(storeAddress)
  const calendarUrl = buildGoogleCalendarUrl(event, formattedAddress)
  const storeCurrency = normalizeSupportedCurrency(profile.preferred_currency)
  const contactEmail = textValue(settings.contactEmail)
  const isPrepaid = event.cost != null
  const prepayHref = contactEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(
        `Prepay my spot: ${event.publicTitle || event.name}${event.inviteCode ? ` (${event.inviteCode})` : ''}`
      )}`
    : '/podmatch/play'

  return (
    <main className="min-h-screen bg-zinc-950 pt-16 text-white">
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-12">
        <Link href={`/u/${profile.username}`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">
          {'<-'} {storeName}
        </Link>

        <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-6 sm:p-8">
          <div className="text-xs uppercase tracking-wide text-emerald-300/80">{event.format || 'Store event'}</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{event.publicTitle || event.name}</h1>
          <p className="mt-2 text-zinc-400">{formatEventDateTime(event)}</p>
          {event.audience ? <p className="mt-4 text-zinc-300">{event.audience}</p> : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {event.cost != null ? (
              <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
                <div className="text-xs text-zinc-500">Entry</div>
                <div className="mt-1 text-sm font-medium text-white">{formatEventCost(event.cost, storeCurrency)}</div>
              </div>
            ) : null}
            {event.capacity != null ? (
              <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
                <div className="text-xs text-zinc-500">Capacity</div>
                <div className="mt-1 text-sm font-medium text-white">{event.capacity} players</div>
              </div>
            ) : null}
            {event.rounds ? (
              <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
                <div className="text-xs text-zinc-500">Rounds</div>
                <div className="mt-1 text-sm font-medium text-white">{event.rounds}</div>
              </div>
            ) : null}
          </div>

          {event.prize ? <p className="mt-5 text-sm text-zinc-400">Prize support: {event.prize}</p> : null}

          {isPrepaid ? (
            <div className="mt-6 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5">
              <h2 className="text-lg font-semibold text-amber-100">Prepay &amp; skip the line</h2>
              <p className="mt-2 text-sm leading-6 text-amber-50">
                Reserve your seat now and walk straight in on game night — no waiting at the counter, your
                product set aside and ready.
              </p>
              <p className="mt-3 text-sm leading-6 text-amber-50/90">{event.noShowPolicy || PREPAID_NO_SHOW_POLICY}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={prepayHref}
                  target={prepayHref.startsWith('http') ? '_blank' : undefined}
                  rel={prepayHref.startsWith('http') ? 'noreferrer' : undefined}
                  className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-semibold text-zinc-950 hover:opacity-90"
                >
                  Prepay &amp; skip the line
                </a>
                <Link href="/podmatch/play" className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-200 hover:bg-white/10">
                  Sign up in PodMatch
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/podmatch/play" className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">
                Sign up in PodMatch
              </Link>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {event.inviteCode ? (
              <div className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-2">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">Invite code</div>
                <div className="mt-1 font-mono text-sm font-semibold text-emerald-300">{event.inviteCode}</div>
              </div>
            ) : null}
            {calendarUrl ? (
              <a href={calendarUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10">
                Add to calendar
              </a>
            ) : null}
          </div>

          {formattedAddress ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Location</div>
              <div className="mt-2 text-sm font-medium text-white">{storeName}</div>
              <div className="mt-1 text-sm text-zinc-400">{formattedAddress}</div>
              {directionsUrl ? (
                <a href={directionsUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-white/10">
                  Get directions {'->'}
                </a>
              ) : null}
            </div>
          ) : null}

          {event.publicEventBasis ? (
            <p className="mt-6 border-t border-white/10 pt-3 text-xs leading-5 text-zinc-500">Basis: {event.publicEventBasis}</p>
          ) : null}
        </div>
      </section>
    </main>
  )
}
