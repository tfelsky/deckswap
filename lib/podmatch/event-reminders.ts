import { getAppBaseUrl, getEmailConfigSnapshot } from '@/lib/email'
import { getResendClient } from '@/lib/resend'
import type { League } from './leagues'

type EventReminderSettings = {
  mode?: string
  event_start_at?: string | null
  event_end_at?: string | null
  time_zone?: string | null
  store_name?: string | null
  location?: string | null
  inventory_url?: string | null
}

type EventDetails = {
  league: League
  start: Date
  end: Date
  timeZone: string
  storeName: string
  location: string
  inventoryUrl: string
  eventUrl: string
  googleCalendarUrl: string
  ics: string
}

const DEFAULT_TIME_ZONE = 'America/Toronto'
const DEFAULT_EVENT_DURATION_MS = 4 * 60 * 60 * 1000

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeIcs(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\n', '\\n')
}

function toIcsDate(date: Date) {
  return date.toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z')
}

function absoluteUrl(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim()
  if (!trimmed) return fallback
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/')) return `${getAppBaseUrl().replace(/\/$/, '')}${trimmed}`
  return `https://${trimmed}`
}

function getEventSettings(league: League): EventReminderSettings {
  return (league.settings ?? {}) as EventReminderSettings
}

export function getEventStart(league: League): Date | null {
  const start = getEventSettings(league).event_start_at?.trim()
  if (!start) return null

  const date = new Date(start)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatEventDateTime(league: League) {
  const start = getEventStart(league)
  if (!start) return null

  const timeZone = getEventSettings(league).time_zone?.trim() || DEFAULT_TIME_ZONE
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(start)
}

function buildEventDetails(league: League): EventDetails | null {
  const settings = getEventSettings(league)
  const start = getEventStart(league)
  if (!start) return null

  const endSetting = settings.event_end_at?.trim()
  const end = endSetting ? new Date(endSetting) : new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS)
  const safeEnd = Number.isNaN(end.getTime()) || end <= start
    ? new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS)
    : end

  const appBaseUrl = getAppBaseUrl().replace(/\/$/, '')
  const eventUrl = `${appBaseUrl}/podmatch/play/${league.id}`
  const inventoryUrl = absoluteUrl(settings.inventory_url, `${appBaseUrl}/singles`)
  const storeName = settings.store_name?.trim() || 'your local game store'
  const location = settings.location?.trim() || storeName
  const timeZone = settings.time_zone?.trim() || DEFAULT_TIME_ZONE
  const title = `PodMatch: ${league.name}`
  const details = [
    `You are signed up for ${league.name}.`,
    `Event page: ${eventUrl}`,
    `Store inventory: ${inventoryUrl}`,
  ].join('\n')

  const googleCalendarUrl = new URL('https://calendar.google.com/calendar/render')
  googleCalendarUrl.searchParams.set('action', 'TEMPLATE')
  googleCalendarUrl.searchParams.set('text', title)
  googleCalendarUrl.searchParams.set('dates', `${toIcsDate(start)}/${toIcsDate(safeEnd)}`)
  googleCalendarUrl.searchParams.set('details', details)
  googleCalendarUrl.searchParams.set('location', location)

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mythiverse Exchange//PodMatch//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:podmatch-${league.id}@mythivex.com`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(safeEnd)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `LOCATION:${escapeIcs(location)}`,
    `DESCRIPTION:${escapeIcs(details)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return {
    league,
    start,
    end: safeEnd,
    timeZone,
    storeName,
    location,
    inventoryUrl,
    eventUrl,
    googleCalendarUrl: googleCalendarUrl.toString(),
    ics,
  }
}

function formatForEmail(details: EventDetails) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: details.timeZone,
    timeZoneName: 'short',
  }).format(details.start)
}

function buildHtmlEmail(input: {
  eyebrow: string
  heading: string
  intro: string
  bullets: string[]
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  details: EventDetails
}) {
  const bulletHtml = input.bullets
    .map((bullet) => `<li style="margin: 0 0 8px;">${escapeHtml(bullet)}</li>`)
    .join('')

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background: #f9fafb; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden;">
        <div style="padding: 24px;">
          <div style="display: inline-block; border-radius: 999px; background: #ecfdf5; color: #047857; padding: 6px 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
            ${escapeHtml(input.eyebrow)}
          </div>
          <h1 style="margin: 18px 0 12px; font-size: 24px; line-height: 1.25; color: #111827;">
            ${escapeHtml(input.heading)}
          </h1>
          <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">
            ${escapeHtml(input.intro)}
          </p>
          <div style="margin: 0 0 18px; padding: 14px 16px; border: 1px solid #d1fae5; border-radius: 14px; background: #f0fdf4; color: #065f46;">
            <strong>${escapeHtml(input.details.league.name)}</strong><br />
            ${escapeHtml(formatForEmail(input.details))}<br />
            ${escapeHtml(input.details.location)}
          </div>
          <ul style="margin: 0 0 20px; padding-left: 20px; color: #374151; font-size: 15px;">
            ${bulletHtml}
          </ul>
          <a href="${input.primaryHref}" style="display: inline-block; background: #34d399; color: #111827; text-decoration: none; font-weight: 700; border-radius: 12px; padding: 12px 18px;">
            ${escapeHtml(input.primaryLabel)}
          </a>
          ${
            input.secondaryHref && input.secondaryLabel
              ? `<a href="${input.secondaryHref}" style="display: inline-block; margin-left: 10px; color: #047857; font-weight: 700; text-decoration: none;">${escapeHtml(input.secondaryLabel)}</a>`
              : ''
          }
        </div>
        <div style="padding: 16px 24px 24px; font-size: 13px; color: #6b7280;">
          You are receiving this because you signed up for a PodMatch event through Mythiverse Exchange.
        </div>
      </div>
    </div>
  `
}

function buildTextEmail(input: {
  intro: string
  bullets: string[]
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  details: EventDetails
}) {
  return [
    input.intro,
    '',
    `${input.details.league.name}`,
    `${formatForEmail(input.details)}`,
    input.details.location,
    '',
    ...input.bullets.map((bullet) => `- ${bullet}`),
    '',
    `${input.primaryLabel}: ${input.primaryHref}`,
    input.secondaryHref && input.secondaryLabel
      ? `${input.secondaryLabel}: ${input.secondaryHref}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

async function sendEventEmail(input: {
  to: string
  subject: string
  eyebrow: string
  intro: string
  bullets: string[]
  details: EventDetails
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  scheduledAt?: string
  idempotencyKey: string
  attachInvite?: boolean
}) {
  const resend = getResendClient()
  const config = getEmailConfigSnapshot()
  const message: Record<string, unknown> = {
    from: config.transactionalFromEmail,
    to: [input.to],
    subject: input.subject,
    text: buildTextEmail(input),
    html: buildHtmlEmail({
      eyebrow: input.eyebrow,
      heading: input.subject,
      intro: input.intro,
      bullets: input.bullets,
      primaryHref: input.primaryHref,
      primaryLabel: input.primaryLabel,
      secondaryHref: input.secondaryHref,
      secondaryLabel: input.secondaryLabel,
      details: input.details,
    }),
    tags: [
      { name: 'purpose', value: 'transactional' },
      { name: 'category', value: 'podmatch-event' },
    ],
  }

  if (input.scheduledAt) message.scheduledAt = input.scheduledAt
  if (input.attachInvite) {
    message.attachments = [
      {
        filename: 'podmatch-event.ics',
        content: Buffer.from(input.details.ics, 'utf8').toString('base64'),
      },
    ]
  }

  const result = await resend.emails.send(message as any, {
    idempotencyKey: input.idempotencyKey,
  })

  if (result.error) {
    throw new Error(
      `Resend event email failed: ${result.error.statusCode ?? 'unknown'} ${result.error.message}`.slice(
        0,
        400
      )
    )
  }

  return result.data
}

export async function queuePodmatchEventSignupEmails(input: {
  league: League
  userId: string
  email?: string | null
}) {
  const email = input.email?.trim().toLowerCase()
  if (!email) return { queued: 0, skipped: 'missing-email' as const }

  const details = buildEventDetails(input.league)
  if (!details) return { queued: 0, skipped: 'missing-event-start' as const }

  const now = Date.now()
  const queued: string[] = []

  await sendEventEmail({
    to: email,
    subject: `You're signed up for ${input.league.name}`,
    eyebrow: 'Event confirmed',
    intro: `You are on the list for ${input.league.name}. We attached a calendar invite and included a Google Calendar link so it is easy to save the date.`,
    bullets: [
      'Add the event to your calendar now so it does not get lost in the week.',
      'Open the event page when you arrive to see pairings, standings, and table updates.',
      'If you are tuning a deck, check the store inventory link before you make last-minute swaps.',
    ],
    details,
    primaryHref: details.googleCalendarUrl,
    primaryLabel: 'Add to Google Calendar',
    secondaryHref: details.eventUrl,
    secondaryLabel: 'Open event page',
    idempotencyKey: `podmatch-event-confirmation:${input.league.id}:${input.userId}`,
    attachInvite: true,
  })
  queued.push('confirmation')

  const reminders = [
    {
      key: 'one-week',
      offsetMs: 7 * 24 * 60 * 60 * 1000,
      subject: `${input.league.name} is one week away`,
      eyebrow: 'One week out',
      intro: 'A little prep now makes event night smoother. This is a good time to tune the list and avoid day-of scrambling.',
      bullets: [
        'Check the store inventory for deck updates, sleeves, tokens, or last-minute singles.',
        'Finalize any changes you want to test before the event.',
        'Play a few practice games so your lines and mulligans feel natural.',
      ],
      primaryHref: details.inventoryUrl,
      primaryLabel: 'Check store inventory',
      secondaryHref: details.eventUrl,
      secondaryLabel: 'Open event page',
    },
    {
      key: 'one-day',
      offsetMs: 24 * 60 * 60 * 1000,
      subject: `${input.league.name} is tomorrow`,
      eyebrow: 'Tomorrow',
      intro: 'You are almost there. Give yourself an easy event day by getting the practical stuff handled tonight.',
      bullets: [
        'Get a good night of sleep so round one does not feel like a mulligan.',
        'Pack your deck, sideboard or tokens, sleeves, charger, water, and any trade binder you plan to bring.',
        'Double-check the start time, store location, and event page before you call it a night.',
      ],
      primaryHref: details.eventUrl,
      primaryLabel: 'Review event details',
      secondaryHref: details.googleCalendarUrl,
      secondaryLabel: 'Add to Google Calendar',
    },
    {
      key: 'one-hour',
      offsetMs: 60 * 60 * 1000,
      subject: `${input.league.name} starts in about an hour`,
      eyebrow: 'Almost time',
      intro: 'Event time is close. Head over with enough buffer to check in, settle in, and find your table.',
      bullets: [
        'Make your way down to the store now if travel or parking can run long.',
        'Bring your playmat, dice, tokens, deck, and anything you need for clean board states.',
        'Open the event page when you arrive so pairings and table updates are ready.',
      ],
      primaryHref: details.eventUrl,
      primaryLabel: 'Open event page',
      secondaryHref: details.googleCalendarUrl,
      secondaryLabel: 'Add to Google Calendar',
    },
  ]

  for (const reminder of reminders) {
    const scheduledAt = new Date(details.start.getTime() - reminder.offsetMs)
    if (scheduledAt.getTime() <= now + 60 * 1000) continue

    await sendEventEmail({
      to: email,
      subject: reminder.subject,
      eyebrow: reminder.eyebrow,
      intro: reminder.intro,
      bullets: reminder.bullets,
      details,
      primaryHref: reminder.primaryHref,
      primaryLabel: reminder.primaryLabel,
      secondaryHref: reminder.secondaryHref,
      secondaryLabel: reminder.secondaryLabel,
      scheduledAt: scheduledAt.toISOString(),
      idempotencyKey: `podmatch-event-reminder:${reminder.key}:${input.league.id}:${input.userId}`,
    })
    queued.push(reminder.key)
  }

  return { queued: queued.length, reminders: queued }
}
