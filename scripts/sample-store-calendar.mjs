const DEFAULT_TIME_ZONE = 'America/Toronto'
const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: DEFAULT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const WEEKDAYS = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

function formatLocalDate(date) {
  const parts = DATE_FORMATTER.formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function nextWeekdayDate(dayName, fromDate = new Date()) {
  const target = WEEKDAYS[dayName]
  if (target === undefined) throw new Error(`Unknown weekday: ${dayName}`)

  const localNow = new Date(formatLocalDate(fromDate) + 'T12:00:00-04:00')
  const current = localNow.getUTCDay()
  const daysUntil = (target - current + 7) % 7
  const next = new Date(localNow)
  next.setUTCDate(localNow.getUTCDate() + daysUntil)
  return formatLocalDate(next)
}

function addDays(localDate, days) {
  const date = new Date(`${localDate}T12:00:00-04:00`)
  date.setUTCDate(date.getUTCDate() + days)
  return formatLocalDate(date)
}

function localIso(localDate, time) {
  return `${localDate}T${time}:00-04:00`
}

export function buildWeeklyEventSeries(template, count = 4) {
  const firstDate = nextWeekdayDate(template.day)

  return Array.from({ length: count }, (_, index) => {
    const localDate = addDays(firstDate, index * 7)
    return {
      ...template,
      calendarKey: `${template.calendarKey}-${localDate}`,
      name: `${template.name} - ${localDate}`,
      localDate,
      event_start_at: localIso(localDate, template.startTime),
      event_end_at: localIso(localDate, template.endTime),
      invite_code: `${template.inviteCodePrefix}${localDate.replaceAll('-', '').slice(4)}`,
    }
  })
}

function summarizeCalendarEvent(event) {
  return {
    calendarKey: event.calendarKey,
    name: event.name,
    publicTitle: event.publicTitle,
    day: event.day,
    localDate: event.localDate,
    startTime: event.startTime,
    endTime: event.endTime,
    format: event.format,
    audience: event.audience,
    cost: event.cost,
    capacity: event.capacity,
    rounds: event.rounds,
    prize: event.prize,
    source: event.source,
    publicEventBasis: event.publicEventBasis,
    inviteCode: event.invite_code,
  }
}

export function buildLeagueSettings(args) {
  return {
    venue: args.storeName,
    sampleAccount: true,
    address: args.address,
    phone: args.phone,
    contactEmail: args.contactEmail,
    website: args.website,
    weeklyCadence: args.weeklyCadence,
    prizePolicy: args.prizePolicy,
    calendarEvents: args.calendarEvents.map(summarizeCalendarEvent),
  }
}

export async function upsertMainLeagueSettings(supabase, leagueId, settings) {
  const { error } = await supabase
    .from('podmatch_leagues')
    .update({ settings })
    .eq('id', leagueId)

  if (error) throw error
}

export async function upsertPodmatchCalendarEvents(supabase, args) {
  const { data: existingRows, error: selectError } = await supabase
    .from('podmatch_leagues')
    .select('id, name, settings')
    .eq('admin_user_id', args.userId)

  if (selectError) throw selectError

  const existingByCalendarKey = new Map(
    (existingRows ?? [])
      .filter((row) => row.settings?.mode === 'event' && row.settings?.calendarKey)
      .map((row) => [row.settings.calendarKey, row])
  )

  for (const event of args.calendarEvents) {
    const settings = {
      mode: 'event',
      calendarKey: event.calendarKey,
      sampleAccount: true,
      store_name: args.storeName,
      location: `${args.storeName}, ${args.address.line1}, ${args.address.city}, ${args.address.region}`,
      address: args.address,
      phone: args.phone,
      contactEmail: args.contactEmail,
      website: args.website,
      inventory_url: args.website,
      event_start_at: event.event_start_at,
      event_end_at: event.event_end_at,
      time_zone: DEFAULT_TIME_ZONE,
      publicTitle: event.publicTitle,
      publicEventBasis: event.publicEventBasis,
      source: event.source,
      format: event.format,
      audience: event.audience,
      cost: event.cost,
      capacity: event.capacity,
      rounds: event.rounds,
      prize: event.prize,
      rules: event.rules,
      recurring: {
        cadence: 'weekly',
        day: event.day,
        startTime: event.startTime,
        endTime: event.endTime,
      },
    }

    const existing = existingByCalendarKey.get(event.calendarKey)

    if (existing) {
      const { error } = await supabase
        .from('podmatch_leagues')
        .update({
          name: event.name,
          format: event.leagueFormat ?? 'commander',
          pod_size: event.podSize ?? 4,
          scoring_model: event.scoringModel ?? 'casual_balanced',
          settings,
          status: 'active',
        })
        .eq('id', existing.id)

      if (error) throw error
    } else {
      const { error } = await supabase.from('podmatch_leagues').insert({
        admin_user_id: args.userId,
        name: event.name,
        format: event.leagueFormat ?? 'commander',
        pod_size: event.podSize ?? 4,
        scoring_model: event.scoringModel ?? 'casual_balanced',
        invite_code: event.invite_code,
        settings,
        status: 'active',
      })

      if (error) throw error
    }
  }
}
