import { createClient } from '@supabase/supabase-js'
import {
  buildLeagueSettings,
  buildWeeklyEventSeries,
  upsertMainLeagueSettings,
  upsertPodmatchCalendarEvents,
} from './sample-store-calendar.mjs'

const STORE_EMAIL = process.env.SAMPLE_STORE_EMAIL?.trim() || 'future-pastimes.sample@mythivex.test'
const STORE_CONTACT_EMAIL = 'futurepastimes@hotmail.com'
const STORE_PHONE = '(519) 383-6967'
const STORE_WEBSITE = 'https://futurepastimes.ca/'
const STORE_PASSWORD = process.env.SAMPLE_STORE_PASSWORD?.trim()
const STORE_USERNAME = 'future-pastimes-sarnia'
const STORE_DISPLAY_NAME = 'Future Pastimes'
const STORE_ADDRESS = {
  line1: '188 Front Street North',
  city: 'Sarnia',
  region: 'Ontario',
  postalCode: 'N7T 5S3',
  country: 'CA',
}
const STORE_CALENDAR_EVENTS = buildWeeklyEventSeries({
  calendarKey: 'future-pastimes-friday-night-magic-latest-set-draft',
  inviteCodePrefix: 'fpdraft',
  name: 'Future Pastimes Friday Night Magic Draft',
  publicTitle: 'Friday Night Magic: Latest Set Draft',
  day: 'Friday',
  startTime: '19:00',
  endTime: '22:30',
  format: 'Magic: The Gathering Limited Draft',
  leagueFormat: 'limited',
  audience: 'FNM drafters and Magic regulars',
  cost: 25,
  capacity: 24,
  podSize: 8,
  rounds: 'Draft pod plus 3 Swiss rounds',
  prize: 'Draft prize support and Friday Night Magic promos while available',
  rules: [
    'Latest Standard-legal Magic set draft.',
    'Store supplies basic lands.',
    'Pods fire at eight players when possible.',
  ],
  source: 'User-provided public-event interpretation for Future Pastimes FNM.',
  publicEventBasis: 'Friday Night Magic at Future Pastimes is modeled as latest set draft.',
})

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing ${name}. Set it before running this seed script.`)
  }
  return value
}

function logStep(label, details = '') {
  const suffix = details ? ` ${details}` : ''
  console.log(`[future-pastimes] ${label}${suffix}`)
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
        sample_note: 'Sample account based on public Future Pastimes store information.',
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
      sample_note: 'Sample account based on public Future Pastimes store information.',
    },
  })

  if (error) throw error

  logStep('created auth user', STORE_EMAIL)
  return data.user
}

async function upsertProfileRows(supabase, userId) {
  const researchedNote =
    'Public store details from futurepastimes.ca: 188 Front Street North, Sarnia, Ontario N7T 5S3; phone (519) 383-6967; contact futurepastimes@hotmail.com; Facebook Messenger: Future Pastimes; listed hours 10:00 a.m. - 10:00 p.m. on the checked day.'

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      user_id: userId,
      display_name: STORE_DISPLAY_NAME,
      username: STORE_USERNAME,
      bio:
        'Sample Sarnia LGS account for Commander nights, singles pickup, comic pull-box operations, LGS TV, and PodMatch events.',
      location_country: 'Canada',
      location_region: 'Ontario',
      preferred_currency: 'CAD',
      marketplace_tagline: 'Commander events, local pickup, singles, comics, and community leagues in Sarnia.',
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
      legal_first_name: 'Future',
      legal_last_name: 'Pastimes',
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
      positive_feedback_count: 0,
      negative_feedback_count: 0,
      external_rating_count: 0,
      verification_badges: ['sample_store', 'sarnia_demo'],
      is_manually_verified: true,
      is_known_user: true,
      is_friend_of_platform: true,
      banned_status: 'active',
      manual_review_notes: 'Seeded sample store account using public Future Pastimes store contact details.',
      internal_validation_score: 82,
      internal_validation_tier: 'sample_partner_store',
      internal_validation_notes: [
        'Sarnia, Ontario sample profile.',
        'Address: 188 Front Street North, Sarnia, Ontario N7T 5S3.',
        `Phone: ${STORE_PHONE}.`,
        `Public contact: ${STORE_CONTACT_EMAIL}.`,
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
    weeklyCadence: 'Friday Night Magic latest set draft',
    prizePolicy: 'Draft prize support, promos, store credit, and participation promos',
    calendarEvents: STORE_CALENDAR_EVENTS,
  })

  const { data: existing, error: selectError } = await supabase
    .from('podmatch_leagues')
    .select('id, invite_code')
    .eq('admin_user_id', userId)
    .eq('name', 'Future Pastimes Commander League')
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
      name: 'Future Pastimes Commander League',
      format: 'commander',
      pod_size: 4,
      scoring_model: 'casual_balanced',
      invite_code: 'futurefp',
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
    'Avery Chen',
    'Blake Morrison',
    'Casey Singh',
    'Devon Clarke',
    'Emery Brooks',
    'Finley Woods',
    'Harper Morgan',
    'Jordan Patel',
  ]

  for (const player of players) {
    await getOrCreateRosterPlayer(supabase, userId, leagueId, player)
  }

  logStep('seeded roster entries', `${players.length} players`)
}

async function main() {
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
