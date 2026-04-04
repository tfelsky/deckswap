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
import {
  formatVerificationStatus,
  formatVerificationType,
  isVerificationInQueue,
  verificationStatusTone,
} from '@/lib/profile-verifications'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type VerificationQueueRow = ProfileVerification & {
  id: number
  created_at?: string | null
  updated_at?: string | null
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

export default async function AdminVerificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const access = await getAdminAccessForUser(user)

  if (!user || !access.isAdmin) {
    redirect('/decks')
  }

  async function reviewVerificationAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const access = await getAdminAccessForUser(user)

    if (!user || !access.isAdmin) {
      redirect('/decks')
    }

    const verificationId = Number(formData.get('verification_id'))
    const nextStatus = String(formData.get('status') || 'under_review').trim()
    const reviewNotes = String(formData.get('review_notes') || '').trim()

    if (!Number.isFinite(verificationId)) {
      redirect('/admin/verifications')
    }

    const { data: verificationRow, error: verificationError } = await supabase
      .from('profile_verifications')
      .select('id, user_id, verification_type, status')
      .eq('id', verificationId)
      .maybeSingle()

    if (verificationError || !verificationRow) {
      redirect('/admin/verifications')
    }

    const now = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('profile_verifications')
      .update({
        status: nextStatus,
        reviewed_at: now,
        reviewed_by: user.id,
        review_notes: reviewNotes || null,
        updated_at: now,
      })
      .eq('id', verificationId)

    if (updateError) {
      redirect('/admin/verifications')
    }

    const summaryPayload: Record<string, string | boolean> = {
      user_id: verificationRow.user_id,
      updated_at: now,
    }

    if (verificationRow.verification_type === 'government_id' && nextStatus === 'verified') {
      summaryPayload.is_manually_verified = true
    }

    await supabase
      .from('profile_reputation_summary')
      .upsert(summaryPayload, { onConflict: 'user_id' })

    redirect('/admin/verifications')
  }

  const { data: verificationData, error: verificationError } = await supabase
    .from('profile_verifications')
    .select('id, user_id, verification_type, status, notes, submitted_at, reviewed_at, reviewed_by, review_notes, created_at, updated_at')
    .neq('status', 'not_submitted')
    .order('submitted_at', { ascending: false })
    .order('updated_at', { ascending: false })

  const schemaMissing = isProfileSchemaMissing(verificationError?.message)
  const verifications = schemaMissing || verificationError
    ? ([] as VerificationQueueRow[])
    : ((verificationData ?? []) as VerificationQueueRow[])

  const userIds = [...new Set(verifications.map((item) => item.user_id))]

  const [profilesResult, privateProfilesResult, summariesResult] = userIds.length
    ? await Promise.all([
        supabase.from('profiles').select('*').in('user_id', userIds),
        supabase.from('profile_private').select('*').in('user_id', userIds),
        supabase.from('profile_reputation_summary').select('*').in('user_id', userIds),
      ])
    : [
        { data: [] as PublicProfile[], error: null },
        { data: [] as PrivateProfile[], error: null },
        { data: [] as ReputationSummary[], error: null },
      ]

  const profiles = new Map<string, PublicProfile>(
    (((profilesResult.data ?? []) as PublicProfile[]) ?? []).map((row) => [row.user_id, row])
  )
  const privateProfiles = new Map<string, PrivateProfile>(
    (((privateProfilesResult.data ?? []) as PrivateProfile[]) ?? []).map((row) => [row.user_id, row])
  )
  const summaries = new Map<string, ReputationSummary>(
    (((summariesResult.data ?? []) as ReputationSummary[]) ?? []).map((row) => [row.user_id, row])
  )

  const queuedCount = verifications.filter((item) => isVerificationInQueue(item.status)).length
  const verifiedCount = verifications.filter((item) => item.status === 'verified').length
  const rejectedCount = verifications.filter((item) => item.status === 'rejected').length

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-400">Awaiting Review</div>
          <div className="mt-2 text-3xl font-semibold text-amber-200">{queuedCount}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-400">Verified</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-300">{verifiedCount}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-400">Rejected</div>
          <div className="mt-2 text-3xl font-semibold text-red-300">{rejectedCount}</div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Verification Queue</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Review seller attestation, shipping readiness, and higher-trust ID requests from the profile flow.
            </p>
          </div>
          <Link
            href="/settings/profile"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Open my profile
          </Link>
        </div>

        {schemaMissing ? (
          <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            Run <code>docs/sql/user-profiles-and-trust.sql</code> and the latest verification workflow catch-up SQL to enable the review queue.
          </div>
        ) : verificationError ? (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            Could not load profile verifications: {verificationError.message}
          </div>
        ) : verifications.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">
            No verification requests are in the queue right now.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {verifications.map((verification) => {
              const profile = profiles.get(verification.user_id) ?? null
              const privateProfile = privateProfiles.get(verification.user_id) ?? null
              const summary = summaries.get(verification.user_id) ?? null
              const internalValidation = calculateInternalValidationSummary(summary, profile, privateProfile)
              const links = marketplaceLinks(profile).slice(0, 2)

              return (
                <div key={verification.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-semibold text-white">
                          {profile?.display_name || profile?.username || verification.user_id}
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs ${verificationStatusTone(verification.status)}`}>
                          {formatVerificationStatus(verification.status)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-300">
                          {formatVerificationType(verification.verification_type)}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-zinc-400">
                        {profile?.username ? `@${profile.username}` : 'Username not set'} · {formatShipFrom(profile)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-right">
                      <div className="text-xs uppercase tracking-wide text-emerald-100/70">Internal Validation</div>
                      <div className="mt-1 text-lg font-semibold text-emerald-300">{internalValidation.score}</div>
                      <div className="text-xs text-emerald-100/80">{internalValidation.tier}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs uppercase tracking-wide text-zinc-500">Submitted Notes</div>
                        <p className="mt-2 text-sm text-zinc-200">
                          {verification.notes || 'No submitter note was provided.'}
                        </p>
                        <div className="mt-3 text-xs text-zinc-500">
                          Submitted: {formatTimestamp(verification.submitted_at || verification.created_at)}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Completed Trades</div>
                          <div className="mt-2 text-sm font-medium text-white">{summary?.completed_trades_count ?? 0}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Ship From</div>
                          <div className="mt-2 text-sm font-medium text-white">{formatShipFrom(profile)}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Support Email</div>
                          <div className="mt-2 text-sm font-medium text-white">{privateProfile?.support_email || 'Not set'}</div>
                        </div>
                      </div>

                      {links.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {links.map((link) => (
                            <a
                              key={`${verification.id}-${link.label}`}
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

                    <form action={reviewVerificationAction} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <input type="hidden" name="verification_id" value={verification.id} />
                      <div className="text-sm font-medium text-white">Review Decision</div>
                      <label className="mt-4 block text-sm text-zinc-400">Status</label>
                      <select
                        name="status"
                        defaultValue={verification.status ?? 'submitted'}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under Review</option>
                        <option value="verified">Verified</option>
                        <option value="needs_follow_up">Needs Follow-Up</option>
                        <option value="rejected">Rejected</option>
                      </select>

                      <label className="mt-4 block text-sm text-zinc-400">Review Notes</label>
                      <textarea
                        name="review_notes"
                        rows={5}
                        defaultValue={verification.review_notes ?? ''}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white"
                        placeholder="Add a short internal note for this review."
                      />

                      <div className="mt-3 text-xs text-zinc-500">
                        Last reviewed: {formatTimestamp(verification.reviewed_at)}
                      </div>

                      <FormActionButton
                        pendingLabel="Saving..."
                        className="mt-5 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-medium text-zinc-950 disabled:cursor-wait disabled:opacity-70"
                      >
                        Save Review
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
