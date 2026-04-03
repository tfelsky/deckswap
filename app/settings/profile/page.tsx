import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  formatShipFrom,
  getProfileCompletion,
  getProfileHints,
  getTrustBadges,
  isProfileSchemaMissing,
  marketplaceLinks,
  normalizeUsername,
  type PrivateProfile,
  type ProfileVerification,
  type PublicProfile,
  type ReputationSummary,
} from '@/lib/profiles'

export const dynamic = 'force-dynamic'

function verifyStatus(verifications: ProfileVerification[], type: string) {
  return verifications.find((item) => item.verification_type === type)?.status ?? 'not_submitted'
}

export default async function ProfileSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const [profileResult, privateResult, summaryResult, verificationResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('profile_private').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('profile_reputation_summary').select('*').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('profile_verifications')
      .select('id, user_id, verification_type, status, notes')
      .eq('user_id', user.id),
  ])

  const profileSchemaMissing = [
    profileResult.error?.message,
    privateResult.error?.message,
    summaryResult.error?.message,
    verificationResult.error?.message,
  ].some((message) => isProfileSchemaMissing(message))

  const profile = (profileResult.data as PublicProfile | null) ?? ({
    user_id: user.id,
    display_name: '',
    username: '',
    bio: '',
    location_country: '',
    location_region: '',
    marketplace_tagline: '',
    website_url: '',
    instagram_url: '',
    youtube_url: '',
    whatnot_url: '',
    ebay_url: '',
    cardmarket_url: '',
    tcgplayer_url: '',
    can_ship_domestic: true,
    can_ship_international: false,
  } satisfies PublicProfile)

  const privateProfile = (privateResult.data as PrivateProfile | null) ?? ({
    user_id: user.id,
    legal_first_name: '',
    legal_last_name: '',
    support_email: user.email ?? '',
    shipping_name: '',
    shipping_address_line_1: '',
    shipping_city: '',
    shipping_region: '',
    shipping_postal_code: '',
    shipping_country: '',
    customer_service_notes: '',
    government_id_storage_key: '',
    marketing_opt_in_email: false,
  } satisfies PrivateProfile)

  const summary = (summaryResult.data as ReputationSummary | null) ?? ({
    user_id: user.id,
    completed_trades_count: 0,
    successful_shipments_count: 0,
    positive_feedback_count: 0,
    negative_feedback_count: 0,
    verification_badges: [],
    is_manually_verified: false,
    is_known_user: false,
    is_friend_of_platform: false,
    banned_status: 'active',
    banned_reason: '',
    manual_review_notes: '',
  } satisfies ReputationSummary)

  const verifications = ((verificationResult.data ?? []) as ProfileVerification[]) ?? []
  const profileCompletion = getProfileCompletion(profile, privateProfile, summary)
  const profileHints = getProfileHints(profile, privateProfile)
  const trustBadges = getTrustBadges(summary, verifications)
  const externalLinks = marketplaceLinks(profile)
  const access = await getAdminAccessForUser(user)

  async function savePublicProfile(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/sign-in')

    const payload = {
      user_id: user.id,
      display_name: String(formData.get('display_name') || '').trim(),
      username: normalizeUsername(String(formData.get('username') || '')),
      bio: String(formData.get('bio') || '').trim(),
      location_country: String(formData.get('location_country') || '').trim(),
      location_region: String(formData.get('location_region') || '').trim(),
      preferred_currency: String(formData.get('preferred_currency') || 'USD').trim(),
      marketplace_tagline: String(formData.get('marketplace_tagline') || '').trim(),
      website_url: String(formData.get('website_url') || '').trim(),
      instagram_url: String(formData.get('instagram_url') || '').trim(),
      youtube_url: String(formData.get('youtube_url') || '').trim(),
      whatnot_url: String(formData.get('whatnot_url') || '').trim(),
      ebay_url: String(formData.get('ebay_url') || '').trim(),
      cardmarket_url: String(formData.get('cardmarket_url') || '').trim(),
      tcgplayer_url: String(formData.get('tcgplayer_url') || '').trim(),
      can_ship_domestic: formData.get('can_ship_domestic') === 'on',
      can_ship_international: formData.get('can_ship_international') === 'on',
    }

    await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' })
    redirect('/settings/profile')
  }

  async function savePrivateProfile(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/sign-in')

    const payload = {
      user_id: user.id,
      legal_first_name: String(formData.get('legal_first_name') || '').trim(),
      legal_last_name: String(formData.get('legal_last_name') || '').trim(),
      support_email: String(formData.get('support_email') || '').trim(),
      shipping_name: String(formData.get('shipping_name') || '').trim(),
      shipping_address_line_1: String(formData.get('shipping_address_line_1') || '').trim(),
      shipping_city: String(formData.get('shipping_city') || '').trim(),
      shipping_region: String(formData.get('shipping_region') || '').trim(),
      shipping_postal_code: String(formData.get('shipping_postal_code') || '').trim(),
      shipping_country: String(formData.get('shipping_country') || '').trim(),
      customer_service_notes: String(formData.get('customer_service_notes') || '').trim(),
      government_id_storage_key: String(formData.get('government_id_storage_key') || '').trim(),
      marketing_opt_in_email: formData.get('marketing_opt_in_email') === 'on',
    }

    await supabase.from('profile_private').upsert(payload, { onConflict: 'user_id' })
    redirect('/settings/profile')
  }

  async function submitTrustIntent(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/sign-in')

    const verificationPayloads = [
      {
        user_id: user.id,
        verification_type: 'seller_attestation',
        status: formData.get('seller_attestation') === 'on' ? 'submitted' : 'not_submitted',
        notes: 'Submitted from profile settings.',
      },
      {
        user_id: user.id,
        verification_type: 'shipping_address',
        status: formData.get('shipping_address_verified') === 'on' ? 'submitted' : 'not_submitted',
        notes: 'Shipping address ready for review.',
      },
      {
        user_id: user.id,
        verification_type: 'government_id',
        status: formData.get('government_id_ready') === 'on' ? 'submitted' : 'not_submitted',
        notes: 'Government ID placeholder reserved for future collection flow.',
      },
    ]

    for (const payload of verificationPayloads) {
      await supabase.from('profile_verifications').upsert(payload, { onConflict: 'user_id,verification_type' })
    }

    await supabase
      .from('profile_reputation_summary')
      .upsert({ user_id: user.id }, { onConflict: 'user_id' })

    redirect('/settings/profile')
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/my-decks"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
            >
              {'<-'} Back to My Decks
            </Link>
            <Link
              href="/decks"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Marketplace
            </Link>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                Profile And Trust
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">Build your trader identity</h1>
              <p className="mt-3 max-w-2xl text-zinc-400">
                Add public profile details, shipping readiness, and trust references so buyers and trading partners can understand who you are before they commit.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-zinc-400">Profile Completion</div>
                  <div className="mt-2 text-3xl font-semibold text-emerald-300">{profileCompletion}%</div>
                </div>
                <div className="text-right text-sm text-zinc-400">
                  Ship from {formatShipFrom(profile)}
                </div>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>

              <div className="mt-5 space-y-2 text-sm text-zinc-300">
                {profileHints.length > 0 ? (
                  profileHints.map((hint) => <p key={hint}>{hint}</p>)
                ) : (
                  <p>Your profile basics are in good shape. Next best step is letting manual trust review catch up.</p>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {trustBadges.length > 0 ? (
                  trustBadges.map((badge) => (
                    <span key={badge} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                      {badge}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
                    Trust badges will appear here after verification or manual review.
                  </span>
                )}
              </div>
            </div>
          </div>

          {profileSchemaMissing && (
            <div className="mt-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm text-yellow-100">
              Profile tables are not in Supabase yet. Run the SQL in `docs/sql/user-profiles-and-trust.sql` before expecting this page to persist data.
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <form action={savePublicProfile} className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Public Profile</h2>
              <p className="mt-2 text-sm text-zinc-400">
                This is what buyers and trading partners can see.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Display name</label>
                  <input name="display_name" defaultValue={profile.display_name ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Username</label>
                  <input name="username" defaultValue={profile.username ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm text-zinc-400">Bio</label>
                  <textarea name="bio" rows={4} defaultValue={profile.bio ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Marketplace tagline</label>
                  <input name="marketplace_tagline" defaultValue={profile.marketplace_tagline ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Preferred currency</label>
                  <input name="preferred_currency" defaultValue={profile.preferred_currency ?? 'USD'} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Country</label>
                  <input name="location_country" defaultValue={profile.location_country ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Region / province / state</label>
                  <input name="location_region" defaultValue={profile.location_region ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">TCGplayer URL</label>
                  <input name="tcgplayer_url" defaultValue={profile.tcgplayer_url ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">eBay URL</label>
                  <input name="ebay_url" defaultValue={profile.ebay_url ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Cardmarket URL</label>
                  <input name="cardmarket_url" defaultValue={profile.cardmarket_url ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Whatnot URL</label>
                  <input name="whatnot_url" defaultValue={profile.whatnot_url ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Instagram URL</label>
                  <input name="instagram_url" defaultValue={profile.instagram_url ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">YouTube URL</label>
                  <input name="youtube_url" defaultValue={profile.youtube_url ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm text-zinc-400">Website URL</label>
                  <input name="website_url" defaultValue={profile.website_url ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-4 text-sm text-zinc-300">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" name="can_ship_domestic" defaultChecked={profile.can_ship_domestic ?? true} />
                  Domestic shipping available
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" name="can_ship_international" defaultChecked={profile.can_ship_international ?? false} />
                  International shipping available
                </label>
              </div>

              <button className="mt-6 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950">Save Public Profile</button>
            </form>

            <form action={savePrivateProfile} className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Private Shipping And Support</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Private operational details for logistics, support, and later verification.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Legal first name</label>
                  <input name="legal_first_name" defaultValue={privateProfile.legal_first_name ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Legal last name</label>
                  <input name="legal_last_name" defaultValue={privateProfile.legal_last_name ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm text-zinc-400">Support email</label>
                  <input name="support_email" defaultValue={privateProfile.support_email ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Shipping name</label>
                  <input name="shipping_name" defaultValue={privateProfile.shipping_name ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Address line 1</label>
                  <input name="shipping_address_line_1" defaultValue={privateProfile.shipping_address_line_1 ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">City</label>
                  <input name="shipping_city" defaultValue={privateProfile.shipping_city ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Region</label>
                  <input name="shipping_region" defaultValue={privateProfile.shipping_region ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Postal code</label>
                  <input name="shipping_postal_code" defaultValue={privateProfile.shipping_postal_code ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Country</label>
                  <input name="shipping_country" defaultValue={privateProfile.shipping_country ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm text-zinc-400">Government ID placeholder key</label>
                  <input name="government_id_storage_key" defaultValue={privateProfile.government_id_storage_key ?? ''} placeholder="reserved/key/for/later-upload" className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm text-zinc-400">Customer service notes</label>
                  <textarea name="customer_service_notes" rows={4} defaultValue={privateProfile.customer_service_notes ?? ''} className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
                </div>
              </div>

              <label className="mt-5 inline-flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" name="marketing_opt_in_email" defaultChecked={privateProfile.marketing_opt_in_email ?? false} />
                Email me marketplace updates and feature launches
              </label>

              <button className="mt-6 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950">Save Private Profile</button>
            </form>
          </div>

          <div className="space-y-6">
            <form action={submitTrustIntent} className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Trust Signals</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Submit the pieces that make you easier to trust before the full verification workflow ships.
              </p>

              <div className="mt-6 space-y-4 text-sm text-zinc-300">
                <label className="block rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" name="seller_attestation" defaultChecked={verifyStatus(verifications, 'seller_attestation') !== 'not_submitted'} />
                    <div>
                      <div className="font-medium text-white">Seller / trader attestation</div>
                      <p className="mt-1 text-zinc-400">I will ship the agreed inventory honestly and communicate clearly if issues come up.</p>
                    </div>
                  </div>
                </label>

                <label className="block rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" name="shipping_address_verified" defaultChecked={verifyStatus(verifications, 'shipping_address') !== 'not_submitted'} />
                    <div>
                      <div className="font-medium text-white">Shipping address ready for review</div>
                      <p className="mt-1 text-zinc-400">My shipping details are complete enough for a manual trust check.</p>
                    </div>
                  </div>
                </label>

                <label className="block rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" name="government_id_ready" defaultChecked={verifyStatus(verifications, 'government_id') !== 'not_submitted'} />
                    <div>
                      <div className="font-medium text-white">Government ID placeholder reserved</div>
                      <p className="mt-1 text-zinc-400">I am willing to complete ID verification for higher-trust trades when the upload flow is live.</p>
                    </div>
                  </div>
                </label>
              </div>

              <button className="mt-6 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950">Save Trust Status</button>
            </form>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Seller Card Preview</h2>
              <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-white">{profile.display_name || user.email}</div>
                    <div className="mt-1 text-sm text-zinc-400">
                      {profile.username ? `@${profile.username}` : 'Username not set'}
                    </div>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                    summary.banned_status && summary.banned_status !== 'active'
                      ? 'border border-red-500/20 bg-red-500/10 text-red-200'
                      : 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                  }`}>
                    {summary.banned_status && summary.banned_status !== 'active' ? 'Restricted' : 'Active'}
                  </div>
                </div>

                <p className="mt-3 text-sm text-zinc-300">
                  {profile.marketplace_tagline || 'Add a short line that explains what kind of trader you are.'}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Ship From</div>
                    <div className="mt-2 text-sm font-medium text-white">{formatShipFrom(profile)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Completed Trades</div>
                    <div className="mt-2 text-sm font-medium text-white">{summary.completed_trades_count ?? 0}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {trustBadges.length > 0 ? (
                    trustBadges.map((badge) => (
                      <span key={badge} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-200">
                        {badge}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-zinc-400">No badges yet</span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">External References</h2>
              <div className="mt-4 space-y-3 text-sm">
                {externalLinks.length > 0 ? (
                  externalLinks.map((link) => (
                    <a key={`${link.label}-${link.href}`} href={link.href} target="_blank" rel="noreferrer" className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-zinc-200 hover:bg-white/10">
                      {link.label}
                    </a>
                  ))
                ) : (
                  <p className="text-zinc-400">Add TCGplayer, eBay, Whatnot, or Cardmarket links to give buyers a real-world trust reference.</p>
                )}
              </div>
            </div>

            {access.isAdmin && (
              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
                <h2 className="text-2xl font-semibold text-white">Internal Access</h2>
                <p className="mt-2 text-sm text-emerald-50/80">
                  This account has elevated internal access for DeckSwap operations.
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Role</div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {access.isSuperadmin ? 'Superadmin' : 'Admin'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Source</div>
                    <div className="mt-2 text-sm font-medium text-white capitalize">
                      {access.source}
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-sm text-emerald-50/80">
                  For a durable role setup, run <code>docs/sql/admin-roles.sql</code> and assign
                  future admins there instead of relying on the fallback email.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
