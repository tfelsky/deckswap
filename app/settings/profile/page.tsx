import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AdminOnlyCallout } from '@/components/admin-only-callout'
import FormActionButton from '@/components/form-action-button'
import { createClient } from '@/lib/supabase/server'
import {
  formatVerificationStatus,
  verificationStatusTone,
} from '@/lib/profile-verifications'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { SUPPORTED_CURRENCIES, currencyLabel, normalizeSupportedCurrency } from '@/lib/currency'
import {
  formatShipFrom,
  getProfileCompletion,
  getProfileHints,
  getTrustBadges,
  getVerificationReadinessMap,
  isProfileSchemaMissing,
  marketplaceLinks,
  normalizeUsername,
  type PrivateProfile,
  type ProfileVerification,
  type PublicProfile,
  type ReputationSummary,
} from '@/lib/profiles'

export const dynamic = 'force-dynamic'

type DeckProgressRow = {
  id: number
  is_listed_for_trade?: boolean | null
  buy_now_price_usd?: number | null
}

type TradeOfferCountRow = {
  id: number
}

function verifyStatus(verifications: ProfileVerification[], type: string) {
  return verifications.find((item) => item.verification_type === type)?.status ?? 'not_submitted'
}

function verificationForType(verifications: ProfileVerification[], type: string) {
  return verifications.find((item) => item.verification_type === type) ?? null
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export default async function ProfileSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
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
      .select('id, user_id, verification_type, status, notes, submitted_at, reviewed_at, reviewed_by, review_notes')
      .eq('user_id', user.id),
  ])

  const [decksResult, listedDecksResult, buyNowDecksResult, offersResult] = await Promise.all([
    supabase
      .from('decks')
      .select('id, is_listed_for_trade, buy_now_price_usd')
      .eq('user_id', user.id),
    supabase
      .from('decks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_listed_for_trade', true),
    supabase
      .from('decks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gt('buy_now_price_usd', 0),
    supabase
      .from('trade_offers')
      .select('id')
      .or(`offered_by_user_id.eq.${user.id},requested_user_id.eq.${user.id}`),
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
  const sellerAttestationVerification = verificationForType(verifications, 'seller_attestation')
  const shippingVerification = verificationForType(verifications, 'shipping_address')
  const governmentIdVerification = verificationForType(verifications, 'government_id')
  const profileCompletion = getProfileCompletion(profile, privateProfile, summary)
  const profileHints = getProfileHints(profile, privateProfile)
  const trustBadges = getTrustBadges(summary, verifications)
  const verificationReadiness = getVerificationReadinessMap(profile, privateProfile)
  const externalLinks = marketplaceLinks(profile)
  const access = await getAdminAccessForUser(user)
  const decks = ((decksResult.data ?? []) as DeckProgressRow[]) ?? []
  const deckCount = decks.length
  const listedDeckCount = Number(listedDecksResult.count ?? 0)
  const buyNowDeckCount = Number(buyNowDecksResult.count ?? 0)
  const offerCount = (((offersResult.data ?? []) as TradeOfferCountRow[]) ?? []).length
  const hasUsername = !!profile.username?.trim()
  const hasBio = !!profile.bio?.trim() || !!profile.marketplace_tagline?.trim()
  const hasImportOrManualDeck = deckCount > 0
  const hasTradeReadyDeck = listedDeckCount > 0
  const hasBuyNowDeck = buyNowDeckCount > 0
  const hasOfferActivity = offerCount > 0
  const discoveryChecklist = [
    {
      label: 'Complete your public trader profile',
      done: hasUsername && hasBio,
      href: '#public-profile',
      help: 'Add a username, bio, and tagline so your seller card feels real.',
    },
    {
      label: 'Add your first deck',
      done: hasImportOrManualDeck,
      href: '/import-deck',
      help: 'Import from Moxfield, text, or file to unlock pricing and listing flows.',
    },
    {
      label: 'List at least one deck for Deck Swap',
      done: hasTradeReadyDeck,
      href: '/my-decks',
      help: 'Start with the highest-value path first by opening trade listing settings.',
    },
    {
      label: 'Try a Buy It Now listing',
      done: hasBuyNowDeck,
      href: '/my-decks',
      help: 'Offer a direct-sale fallback after Deck Swap, before trying auctions.',
    },
    {
      label: 'Check your offer workflow',
      done: hasOfferActivity,
      href: '/trade-offers',
      help: 'See how offers, counters, and negotiation flow through the marketplace.',
    },
  ]
  const completedDiscoverySteps = discoveryChecklist.filter((step) => step.done).length
  const discoveryPercent = clampPercent(
    (completedDiscoverySteps / discoveryChecklist.length) * 100
  )
  const blockedVerificationTypes = String(resolvedSearchParams.verificationBlocked || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

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
      preferred_currency: normalizeSupportedCurrency(
        String(formData.get('preferred_currency') || 'USD')
      ),
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
    redirect('/settings/profile?saved=public')
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
    redirect('/settings/profile?saved=private')
  }

  async function submitTrustIntent(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/sign-in')

    const [profileResult, privateProfileResult, existingVerificationRowsResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('profile_private').select('*').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('profile_verifications')
        .select('id, user_id, verification_type, status, notes, submitted_at, reviewed_at, reviewed_by, review_notes')
        .eq('user_id', user.id),
    ])

    const liveProfile = (profileResult.data as PublicProfile | null) ?? { user_id: user.id }
    const livePrivateProfile = (privateProfileResult.data as PrivateProfile | null) ?? { user_id: user.id }
    const readiness = getVerificationReadinessMap(liveProfile, livePrivateProfile)
    const requestedTypes = [
      formData.get('seller_attestation') === 'on' ? 'seller_attestation' : null,
      formData.get('shipping_address_verified') === 'on' ? 'shipping_address' : null,
      formData.get('government_id_ready') === 'on' ? 'government_id' : null,
    ].filter(Boolean) as Array<'seller_attestation' | 'shipping_address' | 'government_id'>

    const blockedTypes = requestedTypes.filter((type) => !readiness[type].ready)
    if (blockedTypes.length > 0) {
      redirect(`/settings/profile?verificationBlocked=${encodeURIComponent(blockedTypes.join(','))}`)
    }

    const existingVerificationRows = existingVerificationRowsResult.data

    const existingVerificationMap = new Map<string, ProfileVerification>(
      ((existingVerificationRows ?? []) as ProfileVerification[]).map((row) => [row.verification_type, row])
    )
    const now = new Date().toISOString()

    const nextVerificationPayload = ({
      verificationType,
      requested,
      notes,
    }: {
      verificationType: string
      requested: boolean
      notes: string
    }) => {
      const existing = existingVerificationMap.get(verificationType)
      const existingStatus = existing?.status ?? 'not_submitted'

      if (!requested && existingStatus === 'verified') {
        return {
          user_id: user.id,
          verification_type: verificationType,
          status: existingStatus,
          notes: existing?.notes ?? notes,
          submitted_at: existing?.submitted_at ?? null,
          reviewed_at: existing?.reviewed_at ?? null,
          reviewed_by: existing?.reviewed_by ?? null,
          review_notes: existing?.review_notes ?? null,
        }
      }

      if (!requested) {
        return {
          user_id: user.id,
          verification_type: verificationType,
          status: 'not_submitted',
          notes,
          submitted_at: null,
          reviewed_at: null,
          reviewed_by: null,
          review_notes: null,
        }
      }

      if (existingStatus === 'verified') {
        return {
          user_id: user.id,
          verification_type: verificationType,
          status: 'verified',
          notes,
          submitted_at: existing?.submitted_at ?? now,
          reviewed_at: existing?.reviewed_at ?? null,
          reviewed_by: existing?.reviewed_by ?? null,
          review_notes: existing?.review_notes ?? null,
        }
      }

      return {
        user_id: user.id,
        verification_type: verificationType,
        status: 'submitted',
        notes,
        submitted_at: now,
        reviewed_at: null,
        reviewed_by: null,
        review_notes: null,
      }
    }

    const verificationPayloads = [
      nextVerificationPayload({
        verificationType: 'seller_attestation',
        requested: formData.get('seller_attestation') === 'on',
        notes:
          String(formData.get('seller_attestation_notes') || '').trim() ||
          'Seller attestation submitted from profile settings.',
      }),
      nextVerificationPayload({
        verificationType: 'shipping_address',
        requested: formData.get('shipping_address_verified') === 'on',
        notes:
          String(formData.get('shipping_address_notes') || '').trim() ||
          'Shipping address ready for review.',
      }),
      nextVerificationPayload({
        verificationType: 'government_id',
        requested: formData.get('government_id_ready') === 'on',
        notes:
          String(formData.get('government_id_notes') || '').trim() ||
          'Government ID verification requested from profile settings.',
      }),
    ]

    for (const payload of verificationPayloads) {
      await supabase.from('profile_verifications').upsert(payload, { onConflict: 'user_id,verification_type' })
    }

    await supabase
      .from('profile_reputation_summary')
      .upsert({ user_id: user.id }, { onConflict: 'user_id' })

    redirect('/settings/profile?saved=verification')
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
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

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                Profile And Trust
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Build your trader identity
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">
                Add the public details, shipping readiness, and trust signals that help other people feel comfortable trading with you.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-zinc-400">Profile Completion</div>
                  <div className="mt-1 text-2xl font-semibold text-emerald-300">{profileCompletion}%</div>
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

              <div className="mt-4 space-y-2 text-sm text-zinc-300">
                {profileHints.length > 0 ? (
                  profileHints.map((hint) => <p key={hint}>{hint}</p>)
                ) : (
                  <p>Your profile basics are in good shape. Next best step is letting manual trust review catch up.</p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
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

          {resolvedSearchParams.saved === 'public' && (
            <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-100">
              Public profile saved. Your seller-facing details are updated.
            </div>
          )}

          {resolvedSearchParams.saved === 'private' && (
            <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-100">
              Private profile saved. Shipping and support details are updated.
            </div>
          )}

          {resolvedSearchParams.saved === 'verification' && (
            <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-100">
              Verification request saved. The trust review queue now reflects your latest request.
            </div>
          )}

          {blockedVerificationTypes.length > 0 && (
            <div className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
              Some verification requests were blocked because required profile or shipping fields are still missing. Review the checklist inside each verification card, update the missing fields, and submit again.
            </div>
          )}

          {access.isAdmin ? (
            <AdminOnlyCallout
              className="mt-6"
              title="Admin progress view"
              description="Internal guidance and sequencing only. Hidden from public users."
            >
              <div className="rounded-[1.25rem] border border-sky-400/20 bg-[linear-gradient(135deg,rgba(56,189,248,0.1),rgba(24,24,27,0.92))] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-medium tracking-wide text-sky-200">
                      Marketplace Progress
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                      Compact next-step view
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      Encourage profile completion first, then deck import, Deck Swap, Buy It Now, and finally auctions.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center">
                    <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">Discovery</div>
                    <div className="mt-1 text-2xl font-semibold text-white">{discoveryPercent}%</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {completedDiscoverySteps} of {discoveryChecklist.length} steps done
                    </div>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-sky-400 transition-all"
                    style={{ width: `${discoveryPercent}%` }}
                  />
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-2.5">
                    {discoveryChecklist.map((step) => (
                      <div
                        key={step.label}
                        className="rounded-xl border border-white/10 bg-black/20 px-3.5 py-3"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {step.done ? 'Complete' : 'Next'}: {step.label}
                            </div>
                            <p className="mt-1 text-sm leading-6 text-zinc-400">{step.help}</p>
                          </div>
                          <Link
                            href={step.href}
                            className={`rounded-xl px-4 py-2 text-sm font-medium ${
                              step.done
                                ? 'border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                                : 'bg-sky-400 text-zinc-950 hover:opacity-90'
                            }`}
                          >
                            {step.done ? 'Review' : 'Open'}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3.5">
                      <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Decks Added</div>
                      <div className="mt-1.5 text-xl font-semibold text-white">{deckCount}</div>
                      <div className="mt-1 text-xs text-zinc-400">
                        Imported or manually created inventory
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3.5">
                      <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Deck Swap Live</div>
                      <div className="mt-1.5 text-xl font-semibold text-emerald-300">
                        {listedDeckCount}
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">
                        Highest-value lane before direct sale or auction
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3.5">
                      <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Buy It Now Live</div>
                      <div className="mt-1.5 text-xl font-semibold text-amber-200">
                        {buyNowDeckCount}
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">
                        Direct-sale fallback listings
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3.5">
                      <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Offer Activity</div>
                      <div className="mt-1.5 text-xl font-semibold text-sky-200">{offerCount}</div>
                      <div className="mt-1 text-xs text-zinc-400">
                        Total offers sent or received so far
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AdminOnlyCallout>
          ) : null}

          {profileSchemaMissing && (
            <div className="mt-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm text-yellow-100">
              Profile tables are not in Supabase yet. Run the SQL in `docs/sql/user-profiles-and-trust.sql` before expecting this page to persist data.
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <form id="public-profile" action={savePublicProfile} className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
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
                  <select
                    name="preferred_currency"
                    defaultValue={normalizeSupportedCurrency(profile.preferred_currency)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    {SUPPORTED_CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency} - {currencyLabel(currency)}
                      </option>
                    ))}
                  </select>
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

              <FormActionButton
                pendingLabel="Saving public profile..."
                className="mt-6 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Save Public Profile
              </FormActionButton>
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
                  <label className="mb-2 block text-sm text-zinc-400">Internal ID reference</label>
                  <input name="government_id_storage_key" defaultValue={privateProfile.government_id_storage_key ?? ''} placeholder="optional review note or intake reference" className="w-full rounded-xl border border-white/10 bg-white/5 p-3" />
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

              <FormActionButton
                pendingLabel="Saving private profile..."
                className="mt-6 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Save Private Profile
              </FormActionButton>
            </form>
          </div>

          <div className="space-y-6">
            <form action={submitTrustIntent} className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">Verification Requests</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Submit the trust checks you want reviewed so your seller profile can earn clearer marketplace signals.
                  </p>
                </div>
                {access.isAdmin && (
                  <Link
                    href="/admin/verifications"
                    className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-400/15"
                  >
                    Open review queue
                  </Link>
                )}
              </div>

              <div className="mt-6 space-y-4 text-sm text-zinc-300">
                <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-50/90">
                  A verification request is a manual trust review request for your profile. DeckSwap staff or admins review the request status, and verified checks can add trust signals to your seller card without exposing private profile fields publicly.
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                  This page does not upload or store a government ID image directly. The private profile currently stores an internal intake reference only, so you should not paste sensitive ID numbers into these notes.
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <label className="flex items-start gap-3">
                      <input type="checkbox" name="seller_attestation" defaultChecked={verifyStatus(verifications, 'seller_attestation') !== 'not_submitted'} />
                      <div>
                        <div className="font-medium text-white">Seller / trader attestation</div>
                        <p className="mt-1 text-zinc-400">Confirm that you list inventory honestly, pack carefully, and communicate quickly if a trade or sale changes.</p>
                      </div>
                    </label>
                    <span className={`rounded-full border px-3 py-1 text-xs ${verificationStatusTone(sellerAttestationVerification?.status)}`}>
                      {formatVerificationStatus(sellerAttestationVerification?.status)}
                    </span>
                  </div>
                  <textarea
                    name="seller_attestation_notes"
                    rows={2}
                    defaultValue={sellerAttestationVerification?.notes ?? ''}
                    placeholder="Optional context for review"
                    className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm"
                  />
                  {!verificationReadiness.seller_attestation.ready ? (
                    <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs text-amber-100">
                      {verificationReadiness.seller_attestation.missing.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-xs text-emerald-100">
                      Ready to submit for review.
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <label className="flex items-start gap-3">
                      <input type="checkbox" name="shipping_address_verified" defaultChecked={verifyStatus(verifications, 'shipping_address') !== 'not_submitted'} />
                      <div>
                        <div className="font-medium text-white">Shipping address ready for review</div>
                        <p className="mt-1 text-zinc-400">Ask for a manual check once your private shipping details are complete and ready for live logistics.</p>
                      </div>
                    </label>
                    <span className={`rounded-full border px-3 py-1 text-xs ${verificationStatusTone(shippingVerification?.status)}`}>
                      {formatVerificationStatus(shippingVerification?.status)}
                    </span>
                  </div>
                  <textarea
                    name="shipping_address_notes"
                    rows={2}
                    defaultValue={shippingVerification?.notes ?? ''}
                    placeholder="Optional note for the reviewer"
                    className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm"
                  />
                  {!verificationReadiness.shipping_address.ready ? (
                    <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs text-amber-100">
                      {verificationReadiness.shipping_address.missing.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-xs text-emerald-100">
                      Ready to submit for review.
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <label className="flex items-start gap-3">
                      <input type="checkbox" name="government_id_ready" defaultChecked={verifyStatus(verifications, 'government_id') !== 'not_submitted'} />
                      <div>
                        <div className="font-medium text-white">Government ID review</div>
                        <p className="mt-1 text-zinc-400">Request higher-trust review for larger deals once your private ID intake reference is ready.</p>
                      </div>
                    </label>
                    <span className={`rounded-full border px-3 py-1 text-xs ${verificationStatusTone(governmentIdVerification?.status)}`}>
                      {formatVerificationStatus(governmentIdVerification?.status)}
                    </span>
                  </div>
                  <textarea
                    name="government_id_notes"
                    rows={2}
                    defaultValue={governmentIdVerification?.notes ?? privateProfile.government_id_storage_key ?? ''}
                    placeholder="Optional secure intake reference or note"
                    className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm"
                  />
                  {!verificationReadiness.government_id.ready ? (
                    <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs text-amber-100">
                      {verificationReadiness.government_id.missing.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-xs text-emerald-100">
                      Ready to submit for review.
                    </div>
                  )}
                </div>
              </div>

              <FormActionButton
                pendingLabel="Submitting verification requests..."
                className="mt-6 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Submit Verification Requests
              </FormActionButton>
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
                  This account has elevated internal access for Mythiverse Exchange operations.
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
