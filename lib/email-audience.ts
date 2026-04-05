import { createAdminClient } from '@/lib/supabase/admin'

type MarketingContactRow = {
  user_id: string
  support_email?: string | null
  legal_first_name?: string | null
  legal_last_name?: string | null
  shipping_country?: string | null
  marketing_opt_in_email?: boolean | null
}

type PublicProfileRow = {
  user_id: string
  display_name?: string | null
  username?: string | null
}

type AuthUserRecord = {
  id: string
  email?: string | null
}

function normalizeEmail(value?: string | null) {
  const normalized = value?.trim().toLowerCase() || ''
  return normalized || null
}

function maskEmail(email: string) {
  const [localPart, domain = ''] = email.split('@')

  if (localPart.length <= 2) {
    return `${localPart[0] ?? '*'}*@${domain}`
  }

  return `${localPart.slice(0, 2)}***@${domain}`
}

async function listAuthUsersById() {
  const authUsersById = new Map<string, AuthUserRecord>()

  try {
    const supabase = createAdminClient()
    let page = 1

    while (page <= 10) {
      const result = await supabase.auth.admin.listUsers({
        page,
        perPage: 200,
      })

      const users = ((result.data?.users ?? []) as AuthUserRecord[]) ?? []

      for (const user of users) {
        if (!user?.id) continue
        authUsersById.set(user.id, user)
      }

      if (users.length < 200) break
      page += 1
    }
  } catch (error) {
    console.error('Failed to load auth users for email audience snapshot:', error)
  }

  return authUsersById
}

export async function getMarketingAudienceSnapshot() {
  const supabase = createAdminClient()

  const [privateProfilesResult, profilesResult] = await Promise.all([
    supabase
      .from('profile_private')
      .select(
        'user_id, support_email, legal_first_name, legal_last_name, shipping_country, marketing_opt_in_email'
      ),
    supabase.from('profiles').select('user_id, display_name, username'),
  ])

  const privateProfiles = ((privateProfilesResult.data ?? []) as MarketingContactRow[]) ?? []
  const profiles = ((profilesResult.data ?? []) as PublicProfileRow[]) ?? []
  const profilesByUser = new Map<string, PublicProfileRow>(
    profiles.map((profile) => [profile.user_id, profile])
  )
  const authUsersById = await listAuthUsersById()

  const optedInRows = privateProfiles.filter((row) => row.marketing_opt_in_email === true)
  const uniqueEmails = new Set<string>()
  const byCountry = new Map<string, number>()
  const audiencePreview: Array<{
    userId: string
    label: string
    email: string
    shipFromCountry: string | null
  }> = []

  let contactableCount = 0
  let authEmailFallbackCount = 0
  let supportEmailCount = 0

  for (const row of optedInRows) {
    const authEmail = normalizeEmail(authUsersById.get(row.user_id)?.email)
    const supportEmail = normalizeEmail(row.support_email)
    const contactEmail = supportEmail || authEmail

    if (!contactEmail) continue
    if (uniqueEmails.has(contactEmail)) continue

    uniqueEmails.add(contactEmail)
    contactableCount += 1

    if (supportEmail) supportEmailCount += 1
    else if (authEmail) authEmailFallbackCount += 1

    const shipFromCountry = row.shipping_country?.trim() || null
    if (shipFromCountry) {
      byCountry.set(shipFromCountry, Number(byCountry.get(shipFromCountry) ?? 0) + 1)
    }

    const profile = profilesByUser.get(row.user_id)
    const label =
      profile?.display_name?.trim() ||
      (profile?.username?.trim() ? `@${profile.username.trim()}` : row.user_id)

    if (audiencePreview.length < 10) {
      audiencePreview.push({
        userId: row.user_id,
        label,
        email: maskEmail(contactEmail),
        shipFromCountry,
      })
    }
  }

  const topCountries = [...byCountry.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([country, count]) => ({ country, count }))

  return {
    totalPrivateProfiles: privateProfiles.length,
    marketingOptInCount: optedInRows.length,
    contactableCount,
    supportEmailCount,
    authEmailFallbackCount,
    uniqueReachableEmails: uniqueEmails.size,
    topCountries,
    audiencePreview,
  }
}

export async function getMarketingAudienceContacts() {
  const supabase = createAdminClient()

  const [privateProfilesResult, profilesResult] = await Promise.all([
    supabase
      .from('profile_private')
      .select(
        'user_id, support_email, legal_first_name, legal_last_name, shipping_country, marketing_opt_in_email'
      ),
    supabase.from('profiles').select('user_id, display_name, username'),
  ])

  const privateProfiles = ((privateProfilesResult.data ?? []) as MarketingContactRow[]) ?? []
  const profiles = ((profilesResult.data ?? []) as PublicProfileRow[]) ?? []
  const profilesByUser = new Map<string, PublicProfileRow>(
    profiles.map((profile) => [profile.user_id, profile])
  )
  const authUsersById = await listAuthUsersById()

  return privateProfiles
    .filter((row) => row.marketing_opt_in_email === true)
    .map((row) => {
      const authEmail = normalizeEmail(authUsersById.get(row.user_id)?.email)
      const supportEmail = normalizeEmail(row.support_email)
      const profile = profilesByUser.get(row.user_id)
      const email = supportEmail || authEmail

      if (!email) return null

      return {
        userId: row.user_id,
        email,
        firstName:
          row.legal_first_name?.trim() ||
          profile?.display_name?.trim() ||
          profile?.username?.trim() ||
          undefined,
        lastName: row.legal_last_name?.trim() || undefined,
        displayLabel:
          profile?.display_name?.trim() ||
          (profile?.username?.trim() ? `@${profile.username.trim()}` : row.user_id),
        shipFromCountry: row.shipping_country?.trim() || null,
      }
    })
    .filter(Boolean) as Array<{
    userId: string
    email: string
    firstName?: string
    lastName?: string
    displayLabel: string
    shipFromCountry: string | null
  }>
}
