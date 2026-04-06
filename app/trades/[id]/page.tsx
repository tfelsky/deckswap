import Link from 'next/link'
import { redirect } from 'next/navigation'
import FormActionButton from '@/components/form-action-button'
import {
  markTradeCompletedAction,
  markTradeDisputedAction,
  markTradePaidAction,
  markTradeReceivedAction,
  markTradeShippedAction,
  overrideTradeShippedForTestingAction,
  requestTradePaymentAction,
} from '@/app/trade-actions'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  createAdminClientOrNull,
} from '@/lib/supabase/admin'
import {
  createClient,
} from '@/lib/supabase/server'
import {
  deriveTradeStatus,
  formatInspectionStatus,
  formatPaymentStatus,
  formatShipmentStatus,
  formatTradeStatus,
  isEscrowSchemaMissing,
  type EscrowEventRow,
  type TradeParticipantRow,
  type TradeTransactionRow,
} from '@/lib/escrow/foundation'
import { formatShipFrom, isProfileSchemaMissing, type PublicProfile, type ReputationSummary } from '@/lib/profiles'

export const dynamic = 'force-dynamic'

type AdminTradeDeckSummary = {
  id: number
  name: string
  commander?: string | null
  image_url?: string | null
}

type AdminTradeProfileSummary = PublicProfile & {
  created_at?: string | null
}

type AdminTradeReputationSummary = Pick<
  ReputationSummary,
  | 'user_id'
  | 'last_seen_at'
  | 'internal_validation_score'
  | 'internal_validation_tier'
  | 'approved_at'
  | 'completed_trades_count'
  | 'avg_trade_reply_hours'
  | 'last_login_ip_country'
  | 'is_manually_verified'
  | 'is_known_user'
  | 'banned_status'
>

function formatUsd(value?: number | null) {
  return `$${Number(value ?? 0).toFixed(2)}`
}

function sideLabel(side: 'a' | 'b') {
  return side === 'a' ? 'Trader A' : 'Trader B'
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

function formatDateOnly(value?: string | null) {
  if (!value) return 'Not recorded'
  return new Date(value).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatLastActive(value?: string | null) {
  if (!value) return 'Not recorded'
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 'Not recorded'

  const deltaMs = Date.now() - timestamp
  const deltaHours = Math.floor(deltaMs / (1000 * 60 * 60))
  const deltaDays = Math.floor(deltaHours / 24)

  if (deltaHours < 1) return 'Within the last hour'
  if (deltaHours < 24) return `${deltaHours}h ago`
  if (deltaDays < 30) return `${deltaDays}d ago`

  return formatDateOnly(value)
}

function formatUserLabel(profile?: PublicProfile | null, userId?: string | null) {
  if (profile?.display_name?.trim()) return profile.display_name.trim()
  if (profile?.username?.trim()) return `@${profile.username.trim()}`
  if (userId) return `${userId.slice(0, 8)}...`
  return 'Unassigned trader'
}

function getMemberSince(
  profile?: AdminTradeProfileSummary | null,
  summary?: AdminTradeReputationSummary | null
) {
  return summary?.approved_at ?? profile?.created_at ?? null
}

function getDeckHeadline(deck?: AdminTradeDeckSummary | null) {
  if (!deck) return 'Deck not linked yet'
  return deck.commander?.trim() || deck.name
}

function getDeckSubline(deck?: AdminTradeDeckSummary | null) {
  if (!deck) return 'No deck metadata recorded'
  if (deck.commander?.trim() && deck.name.trim() !== deck.commander.trim()) {
    return deck.name
  }
  return `Deck #${deck.id}`
}

function getParticipantNextStep(participant: TradeParticipantRow) {
  if (!participant.user_id) return 'Repair the user linkage before this side can progress.'
  if (participant.payment_status !== 'paid') return 'Waiting for payment confirmation before shipping can start.'
  if (participant.shipment_status === 'not_shipped') return 'Prompt this trader to ship to the hub and upload tracking.'
  if (participant.shipment_status === 'shipped') return 'Watch for intake and mark the deck received when it arrives.'
  if (participant.inspection_status !== 'passed') return 'Run warehouse intake and inspection before release.'
  return 'This side is clear and waiting on the other side or final release.'
}

function eventTitle(eventType: string) {
  return eventType.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function eventDetails(event: EscrowEventRow) {
  const data = (event.event_data ?? {}) as Record<string, unknown>
  const details: string[] = []

  const side = typeof data.side === 'string' ? data.side.toUpperCase() : null
  const reason = typeof data.reason === 'string' ? data.reason.trim() : ''
  const overrideType = typeof data.overrideType === 'string' ? data.overrideType.trim() : ''
  const trackingCode = typeof data.trackingCode === 'string' ? data.trackingCode.trim() : ''
  const inspectionNotes = typeof data.inspectionNotes === 'string' ? data.inspectionNotes.trim() : ''
  const discrepancyUsd =
    typeof data.discrepancyUsd === 'number' ? data.discrepancyUsd : Number.NaN
  const highValueAuthenticityFlags =
    typeof data.highValueAuthenticityFlags === 'number' ? data.highValueAuthenticityFlags : Number.NaN
  const deckLevelFlags = Array.isArray(data.deckLevelFlags)
    ? data.deckLevelFlags.filter((flag): flag is string => typeof flag === 'string' && flag.trim().length > 0)
    : []

  if (side) {
    details.push(`Side ${side}`)
  }

  if (trackingCode) {
    details.push(`Tracking ${trackingCode}`)
  }

  if (reason) {
    details.push(`Reason: ${reason}`)
  }

  if (overrideType) {
    details.push(`Flow: ${overrideType.replace(/_/g, ' ')}`)
  }

  if (inspectionNotes) {
    details.push(`Inspection notes: ${inspectionNotes}`)
  }

  if (Number.isFinite(discrepancyUsd)) {
    details.push(`Value discrepancy: ${formatUsd(discrepancyUsd)}`)
  }

  if (Number.isFinite(highValueAuthenticityFlags) && highValueAuthenticityFlags > 0) {
    details.push(`High-value authenticity flags: ${highValueAuthenticityFlags}`)
  }

  for (const flag of deckLevelFlags.slice(0, 3)) {
    details.push(flag)
  }

  return details
}

export default async function TradeReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tradeId = Number(id)

  if (!Number.isFinite(tradeId)) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Invalid trade ID</h1>
        </div>
      </main>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const access = await getAdminAccessForUser(user)
  const adminSupabase = createAdminClientOrNull() ?? supabase

  const [tradeResult, participantResult, eventResult] = await Promise.all([
    adminSupabase.from('trade_transactions').select('*').eq('id', tradeId).maybeSingle(),
    adminSupabase
      .from('trade_transaction_participants')
      .select('*')
      .eq('transaction_id', tradeId)
      .order('side', { ascending: true }),
    adminSupabase
      .from('escrow_events')
      .select('*')
      .eq('transaction_id', tradeId)
      .order('created_at', { ascending: false }),
  ])

  if (!tradeResult.data) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Trade not found</h1>
          <p className="mt-3 text-sm text-zinc-300">
            {isEscrowSchemaMissing(tradeResult.error?.message)
              ? 'Run docs/sql/escrow-transaction-foundation.sql in Supabase to enable persistent trades.'
              : tradeResult.error?.message ?? 'No transaction record exists for this ID.'}
          </p>
        </div>
      </main>
    )
  }

  const trade = tradeResult.data as TradeTransactionRow
  const participants = (participantResult.data ?? []) as TradeParticipantRow[]
  const events = (eventResult.data ?? []) as EscrowEventRow[]
  const currentStatus = deriveTradeStatus(trade, participants)
  const isParticipant = participants.some((participant) => participant.user_id === user.id)

  const participantUserIds = Array.from(
    new Set(participants.map((participant) => participant.user_id).filter((value): value is string => !!value))
  )
  const deckIds = Array.from(
    new Set(participants.map((participant) => Number(participant.deck_id)).filter((value) => Number.isFinite(value)))
  )

  const [profilesResult, reputationResult, decksResult] = await Promise.all([
    participantUserIds.length > 0
      ? adminSupabase
          .from('profiles')
          .select('user_id, display_name, username, location_country, location_region, created_at')
          .in('user_id', participantUserIds)
      : Promise.resolve({ data: [] as AdminTradeProfileSummary[], error: null as { message?: string } | null }),
    participantUserIds.length > 0
      ? adminSupabase
          .from('profile_reputation_summary')
          .select('user_id, last_seen_at, internal_validation_score, internal_validation_tier, approved_at, completed_trades_count, avg_trade_reply_hours, last_login_ip_country, is_manually_verified, is_known_user, banned_status')
          .in('user_id', participantUserIds)
      : Promise.resolve({ data: [] as AdminTradeReputationSummary[], error: null as { message?: string } | null }),
    deckIds.length > 0
      ? adminSupabase.from('decks').select('id, name, commander, image_url').in('id', deckIds)
      : Promise.resolve({ data: [] as AdminTradeDeckSummary[], error: null as { message?: string } | null }),
  ])

  const profilesByUser = new Map<string, AdminTradeProfileSummary>(
    isProfileSchemaMissing(profilesResult.error?.message)
      ? []
      : ((profilesResult.data ?? []) as AdminTradeProfileSummary[]).map((profile) => [profile.user_id, profile])
  )
  const reputationByUser = new Map<string, AdminTradeReputationSummary>(
    isProfileSchemaMissing(reputationResult.error?.message)
      ? []
      : ((reputationResult.data ?? []) as AdminTradeReputationSummary[]).map((summary) => [summary.user_id, summary])
  )
  const decksById = new Map<number, AdminTradeDeckSummary>(
    ((decksResult.data ?? []) as AdminTradeDeckSummary[]).map((deck) => [deck.id, deck])
  )

  if (!access.isAdmin) {
    if (isParticipant) {
      redirect(`/trade-drafts/${tradeId}`)
    }

    redirect('/trades')
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap gap-3">
            <Link href="/trades" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">
              {'<-'} Back to Trade Review
            </Link>
            <Link href={`/trade-drafts/${trade.id}`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
                Open Trade Deal
            </Link>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium tracking-wide text-amber-300">
                Admin Trade Review
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">Trade #{trade.id}</h1>
              <p className="mt-3 max-w-3xl text-zinc-400">
                Internal escrow review for payment readiness, inbound shipment, inspection, and release control.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="text-sm text-zinc-400">Status</div>
              <div className="mt-2 text-3xl font-semibold text-white">{formatTradeStatus(currentStatus)}</div>
              <div className="mt-4 rounded-2xl border border-amber-400/15 bg-amber-400/10 p-4 text-sm text-amber-50/90">
                {currentStatus === 'awaiting_payment' || currentStatus === 'draft'
                  ? 'Internal next step: open or monitor checkout, confirm both sides understand the payment lane, and keep user-facing details contained to the trade deal page.'
                  : currentStatus === 'awaiting_shipments'
                    ? 'Internal next step: wait for both shipment confirmations, then track inbound receipt at the hub.'
                    : currentStatus === 'in_transit'
                      ? 'Internal next step: confirm both decks land at the hub and mark receipt side-by-side.'
                      : currentStatus === 'in_inspection'
                        ? 'Internal next step: inspect both decks against the recorded obligations and log pass/fail notes.'
                      : currentStatus === 'ready_to_release'
                          ? 'Internal next step: finalize review and close the transaction once both decks are cleared.'
                          : currentStatus === 'disputed'
                            ? 'Internal next step: keep the user draft paused, review the latest notes and timeline, and route the case through support before release or completion.'
                          : 'This trade is currently being handled in the admin operations lane.'}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Equalization</div>
                  <div className="mt-2 text-sm font-medium text-white">{formatUsd(trade.equalization_amount_usd)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Platform Gross</div>
                  <div className="mt-2 text-sm font-medium text-amber-300">{formatUsd(trade.platform_gross_usd)}</div>
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Payment requested</div>
                  <div className="mt-2">{formatTimestamp(trade.payment_requested_at)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Ready to release</div>
                  <div className="mt-2">{formatTimestamp(trade.release_ready_at)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Participant Ledger</h2>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {participants.map((participant) => (
                  <div key={participant.side} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    {(() => {
                      const profile = profilesByUser.get(participant.user_id ?? '')
                      const reputation = reputationByUser.get(participant.user_id ?? '')
                      const deck = participant.deck_id ? decksById.get(Number(participant.deck_id)) : null
                      const trustScore =
                        typeof reputation?.internal_validation_score === 'number'
                          ? Math.round(reputation.internal_validation_score)
                          : null
                      const profileHref = profile?.username?.trim() ? `/u/${profile.username.trim()}` : null

                      return (
                        <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-semibold text-white">{sideLabel(participant.side)}</div>
                      <div className="text-sm text-zinc-400">{formatPaymentStatus(participant.payment_status)}</div>
                    </div>
                    <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-4">
                      <div className="flex gap-4">
                        <div className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
                          {deck?.image_url ? (
                            <img
                              src={deck.image_url}
                              alt={getDeckHeadline(deck)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {profileHref ? (
                              <Link href={profileHref} className="text-base font-semibold text-white hover:text-sky-200">
                                {formatUserLabel(profile, participant.user_id)}
                              </Link>
                            ) : (
                              <div className="text-base font-semibold text-white">
                                {formatUserLabel(profile, participant.user_id)}
                              </div>
                            )}
                            {trustScore != null ? (
                              <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-[11px] uppercase tracking-wide text-sky-100">
                                Trust {trustScore}/100
                              </span>
                            ) : null}
                            {reputation?.banned_status && reputation.banned_status !== 'active' ? (
                              <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] uppercase tracking-wide text-red-100">
                                {reputation.banned_status}
                              </span>
                            ) : null}
                            {reputation?.is_manually_verified ? (
                              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] uppercase tracking-wide text-emerald-100">
                                Verified
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-sm text-zinc-300">{getDeckHeadline(deck)}</div>
                          <div className="mt-1 text-xs text-zinc-500">{getDeckSubline(deck)}</div>
                          <div className="mt-3 text-sm text-zinc-400">{getParticipantNextStep(participant)}</div>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Last active</div>
                          <div className="mt-1 text-sm text-white">{formatLastActive(reputation?.last_seen_at)}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Member since</div>
                          <div className="mt-1 text-sm text-white">{formatDateOnly(getMemberSince(profile, reputation))}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Completed trades</div>
                          <div className="mt-1 text-sm text-white">{reputation?.completed_trades_count ?? 0}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Avg. reply time</div>
                          <div className="mt-1 text-sm text-white">
                            {reputation?.avg_trade_reply_hours != null
                              ? `${reputation.avg_trade_reply_hours}h`
                              : 'Not recorded'}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Ship from</div>
                          <div className="mt-1 text-sm text-white">{formatShipFrom(profile)}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">Last login IP country</div>
                          <div className="mt-1 text-sm text-white">{reputation?.last_login_ip_country || 'Not recorded'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-zinc-300">
                      <div className="flex items-center justify-between">
                        <span>Deck value</span>
                        <span>{formatUsd(participant.deck_value_usd)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Matching fee</span>
                        <span>{formatUsd(participant.matching_fee_usd)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Shipping</span>
                        <span>{formatUsd(participant.shipping_usd)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Insurance</span>
                        <span>{formatUsd(participant.insurance_usd)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Flat box + label</span>
                        <span>{formatUsd(participant.packaging_addon_usd)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Equalization owed</span>
                        <span>{formatUsd(participant.equalization_owed_usd)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 font-medium text-white">
                        <span>Amount due</span>
                        <span>{formatUsd(participant.amount_due_usd)}</span>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="text-xs uppercase tracking-wide text-zinc-500">Shipment</div>
                        <div className="mt-1 text-white">{formatShipmentStatus(participant.shipment_status)}</div>
                        {participant.tracking_code ? (
                          <div className="mt-1 text-xs text-zinc-500">Tracking: {participant.tracking_code}</div>
                        ) : null}
                        {participant.shipped_at ? (
                          <div className="mt-1 text-xs text-zinc-500">Shipped: {formatTimestamp(participant.shipped_at)}</div>
                        ) : null}
                        {participant.received_at ? (
                          <div className="mt-1 text-xs text-zinc-500">Received: {formatTimestamp(participant.received_at)}</div>
                        ) : null}
                        {participant.label_box_requested ? (
                          <div className="mt-1 text-xs text-zinc-500">Prepaid flat box kit requested</div>
                        ) : null}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="text-xs uppercase tracking-wide text-zinc-500">Inspection</div>
                        <div className="mt-1 text-white">{formatInspectionStatus(participant.inspection_status)}</div>
                        {participant.payment_marked_at ? (
                          <div className="mt-1 text-xs text-zinc-500">Payment logged: {formatTimestamp(participant.payment_marked_at)}</div>
                        ) : null}
                        {participant.inspection_notes ? (
                          <div className="mt-1 text-xs text-zinc-500">{participant.inspection_notes}</div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {participant.payment_status !== 'paid' ? (
                        <form action={markTradePaidAction} className="flex gap-2">
                          <input type="hidden" name="trade_id" value={trade.id} />
                          <input type="hidden" name="side" value={participant.side} />
                          <input type="hidden" name="return_to" value={`/trades/${trade.id}`} />
                          <FormActionButton
                            pendingLabel="Saving..."
                            className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 disabled:cursor-wait disabled:opacity-70"
                          >
                            Admin mark paid
                          </FormActionButton>
                        </form>
                      ) : null}

                      {participant.payment_status === 'paid' && participant.shipment_status === 'not_shipped' ? (
                        <form action={markTradeShippedAction} className="space-y-2">
                          <input type="hidden" name="trade_id" value={trade.id} />
                          <input type="hidden" name="side" value={participant.side} />
                          <input type="hidden" name="return_to" value={`/trades/${trade.id}`} />
                          <input
                            type="text"
                            name="tracking_code"
                            placeholder="Tracking code (optional)"
                            className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white"
                          />
                          <FormActionButton
                            pendingLabel="Saving..."
                            className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-200 disabled:cursor-wait disabled:opacity-70"
                          >
                            Admin confirm shipped
                          </FormActionButton>
                        </form>
                      ) : null}

                      {participant.shipment_status !== 'shipped' && participant.shipment_status !== 'received' ? (
                        <form action={overrideTradeShippedForTestingAction} className="space-y-2">
                          <input type="hidden" name="trade_id" value={trade.id} />
                          <input type="hidden" name="side" value={participant.side} />
                          <input type="hidden" name="return_to" value={`/trades/${trade.id}`} />
                          <input
                            type="text"
                            name="tracking_code"
                            placeholder="Optional test tracking code"
                            className="w-full rounded-xl border border-fuchsia-400/20 bg-zinc-950 p-3 text-sm text-white"
                          />
                          <textarea
                            name="override_reason"
                            rows={2}
                            required
                            placeholder="Required reason for admin override"
                            className="w-full rounded-xl border border-fuchsia-400/20 bg-zinc-950 p-3 text-sm text-white"
                          />
                          <FormActionButton
                            pendingLabel="Overriding..."
                            className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-2 text-sm font-medium text-fuchsia-100 disabled:cursor-wait disabled:opacity-70"
                          >
                            Admin test override to shipped
                          </FormActionButton>
                        </form>
                      ) : null}

                      {participant.shipment_status === 'shipped' ? (
                        <form action={markTradeReceivedAction}>
                          <input type="hidden" name="trade_id" value={trade.id} />
                          <input type="hidden" name="side" value={participant.side} />
                          <input
                            type="hidden"
                            name="return_to"
                            value={`/admin/logistics/intake/${trade.id}/${participant.side}`}
                          />
                          <FormActionButton
                            pendingLabel="Saving..."
                            className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-70"
                          >
                            Mark received at hub
                          </FormActionButton>
                        </form>
                      ) : null}

                      {participant.shipment_status === 'received' ? (
                        <Link
                          href={`/admin/logistics/intake/${trade.id}/${participant.side}`}
                          className="inline-flex rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-400/15"
                        >
                          Open warehouse intake
                        </Link>
                      ) : null}

                      {participant.shipment_status === 'received' && participant.inspection_status !== 'passed' ? (
                        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                          Warehouse intake is required for received decks. Open the checklist to inspect cards over $5, verify authenticity on higher-value cards, and review sleeve and box condition before release.
                        </div>
                      ) : null}

                      {participant.shipment_status !== 'shipped' && participant.shipment_status !== 'received' ? (
                        <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 p-4 text-sm text-fuchsia-100">
                          Test-only override. This bypasses the normal payment and shipping prerequisites and is meant for admin QA flows.
                        </div>
                      ) : null}

                      {!participant.user_id ? (
                        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                          This side is not attached to a user yet. Keep the trade deal in admin review, then repair the accepted-offer linkage before expecting user-side progress.
                        </div>
                      ) : null}
                    </div>
                        </>
                      )
                    })()}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Operational Notes</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                {(trade.notes ?? []).map((note) => (
                  <p key={note} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    {note}
                  </p>
                ))}
                {trade.dispute_reason ? (
                  <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-100">
                    Dispute: {trade.dispute_reason}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Review Actions</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {currentStatus === 'draft' ? (
                  <form action={requestTradePaymentAction}>
                    <input type="hidden" name="trade_id" value={trade.id} />
                    <input type="hidden" name="return_to" value={`/trades/${trade.id}`} />
                    <FormActionButton
                      pendingLabel="Opening checkout..."
                      className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 disabled:cursor-wait disabled:opacity-70"
                    >
                      Open payment for both sides
                    </FormActionButton>
                  </form>
                ) : null}
                {currentStatus === 'ready_to_release' ? (
                  <form action={markTradeCompletedAction}>
                    <input type="hidden" name="trade_id" value={trade.id} />
                    <input type="hidden" name="return_to" value={`/trades/${trade.id}`} />
                    <FormActionButton
                      pendingLabel="Completing..."
                      className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 disabled:cursor-wait disabled:opacity-70"
                    >
                      Mark completed
                    </FormActionButton>
                  </form>
                ) : null}
                {currentStatus !== 'completed' && currentStatus !== 'cancelled' ? (
                  <form action={markTradeDisputedAction} className="flex-1 min-w-[260px] space-y-2">
                    <input type="hidden" name="trade_id" value={trade.id} />
                    <input type="hidden" name="return_to" value={`/trades/${trade.id}`} />
                    <textarea
                      name="dispute_reason"
                      rows={3}
                      placeholder="Internal dispute note"
                      className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white"
                    />
                    <FormActionButton
                      pendingLabel="Saving..."
                      className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 disabled:cursor-wait disabled:opacity-70"
                    >
                      Mark disputed
                    </FormActionButton>
                  </form>
                ) : null}
                {(currentStatus === 'disputed' || participants.some((participant) => !participant.user_id)) && (
                  <Link
                    href={`/trade-drafts/${trade.id}`}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                  >
                    Open user-facing trade deal
                  </Link>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Timeline</h2>
              <div className="mt-4 space-y-3">
                {events.length > 0 ? (
                  events.map((event) => {
                    const details = eventDetails(event)

                    return (
                    <div key={`${event.event_type}-${event.created_at}-${event.id ?? 0}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-medium text-white">{eventTitle(event.event_type)}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {event.created_at ? new Date(event.created_at).toLocaleString('en-CA') : 'Unknown time'}
                      </div>
                      {details.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {details.map((detail) => (
                            <div
                              key={`${event.id ?? 0}-${detail}`}
                              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300"
                            >
                              {detail}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )})
                ) : (
                  <p className="text-sm text-zinc-400">No events recorded yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Milestone Snapshot</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Payments</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {participants.filter((participant) => participant.payment_status === 'paid').length}/{participants.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Received At Hub</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {participants.filter((participant) => participant.shipment_status === 'received').length}/{participants.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Inspection Passed</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {participants.filter((participant) => participant.inspection_status === 'passed').length}/{participants.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Completed</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {trade.completed_at ? formatTimestamp(trade.completed_at) : 'Not yet'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
