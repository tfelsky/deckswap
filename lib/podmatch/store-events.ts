import { formatCurrencyAmount, normalizeSupportedCurrency, type SupportedCurrency } from '@/lib/currency'

// Shared helpers for rendering public store-calendar events. Sample store
// accounts write safe public details into podmatch_leagues.settings; both the
// store profile page and the per-event page read those through these helpers.

export type StoreAddress = {
  line1?: string | null
  city?: string | null
  region?: string | null
  postalCode?: string | null
  country?: string | null
}

export type MailerSignup = {
  label: string
  href: string
  description?: string | null
}

export type PublicStoreLeagueRow = {
  id: string
  name: string
  invite_code?: string | null
  settings?: Record<string, unknown> | null
}

export type PublicCalendarEvent = {
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
  noShowPolicy?: string | null
}

export const PREPAID_NO_SHOW_POLICY =
  "Can't make it? We'll miss you — but your packs won't go anywhere. Prepaid product is held safely behind the counter for you to grab on your next visit. Prepaid entries are non-refundable, but the cards are always yours."

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export function textValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function getStoreAddress(settings?: Record<string, unknown> | null): StoreAddress | null {
  const address = asRecord(settings?.address)
  const line1 = textValue(address.line1)
  const city = textValue(address.city)
  const region = textValue(address.region)
  const postalCode = textValue(address.postalCode)
  const country = textValue(address.country)

  if (!line1 && !city && !region && !postalCode && !country) return null
  return { line1, city, region, postalCode, country }
}

export function formatStoreAddress(address?: StoreAddress | null) {
  if (!address) return null
  const cityLine = [address.city, address.region, address.postalCode].filter(Boolean).join(', ')
  return [address.line1, cityLine, address.country].filter(Boolean).join(' · ')
}

export function buildDirectionsUrl(address?: StoreAddress | null) {
  if (!address) return null
  const query = [address.line1, address.city, address.region, address.postalCode, address.country]
    .filter(Boolean)
    .join(', ')
  if (!query) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`
}

export function getMailerSignup(settings?: Record<string, unknown> | null): MailerSignup | null {
  const signup = asRecord(settings?.mailerSignup)
  const href = textValue(signup.href)
  if (!href) return null

  return {
    href,
    label: textValue(signup.label) ?? 'Sign up for store updates',
    description: textValue(signup.description),
  }
}

export function calendarEventFromSummary(value: unknown): PublicCalendarEvent | null {
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
    noShowPolicy: textValue(event.noShowPolicy),
  }
}

export function calendarEventFromLeague(row: PublicStoreLeagueRow): PublicCalendarEvent | null {
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
    noShowPolicy: textValue(settings.noShowPolicy),
  }
}

export function formatEventDateTime(event: PublicCalendarEvent) {
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

export function buildGoogleCalendarUrl(event: PublicCalendarEvent, location?: string | null) {
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

// Entry fee in the store's local currency (events store a local amount, not USD).
export function formatEventCost(cost: number, currency: string) {
  const normalized = normalizeSupportedCurrency(currency)
  return `${formatCurrencyAmount(cost, normalized)} ${normalized}`
}

export type { SupportedCurrency }
