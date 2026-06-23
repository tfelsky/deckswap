// Diagnose why a sample store profile shows (or doesn't show) its events.
//
// Mirrors app/u/[username]/page.tsx exactly: it reads `profiles` then
// `podmatch_leagues` using the ANON (publishable) key, so the row counts it
// reports are precisely what a logged-out visitor sees. If a service-role key
// is also set, it repeats the league query as admin — comparing the two tells
// you whether a discrepancy is an RLS/grant problem (admin sees rows, anon does
// not) or missing data (admin sees zero too).
//
// Usage:
//   $env:NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
//   $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<anon key>"
//   # optional, for the admin comparison:
//   $env:SUPABASE_SERVICE_ROLE_KEY="<service role key>"
//   node scripts/check-sample-store.mjs [username]
//
// Defaults to username "future-pastimes-sarnia".

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// Load .env.local without a dependency, only for keys not already in the env.
try {
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key]) continue
    process.env[key] = rawValue.replace(/^["']|["']$/g, '')
  }
} catch {
  // No .env.local — rely on the shell environment.
}

const username = (process.argv[2] || 'future-pastimes-sarnia').toLowerCase()
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!url || !anonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.')
  process.exit(1)
}

const clientOpts = { auth: { autoRefreshToken: false, persistSession: false } }

function describeLeague(row) {
  const settings = row.settings ?? {}
  return {
    name: row.name,
    mode: settings.mode ?? null,
    sampleAccount: settings.sampleAccount ?? null,
    hasCalendarEvents: Array.isArray(settings.calendarEvents),
  }
}

async function leaguesFor(client, userId) {
  const { data, error } = await client
    .from('podmatch_leagues')
    .select('id, name, invite_code, settings')
    .eq('admin_user_id', userId)
  return { rows: data ?? [], error }
}

async function main() {
  console.log(`Project: ${new URL(url).host}`)
  console.log(`Username: ${username}\n`)

  const anon = createClient(url, anonKey, clientOpts)

  // 1) Profile lookup — same query the page uses.
  const { data: profile, error: profileError } = await anon
    .from('profiles')
    .select('user_id, username, display_name')
    .eq('username', username)
    .maybeSingle()

  if (profileError) {
    console.log(`✗ profile read (anon) errored: ${profileError.message}`)
    process.exit(1)
  }
  if (!profile) {
    console.log('✗ No profile visible to anon for that username. Page would show "Profile not found".')
    process.exit(0)
  }
  console.log(`✓ profile visible to anon: ${profile.display_name} (user_id ${profile.user_id})`)

  // 2) Leagues as anon — this is what drives address + events on the page.
  const anonLeagues = await leaguesFor(anon, profile.user_id)
  if (anonLeagues.error) {
    console.log(`✗ podmatch_leagues read (anon) errored: ${anonLeagues.error.message}`)
  } else {
    console.log(`\nanon sees ${anonLeagues.rows.length} podmatch_leagues row(s):`)
    for (const row of anonLeagues.rows) console.log('   ', describeLeague(row))
  }

  // 3) Admin comparison, if available.
  if (serviceKey) {
    const admin = createClient(url, serviceKey, clientOpts)
    const adminLeagues = await leaguesFor(admin, profile.user_id)

    if (adminLeagues.error) {
      console.log(`\n✗ podmatch_leagues read (admin) errored: ${adminLeagues.error.message}`)
      console.log(
        '\nDIAGNOSIS: the podmatch_leagues table/columns are not fully migrated in THIS database. ' +
          'Apply the podmatch migrations (20260613160000_create_podmatch_league_mode.sql and later), then re-seed.'
      )
      return
    }

    console.log(`\nadmin (service role) sees ${adminLeagues.rows.length} podmatch_leagues row(s).`)

    if (adminLeagues.rows.length > 0 && anonLeagues.rows.length === 0) {
      console.log(
        '\nDIAGNOSIS: rows exist but are hidden from anon → RLS policy not applied/matching, or anon lacks GRANT SELECT.'
      )
    } else if (adminLeagues.rows.length === 0) {
      console.log('\nDIAGNOSIS: no league rows in THIS database → seed never ran here. Re-seed against this project.')
    } else {
      console.log('\nDIAGNOSIS: anon can read the league rows. If events still do not render, check that some row has mode="event" or a calendarEvents array.')
    }
  } else {
    console.log('\n(Set SUPABASE_SERVICE_ROLE_KEY to compare against what is actually stored.)')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
