import { createClient } from '@supabase/supabase-js'
import {
  buildLeagueSettings,
  buildWeeklyEventSeries,
  loadEnvLocal,
  logSeedTarget,
  upsertMainLeagueSettings,
  upsertPodmatchCalendarEvents,
} from './sample-store-calendar.mjs'

loadEnvLocal()

const STORE_EMAIL = process.env.SAMPLE_STORE_EMAIL?.trim() || 'heavy-js.sample@mythivex.test'
const STORE_CONTACT_EMAIL = null
const STORE_PHONE = null
const STORE_WEBSITE = 'https://heavyjs.com/'
const STORE_MAILER_SIGNUP = {
  label: "Follow Heavy J's event updates",
  href: 'https://heavyjs.com/',
  description: "Heavy J's public site points customers to its Events/Upcoming Events surface and Facebook updates.",
}
const STORE_PASSWORD = process.env.SAMPLE_STORE_PASSWORD?.trim()
const STORE_USERNAME = 'heavy-js-card-house-sarnia'
const STORE_DISPLAY_NAME = "Heavy J's Card House"
const STORE_ADDRESS = {
  line1: '208 Front St N Unit 1',
  city: 'Sarnia',
  region: 'Ontario',
  postalCode: 'N7T 5S5',
  country: 'CA',
}
const STORE_CALENDAR_EVENTS = buildWeeklyEventSeries({
  calendarKey: 'heavy-js-weekly-tcg-event-night',
  inviteCodePrefix: 'hjevent',
  name: "Heavy J's Weekly TCG Event Night",
  publicTitle: 'Weekly TCG Event Night',
  day: 'Saturday',
  startTime: '13:00',
  endTime: '17:00',
  format: 'Trading Card Game Open Play',
  leagueFormat: 'commander',
  audience: 'Magic, Pokemon, Lorcana, One Piece, and TCG players',
  cost: 10,
  capacity: 32,
  podSize: 4,
  rounds: 'Open play tables with staff-supported pairings when attendance supports it',
  prize: 'Store credit, sealed product, singles credit, and participation promos',
  rules: [
    'Event mix follows the store calendar and Facebook updates.',
    'Players should check Heavy J\'s public event posts for the current featured game.',
    'PodMatch can pair Commander pods when the Magic crowd is active.',
  ],
  source: 'heavyjs.com exposes Events/Upcoming Events and asks customers to follow Facebook for updates; exact event rows were not available in the static fetch.',
  publicEventBasis: 'Heavy J\'s public site advertises store events and TCG categories; this is a sample calendar shell until exact public event rows are available.',
})

// Public profile imagery + store ratings. Override per run via env if you have
// real assets; otherwise the public page falls back to an initials avatar and a
// gradient banner, and these rating values seed a believable store score.
const STORE_AVATAR_URL = process.env.SAMPLE_STORE_AVATAR_URL?.trim() || null
const STORE_BANNER_URL = process.env.SAMPLE_STORE_BANNER_URL?.trim() || null
const STORE_RATING_AVERAGE = Number(process.env.SAMPLE_STORE_RATING_AVERAGE ?? 4.9)
const STORE_RATING_COUNT = Number(process.env.SAMPLE_STORE_RATING_COUNT ?? 64)
const STORE_POSITIVE_FEEDBACK = Number(process.env.SAMPLE_STORE_POSITIVE_FEEDBACK ?? 61)

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing ${name}. Set it before running this seed script.`)
  }
  return value
}

function logStep(label, details = '') {
  const suffix = details ? ` ${details}` : ''
  console.log(`[heavy-js] ${label}${suffix}`)
}

async function findUserByEmail(supabase, email) {
  let page = 1

  while (page < 50) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })

    if (error) throw error

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase())
    if (user) return user
    if (data.users.length < 100) return null

    page += 1
  }

  throw new Error(`Could not find ${email}; user list exceeded search limit.`)
}

async function getOrCreateStoreUser(supabase) {
  const existing = await findUserByEmail(supabase, STORE_EMAIL)

  if (existing) {
    const updates = {
      email_confirm: true,
      user_metadata: {
        account_type: 'store',
        store_name: STORE_DISPLAY_NAME,
        sample_account: true,
        sample_note: "Sample account based on public Heavy J's Card House store information.",
      },
    }

    if (STORE_PASSWORD) updates.password = STORE_PASSWORD

    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, updates)
    if (error) throw error

    logStep('updated auth user', STORE_EMAIL)
    return data.user
  }

  if (!STORE_PASSWORD) {
    throw new Error('Set SAMPLE_STORE_PASSWORD to create the sample store auth user.')
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: STORE_EMAIL,
    password: STORE_PASSWORD,
    email_confirm: true,
    user_metadata: {
      account_type: 'store',
      store_name: STORE_DISPLAY_NAME,
      sample_account: true,
      sample_note: "Sample account based on public Heavy J's Card House store information.",
    },
  })

  if (error) throw error

  logStep('created auth user', STORE_EMAIL)
  return data.user
}

async function upsertProfileRows(supabase, userId) {
  const researchedNote =
    "Public store details from heavyjs.com: Heavy J's Card House at 208 Front St N Unit 1, Sarnia, ON N7T 5S5; site lists Magic Singles, Pokemon Singles, Lorcana Singles, One Piece Card Game Singles, sealed products, buylist, store information, and events."

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      user_id: userId,
      display_name: STORE_DISPLAY_NAME,
      username: STORE_USERNAME,
      avatar_url: STORE_AVATAR_URL,
      banner_url: STORE_BANNER_URL,
      bio:
        "Sarnia card house with Magic, Pokemon, Lorcana, One Piece, sealed products, singles, buylist, and event surfaces.",
      location_country: 'Canada',
      location_region: 'Ontario',
      preferred_currency: 'CAD',
      marketplace_tagline: 'Magic, Pokemon, Lorcana, One Piece, sealed product, singles, buylist, and events in Sarnia.',
      website_url: STORE_WEBSITE,
      instagram_url: null,
      youtube_url: null,
      whatnot_url: null,
      ebay_url: null,
      cardmarket_url: null,
      tcgplayer_url: null,
      can_ship_domestic: true,
      can_ship_international: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (profileError) throw profileError

  const { error: privateError } = await supabase.from('profile_private').upsert(
    {
      user_id: userId,
      legal_first_name: 'Heavy',
      legal_last_name: 'J',
      support_email: STORE_CONTACT_EMAIL,
      shipping_name: STORE_DISPLAY_NAME,
      shipping_address_line_1: STORE_ADDRESS.line1,
      shipping_city: STORE_ADDRESS.city,
      shipping_region: STORE_ADDRESS.region,
      shipping_postal_code: STORE_ADDRESS.postalCode,
      shipping_country: STORE_ADDRESS.country,
      customer_service_notes: researchedNote,
      marketing_opt_in_email: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (privateError) throw privateError

  const { error: summaryError } = await supabase.from('profile_reputation_summary').upsert(
    {
      user_id: userId,
      completed_trades_count: 0,
      successful_shipments_count: 0,
      positive_feedback_count: STORE_POSITIVE_FEEDBACK,
      negative_feedback_count: 0,
      external_rating_average: STORE_RATING_AVERAGE,
      external_rating_count: STORE_RATING_COUNT,
      verification_badges: ['sample_store', 'sarnia_demo', 'tcg_singles'],
      is_manually_verified: true,
      is_known_user: true,
      is_friend_of_platform: true,
      banned_status: 'active',
      manual_review_notes: "Seeded sample store account using public Heavy J's Card House store details.",
      internal_validation_score: 83,
      internal_validation_tier: 'sample_partner_store',
      internal_validation_notes: [
        'Sarnia, Ontario sample profile.',
        'Address: 208 Front St N Unit 1, Sarnia, ON N7T 5S5.',
        'No public phone or email was available from the fetched heavyjs.com page.',
        researchedNote,
      ],
      internal_validation_last_calculated_at: new Date().toISOString(),
      approval_status: 'approved',
      approval_notes: 'Approved as a controlled sample account only.',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (summaryError) throw summaryError

  logStep('upserted profile rows')
}

async function getOrCreateLeague(supabase, userId) {
  const leagueSettings = buildLeagueSettings({
    storeName: STORE_DISPLAY_NAME,
    address: STORE_ADDRESS,
    phone: STORE_PHONE,
    contactEmail: STORE_CONTACT_EMAIL,
    website: STORE_WEBSITE,
    mailerSignup: STORE_MAILER_SIGNUP,
    weeklyCadence: 'Weekly TCG event night based on public Events/Upcoming Events surface',
    prizePolicy: 'Store credit, sealed product, singles credit, and participation promos',
    calendarEvents: STORE_CALENDAR_EVENTS,
  })

  const { data: existing, error: selectError } = await supabase
    .from('podmatch_leagues')
    .select('id, invite_code')
    .eq('admin_user_id', userId)
    .eq('name', "Heavy J's Commander League")
    .maybeSingle()

  if (selectError) throw selectError
  if (existing) {
    await upsertMainLeagueSettings(supabase, existing.id, leagueSettings)
    logStep('found podmatch league', existing.invite_code ? `invite=${existing.invite_code}` : '')
    return existing
  }

  const { data, error } = await supabase
    .from('podmatch_leagues')
    .insert({
      admin_user_id: userId,
      name: "Heavy J's Commander League",
      format: 'commander',
      pod_size: 4,
      scoring_model: 'casual_balanced',
      invite_code: 'heavyjs',
      settings: leagueSettings,
      status: 'active',
    })
    .select('id, invite_code')
    .single()

  if (error) throw error

  logStep('created podmatch league', `invite=${data.invite_code}`)
  return data
}

async function getOrCreateRosterPlayer(supabase, ownerUserId, leagueId, displayName) {
  const { data: existingRows, error: selectError } = await supabase
    .from('podmatch_players')
    .select('id')
    .eq('owner_user_id', ownerUserId)
    .eq('display_name', displayName)
    .limit(1)

  if (selectError) throw selectError

  let playerId = existingRows?.[0]?.id

  if (!playerId) {
    const { data, error } = await supabase
      .from('podmatch_players')
      .insert({
        owner_user_id: ownerUserId,
        display_name: displayName,
      })
      .select('id')
      .single()

    if (error) throw error
    playerId = data.id
  }

  const { error: membershipError } = await supabase.from('podmatch_league_players').upsert(
    {
      league_id: leagueId,
      player_id: playerId,
      status: 'active',
    },
    { onConflict: 'league_id,player_id' }
  )

  if (membershipError) throw membershipError

  return playerId
}

async function seedRoster(supabase, userId, leagueId) {
  const players = [
    'Morgan Ellis',
    'Riley Stone',
    'Taylor Reid',
    'Quinn Parker',
    'Sam Bennett',
    'Rowan Price',
    'Charlie Wells',
    'Peyton Hall',
  ]

  for (const player of players) {
    await getOrCreateRosterPlayer(supabase, userId, leagueId, player)
  }

  logStep('seeded roster entries', `${players.length} players`)
}

async function main() {
  logSeedTarget('heavy-js')
  const supabase = createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const user = await getOrCreateStoreUser(supabase)
  await upsertProfileRows(supabase, user.id)
  const league = await getOrCreateLeague(supabase, user.id)
  await upsertPodmatchCalendarEvents(supabase, {
    userId: user.id,
    storeName: STORE_DISPLAY_NAME,
    address: STORE_ADDRESS,
    phone: STORE_PHONE,
    contactEmail: STORE_CONTACT_EMAIL,
    website: STORE_WEBSITE,
    mailerSignup: STORE_MAILER_SIGNUP,
    calendarEvents: STORE_CALENDAR_EVENTS,
  })
  await seedRoster(supabase, user.id, league.id)

  console.log(
    JSON.stringify(
      {
        email: STORE_EMAIL,
        publicContactEmail: STORE_CONTACT_EMAIL,
        phone: STORE_PHONE,
        website: STORE_WEBSITE,
        username: STORE_USERNAME,
        displayName: STORE_DISPLAY_NAME,
        address: STORE_ADDRESS,
        podmatchLeagueId: league.id,
        inviteCode: league.invite_code,
        calendarEvents: STORE_CALENDAR_EVENTS.map((event) => ({
          name: event.name,
          start: event.event_start_at,
          inviteCode: event.invite_code,
        })),
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
