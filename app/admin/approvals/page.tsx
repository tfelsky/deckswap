import Link from 'next/link'
import { redirect } from 'next/navigation'
import FormActionButton from '@/components/form-action-button'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  calculateInternalValidationSummary,
  formatShipFrom,
  isProfileSchemaMissing,
  marketplaceLinks,
  type PrivateProfile,
  type ProfileVerification,
  type PublicProfile,
  type ReputationSummary,
} from '@/lib/profiles'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type ProfileRow = PublicProfile & {
  created_at?: string | null
}

type PrivateProfileRow = PrivateProfile & {
  created_at?: string | null
}

type SummaryRow = ReputationSummary & {
  updated_at?: string | null
}

type VerificationRow = ProfileVerification & {
  id: number
  created_at?: string | null
  updated_at?: string | null
}

type DeckRow = {
  id: number
  user_id: string
  name?: string | null
  source_type?: string | null
  imported_at?: string | null
  is_listed_for_trade?: boolean | null
  buy_now_price_usd?: number | null
  inventory_status?: string | null
  price_total_usd_foil?: number | null
}

type TradeOfferRow = {
  id: number
  offered_by_user_id: string
  requested_user_id: string
  status?: string | null
  created_at?: string | null
}

type ApprovalCardRow = {
  userId: string
  title: string
  subtitle: string
  firstSeenAt: string | null
  profile: ProfileRow | null
  privateProfile: PrivateProfileRow | null
  summary: SummaryRow | null
  verifications: VerificationRow[]
  decks: DeckRow[]
  offerCount: number
  completedTrades: number
  importedDeckCount: number
  liveDeckSwapCount: number
  liveBuyNowCount: number
  listedValue: number
  activityRecommendation: string
}

function formatTimestamp(value?: string | null) {
  if (!value) return 'Not recorded'
  return new Date(value).toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`
}

function formatApprovalStatus(value?: string | null) {
  if (!value) return 'Pending'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function approvalTone(value?: string | null) {
  switch (value) {
    case 'approved':
      return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
    case 'denied':
      return 'border-red-500/20 bg-red-500/10 text-red-200'
    case 'under_review':
      return 'border-amber-400/20 bg-amber-400/10 text-amber-200'
    default:
      return 'border-sky-400/20 bg-sky-400/10 text-sky-200'
  }
}

function earliestDate(values: Array<string | null | undefined>) {
  const timestamps = values
    .filter((value): value is string => !!value)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))

  if (timestamps.length === 0) return null
  return new Date(Math.min(...timestamps)).toISOString()
}

function userTitle(profile: ProfileRow | null, privateProfile: PrivateProfileRow | null, userId: string) {
  return (
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    privateProfile?.support_email?.trim() ||
    `${userId.slice(0, 8)}...`
  )
}

function userSubtitle(profile: ProfileRow | null, privateProfile: PrivateProfileRow | null, userId: string) {
  if (profile?.username?.trim()) return `@${profile.username.trim()}`
  if (privateProfile?.support_email?.trim()) return privateProfile.support_email.trim()
  return userId
}

function recommendationForUser(card: ApprovalCardRow) {
  const validation = calculateInternalValidationSummary(
    card.summary,
    card.profile,
    card.privateProfile
  )
  const hasShipping =
    !!card.privateProfile?.shipping_name?.trim() &&
    !!card.privateProfile?.shipping_address_line_1?.trim() &&
    !!card.privateProfile?.shipping_city?.trim() &&
    !!card.privateProfile?.shipping_country?.trim()
  const hasExternalLinks = marketplaceLinks(card.profile).length > 0
  const hasVerificationRequest = card.verifications.some(
    (verification) => verification.status && verification.status !== 'not_submitted'
  )

  if (
    validation.score >= 70 &&
    (hasShipping || hasExternalLinks || hasVerificationRequest || card.decks.length > 0)
  ) {
    return 'Strong early approval candidate'
  }

  if (validation.score >= 50 || hasShipping || card.decks.length > 0) {
    return 'Worth manual review before approval'
  }

  return 'Needs more profile or activity signal first'
}

export default async function AdminApprovalsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const access = await getAdminAccessForUser(user)

  if (!user || !access.isAdmin) {
    redirect('/decks')
  }

  async function reviewApprovalAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const access = await getAdminAccessForUser(user)

    if (!user || !access.isAdmin) {
      redirect('/decks')
    }

    const targetUserId = String(formData.get('target_user_id') || '').trim()
    const decision = String(formData.get('decision') || 'pending').trim()
    const approvalNotes = String(formData.get('approval_notes') || '').trim()
    const now = new Date().toISOString()

    if (!targetUserId) {
      redirect('/admin/approvals')
    }

    const nextStatus =
      decision === 'approved' || decision === 'denied' || decision === 'under_review'
        ? decision
        : 'pending'

    const payload: Record<string, unknown> = {
      user_id: targetUserId,
      approval_status: nextStatus,
      approval_notes: approvalNotes || null,
      updated_at: now,
    }

    if (nextStatus === 'approved') {
      payload.approved_at = now
      payload.approved_by = user.id
      payload.is_known_user = true
      payload.banned_status = 'active'
    } else if (nextStatus === 'under_review') {
      payload.approved_at = null
      payload.approved_by = null
    } else if (nextStatus === 'denied') {
      payload.approved_at = null
      payload.approved_by = null
      payload.is_known_user = false
    }

    await supabase
      .from('profile_reputation_summary')
      .upsert(payload, { onConflict: 'user_id' })

    redirect('/admin/approvals')
  }

  const [profilesResult, privateProfilesResult, summariesResult, verificationsResult, decksResult, offersResult] =
    await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('profile_private').select('*'),
      supabase.from('profile_reputation_summary').select('*'),
      supabase
        .from('profile_verifications')
        .select(
          'id, user_id, verification_type, status, notes, submitted_at, reviewed_at, reviewed_by, review_notes, created_at, updated_at'
        )
        .order('submitted_at', { ascending: false }),
      supabase
        .from('decks')
        .select(
          'id, user_id, name, source_type, imported_at, is_listed_for_trade, buy_now_price_usd, inventory_status, price_total_usd_foil'
        )
        .order('imported_at', { ascending: false }),
      supabase
        .from('trade_offers')
        .select('id, offered_by_user_id, requested_user_id, status, created_at')
        .order('created_at', { ascending: false }),
    ])

  const schemaMissing = [
    profilesResult.error?.message,
    privateProfilesResult.error?.message,
    summariesResult.error?.message,
    verificationsResult.error?.message,
  ].some((message) => isProfileSchemaMissing(message))

  const profiles = ((profilesResult.data ?? []) as ProfileRow[]) ?? []
  const privateProfiles = ((privateProfilesResult.data ?? []) as PrivateProfileRow[]) ?? []
  const summaries = ((summariesResult.data ?? []) as SummaryRow[]) ?? []
  const verifications = ((verificationsResult.data ?? []) as VerificationRow[]) ?? []
  const decks = ((decksResult.data ?? []) as DeckRow[]) ?? []
  const offers = ((offersResult.data ?? []) as TradeOfferRow[]) ?? []

  const profileByUser = new Map<string, ProfileRow>(profiles.map((row) => [row.user_id, row]))
  const privateByUser = new Map<string, PrivateProfileRow>(
    privateProfiles.map((row) => [row.user_id, row])
  )
  const summaryByUser = new Map<string, SummaryRow>(summaries.map((row) => [row.user_id, row]))
  const verificationsByUser = new Map<string, VerificationRow[]>()
  const decksByUser = new Map<string, DeckRow[]>()
  const offersByUser = new Map<string, number>()

  for (const verification of verifications) {
    const existing = verificationsByUser.get(verification.user_id) ?? []
    existing.push(verification)
    verificationsByUser.set(verification.user_id, existing)
  }

  for (const deck of decks) {
    const existing = decksByUser.get(deck.user_id) ?? []
    existing.push(deck)
    decksByUser.set(deck.user_id, existing)
  }

  for (const offer of offers) {
    offersByUser.set(offer.offered_by_user_id, (offersByUser.get(offer.offered_by_user_id) ?? 0) + 1)
    offersByUser.set(offer.requested_user_id, (offersByUser.get(offer.requested_user_id) ?? 0) + 1)
  }

  const userIds = new Set<string>()
  for (const row of profiles) userIds.add(row.user_id)
  for (const row of privateProfiles) userIds.add(row.user_id)
  for (const row of summaries) userIds.add(row.user_id)
  for (const row of verifications) userIds.add(row.user_id)
  for (const row of decks) userIds.add(row.user_id)

  const approvalCards = [...userIds]
    .map((userId) => {
      const profile = profileByUser.get(userId) ?? null
      const privateProfile = privateByUser.get(userId) ?? null
      const summary = summaryByUser.get(userId) ?? null
      const userVerifications = verificationsByUser.get(userId) ?? []
      const userDecks = decksByUser.get(userId) ?? []
      const firstSeenAt = earliestDate([
        profile?.created_at,
        privateProfile?.created_at,
        summary?.approved_at,
        summary?.updated_at,
        ...userVerifications.map((row) => row.created_at ?? row.submitted_at),
        ...userDecks.map((row) => row.imported_at),
      ])
      const importedDeckCount = userDecks.filter(
        (deck) => !!deck.source_type && deck.source_type !== 'text'
      ).length
      const liveDeckSwapCount = userDecks.filter((deck) => deck.is_listed_for_trade).length
      const liveBuyNowCount = userDecks.filter(
        (deck) => Number(deck.buy_now_price_usd ?? 0) > 0
      ).length
      const listedValue = userDecks.reduce(
        (sum, deck) => sum + Number(deck.price_total_usd_foil ?? 0),
        0
      )
      const completedTrades = Number(summary?.completed_trades_count ?? 0)

      const card: ApprovalCardRow = {
        userId,
        title: userTitle(profile, privateProfile, userId),
        subtitle: userSubtitle(profile, privateProfile, userId),
        firstSeenAt,
        profile,
        privateProfile,
        summary,
        verifications: userVerifications,
        decks: userDecks,
        offerCount: offersByUser.get(userId) ?? 0,
        completedTrades,
        importedDeckCount,
        liveDeckSwapCount,
        liveBuyNowCount,
        listedValue,
        activityRecommendation: '',
      }

      card.activityRecommendation = recommendationForUser(card)
      return card
    })
    .filter((card) => {
      const approvalStatus = card.summary?.approval_status ?? 'pending'
      return approvalStatus !== 'approved'
    })
    .sort((left, right) => {
      const leftTime = left.firstSeenAt ? new Date(left.firstSeenAt).getTime() : 0
      const rightTime = right.firstSeenAt ? new Date(right.firstSeenAt).getTime() : 0
      return rightTime - leftTime
    })

  const pendingCount = approvalCards.filter(
    (card) => (card.summary?.approval_status ?? 'pending') === 'pending'
  ).length
  const reviewCount = approvalCards.filter(
    (card) => (card.summary?.approval_status ?? 'pending') === 'under_review'
  ).length
  const deniedCount = approvalCards.filter(
    (card) => (card.summary?.approval_status ?? 'pending') === 'denied'
  ).length

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-400">New User Cards</div>
          <div className="mt-2 text-3xl font-semibold text-white">{approvalCards.length}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-400">Pending Approval</div>
          <div className="mt-2 text-3xl font-semibold text-sky-200">{pendingCount}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-400">Under Review</div>
          <div className="mt-2 text-3xl font-semibold text-amber-200">{reviewCount}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-400">Denied</div>
          <div className="mt-2 text-3xl font-semibold text-red-300">{deniedCount}</div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">New User Approval Queue</h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Review fresh signups with zero-party self-submitted profile data and first-party marketplace activity so early testers can be quickly moved into an approved state.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/verifications"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Open verifications
            </Link>
            <Link
              href="/settings/profile"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Open my profile
            </Link>
          </div>
        </div>

        {schemaMissing ? (
          <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            Run <code>docs/sql/user-profiles-and-trust.sql</code> and <code>docs/sql/profile-approval-workflow.sql</code> in Supabase to enable the approval queue.
          </div>
        ) : approvalCards.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">
            No unapproved users are in the queue right now.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {approvalCards.slice(0, 50).map((card) => {
              const internalValidation = calculateInternalValidationSummary(
                card.summary,
                card.profile,
                card.privateProfile
              )
              const externalLinks = marketplaceLinks(card.profile)
              const approvalStatus = card.summary?.approval_status ?? 'pending'

              return (
                <div key={card.userId} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-semibold text-white">{card.title}</div>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${approvalTone(approvalStatus)}`}
                        >
                          {formatApprovalStatus(approvalStatus)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-300">
                          {card.activityRecommendation}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-zinc-400">
                        {card.subtitle} · First seen {formatTimestamp(card.firstSeenAt)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-right">
                      <div className="text-xs uppercase tracking-wide text-emerald-100/70">
                        Internal Validation
                      </div>
                      <div className="mt-1 text-lg font-semibold text-emerald-300">
                        {internalValidation.score}
                      </div>
                      <div className="text-xs text-emerald-100/80">{internalValidation.tier}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Decks</div>
                          <div className="mt-2 text-lg font-semibold text-white">{card.decks.length}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Imported</div>
                          <div className="mt-2 text-lg font-semibold text-white">{card.importedDeckCount}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Offer Activity</div>
                          <div className="mt-2 text-lg font-semibold text-white">{card.offerCount}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Completed Trades</div>
                          <div className="mt-2 text-lg font-semibold text-white">{card.completedTrades}</div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">DeckSwap Live</div>
                          <div className="mt-2 text-sm font-medium text-white">{card.liveDeckSwapCount}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Buy It Now Live</div>
                          <div className="mt-2 text-sm font-medium text-white">{card.liveBuyNowCount}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Listed Value</div>
                          <div className="mt-2 text-sm font-medium text-emerald-300">{formatCurrency(card.listedValue)}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Ship From</div>
                          <div className="mt-2 text-sm font-medium text-white">{formatShipFrom(card.profile)}</div>
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Zero-Party Profile Data</div>
                          <div className="mt-3 space-y-2 text-sm text-zinc-300">
                            <p>Display name: {card.profile?.display_name?.trim() || 'Not set'}</p>
                            <p>Username: {card.profile?.username?.trim() ? `@${card.profile.username.trim()}` : 'Not set'}</p>
                            <p>Tagline: {card.profile?.marketplace_tagline?.trim() || 'Not set'}</p>
                            <p>Support email: {card.privateProfile?.support_email?.trim() || 'Not set'}</p>
                            <p>Shipping city: {card.privateProfile?.shipping_city?.trim() || 'Not set'}</p>
                            <p>Shipping country: {card.privateProfile?.shipping_country?.trim() || 'Not set'}</p>
                            <p>Marketing opt-in: {card.privateProfile?.marketing_opt_in_email ? 'Yes' : 'No'}</p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">First-Party Platform Signals</div>
                          <div className="mt-3 space-y-2 text-sm text-zinc-300">
                            <p>Last seen: {formatTimestamp(card.summary?.last_seen_at)}</p>
                            <p>Last login IP country: {card.summary?.last_login_ip_country || 'Not recorded'}</p>
                            <p>Avg. reply hours: {card.summary?.avg_trade_reply_hours ?? 'Not recorded'}</p>
                            <p>Known user: {card.summary?.is_known_user ? 'Yes' : 'No'}</p>
                            <p>Manual verification: {card.summary?.is_manually_verified ? 'Yes' : 'No'}</p>
                            <p>Current ban status: {card.summary?.banned_status || 'active'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs uppercase tracking-wide text-zinc-500">Verification Requests</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {card.verifications.length > 0 ? (
                            card.verifications.map((verification) => (
                              <span
                                key={verification.id}
                                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200"
                              >
                                {verification.verification_type.replace(/_/g, ' ')}: {verification.status || 'pending'}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-zinc-400">No verification requests yet</span>
                          )}
                        </div>
                        {card.summary?.manual_review_notes && (
                          <p className="mt-3 text-sm text-zinc-400">
                            Internal note: {card.summary.manual_review_notes}
                          </p>
                        )}
                      </div>

                      {externalLinks.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {externalLinks.map((link) => (
                            <a
                              key={`${card.userId}-${link.label}`}
                              href={link.href}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-200 hover:bg-black/30"
                            >
                              {link.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    <form action={reviewApprovalAction} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <input type="hidden" name="target_user_id" value={card.userId} />
                      <div className="text-sm font-medium text-white">Approval Decision</div>

                      <label className="mt-4 block text-sm text-zinc-400">Decision</label>
                      <select
                        name="decision"
                        defaultValue={approvalStatus}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="under_review">Under Review</option>
                        <option value="approved">Approved</option>
                        <option value="denied">Denied</option>
                      </select>

                      <label className="mt-4 block text-sm text-zinc-400">Approval Notes</label>
                      <textarea
                        name="approval_notes"
                        rows={7}
                        defaultValue={card.summary?.approval_notes ?? ''}
                        placeholder="Add a quick internal note about why this user is approved, denied, or still under review."
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white"
                      />

                      <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/70 p-4 text-sm text-zinc-300">
                        <p>Approved at: {formatTimestamp(card.summary?.approved_at)}</p>
                        <p className="mt-2">
                          Approval sets this user up as a known early tester for internal trust handling.
                        </p>
                      </div>

                      <FormActionButton
                        pendingLabel="Saving..."
                        className="mt-5 w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-medium text-zinc-950 disabled:cursor-wait disabled:opacity-70"
                      >
                        Save Approval Decision
                      </FormActionButton>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
