import Link from 'next/link'
import { redirect } from 'next/navigation'
import FormActionButton from '@/components/form-action-button'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { createNotification } from '@/lib/notifications'
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

export const dynamic = 'force-dynamic'

function formatUsd(value?: number | null) {
  return `$${Number(value ?? 0).toFixed(2)}`
}

function sideLabel(side: 'a' | 'b') {
  return side === 'a' ? 'User A' : 'User B'
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

function participantLabel(participant: TradeParticipantRow, userId: string) {
  return participant.user_id === userId ? 'You' : sideLabel(participant.side)
}

export default async function TradeDetailPage({
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
    adminSupabase
      .from('trade_transactions')
      .select('*')
      .eq('id', tradeId)
      .maybeSingle(),
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
  const participantBySide = new Map(participants.map((participant) => [participant.side, participant]))
  const currentStatus = deriveTradeStatus(trade, participants)
  const isCreator = trade.created_by === user.id
  const isParticipant = participants.some((participant) => participant.user_id === user.id)
  const canManageTrade = access.isAdmin || isCreator
  const currentUserParticipant = participants.find((participant) => participant.user_id === user.id) ?? null
  const paymentsComplete = participants.length > 0 && participants.every((participant) => participant.payment_status === 'paid')
  const shipmentsComplete = participants.length > 0 && participants.every((participant) => participant.shipment_status === 'shipped')

  if (!isParticipant && !canManageTrade) {
    redirect('/trades')
  }

  async function requestPaymentAction() {
    'use server'

    const supabase = await createClient()
    const adminSupabase = createAdminClientOrNull() ?? supabase
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/sign-in')

    const access = await getAdminAccessForUser(user)
    const tradeResult = await adminSupabase.from('trade_transactions').select('*').eq('id', tradeId).maybeSingle()
    const participantResult = await adminSupabase
      .from('trade_transaction_participants')
      .select('*')
      .eq('transaction_id', tradeId)

    const trade = tradeResult.data as TradeTransactionRow | null
    const participants = (participantResult.data ?? []) as TradeParticipantRow[]

    if (!trade || (!access.isAdmin && trade.created_by !== user.id)) {
      redirect(`/trades/${tradeId}`)
    }

    const now = new Date().toISOString()
    const nextStatus = 'awaiting_payment'

    await adminSupabase
      .from('trade_transactions')
      .update({
        status: nextStatus,
        payment_requested_at: now,
        updated_at: now,
      })
      .eq('id', tradeId)

    await adminSupabase.from('escrow_events').insert({
      transaction_id: tradeId,
      actor_user_id: user.id,
      event_type: 'payment_requested',
      event_data: {
        requestedAt: now,
      },
    })

    for (const participant of participants) {
      if (!participant.user_id) continue
      await createNotification(supabase, {
        userId: participant.user_id,
        actorUserId: user.id,
        type: 'trade_payment_requested',
        title: 'Trade payment requested',
        body: `Trade #${tradeId} is ready for checkout. Review your amount due, decide whether you want the $20 box kit, and confirm payment.`,
        href: `/trades/${tradeId}`,
        metadata: { tradeId, side: participant.side },
      })
    }

    redirect(`/trades/${tradeId}`)
  }

  async function markPaidAction(formData: FormData) {
    'use server'

    const side = String(formData.get('side') || '') as 'a' | 'b'
    const supabase = await createClient()
    const adminSupabase = createAdminClientOrNull() ?? supabase
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')
    const access = await getAdminAccessForUser(user)

    const participantResult = await adminSupabase
      .from('trade_transaction_participants')
      .select('*')
      .eq('transaction_id', tradeId)
      .eq('side', side)
      .maybeSingle()
    const tradeResult = await adminSupabase.from('trade_transactions').select('*').eq('id', tradeId).maybeSingle()
    const allParticipantsResult = await adminSupabase
      .from('trade_transaction_participants')
      .select('*')
      .eq('transaction_id', tradeId)

    const participant = participantResult.data as TradeParticipantRow | null
    const trade = tradeResult.data as TradeTransactionRow | null
    const allParticipants = (allParticipantsResult.data ?? []) as TradeParticipantRow[]

    if (!participant || !trade) redirect(`/trades/${tradeId}`)

    const canAct = access.isAdmin || trade.created_by === user.id || participant.user_id === user.id
    if (!canAct) redirect(`/trades/${tradeId}`)

    const now = new Date().toISOString()

    await adminSupabase
      .from('trade_transaction_participants')
      .update({
        payment_status: 'paid',
        payment_marked_at: now,
        updated_at: now,
      })
      .eq('transaction_id', tradeId)
      .eq('side', side)

    const refreshedParticipants = allParticipants.map((row) =>
      row.side === side ? { ...row, payment_status: 'paid' as const } : row
    )
    const nextStatus = deriveTradeStatus(trade, refreshedParticipants)

    await adminSupabase
      .from('trade_transactions')
      .update({
        status: nextStatus,
        updated_at: now,
      })
      .eq('id', tradeId)

    await adminSupabase.from('escrow_events').insert({
      transaction_id: tradeId,
      actor_user_id: user.id,
      event_type: 'payment_marked_paid',
      event_data: { side, markedAt: now },
    })

    for (const other of refreshedParticipants) {
      if (!other.user_id || other.user_id === user.id) continue
      await createNotification(supabase, {
        userId: other.user_id,
        actorUserId: user.id,
        type: 'trade_payment_marked_paid',
        title: 'Trade payment confirmed',
        body: `${sideLabel(side)} marked payment on Trade #${tradeId}.`,
        href: `/trades/${tradeId}`,
        metadata: { tradeId, side },
      })
    }

    if (refreshedParticipants.every((row) => row.payment_status === 'paid')) {
      for (const participantRow of refreshedParticipants) {
        if (!participantRow.user_id) continue
        await createNotification(supabase, {
          userId: participantRow.user_id,
          actorUserId: user.id,
          type: 'trade_ready_to_ship',
          title: 'Both payments are in',
          body: 'Both sides have paid. Pack your deck, confirm shipment, and add tracking when it heads to the escrow hub.',
          href: `/trades/${tradeId}`,
          metadata: { tradeId },
        })
      }
    }

    redirect(`/trades/${tradeId}`)
  }

  async function markShippedAction(formData: FormData) {
    'use server'

    const side = String(formData.get('side') || '') as 'a' | 'b'
    const trackingCode = String(formData.get('tracking_code') || '').trim() || null
    const supabase = await createClient()
    const adminSupabase = createAdminClientOrNull() ?? supabase
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')
    const access = await getAdminAccessForUser(user)

    const participantResult = await adminSupabase
      .from('trade_transaction_participants')
      .select('*')
      .eq('transaction_id', tradeId)
      .eq('side', side)
      .maybeSingle()
    const tradeResult = await adminSupabase.from('trade_transactions').select('*').eq('id', tradeId).maybeSingle()
    const allParticipantsResult = await adminSupabase
      .from('trade_transaction_participants')
      .select('*')
      .eq('transaction_id', tradeId)

    const participant = participantResult.data as TradeParticipantRow | null
    const trade = tradeResult.data as TradeTransactionRow | null
    const allParticipants = (allParticipantsResult.data ?? []) as TradeParticipantRow[]

    if (!participant || !trade) redirect(`/trades/${tradeId}`)
    const canAct = access.isAdmin || trade.created_by === user.id || participant.user_id === user.id
    if (!canAct) redirect(`/trades/${tradeId}`)

    const now = new Date().toISOString()

    await adminSupabase
      .from('trade_transaction_participants')
      .update({
        shipment_status: 'shipped',
        tracking_code: trackingCode,
        shipped_at: now,
        updated_at: now,
      })
      .eq('transaction_id', tradeId)
      .eq('side', side)

    const refreshedParticipants = allParticipants.map((row) =>
      row.side === side ? { ...row, shipment_status: 'shipped' as const } : row
    )
    const nextStatus = deriveTradeStatus(trade, refreshedParticipants)

    await adminSupabase
      .from('trade_transactions')
      .update({
        status: nextStatus,
        updated_at: now,
      })
      .eq('id', tradeId)

    await adminSupabase.from('escrow_events').insert({
      transaction_id: tradeId,
      actor_user_id: user.id,
      event_type: 'shipment_marked_sent',
      event_data: { side, trackingCode, shippedAt: now },
    })

    for (const other of refreshedParticipants) {
      if (!other.user_id || other.user_id === user.id) continue
      await createNotification(supabase, {
        userId: other.user_id,
        actorUserId: user.id,
        type: 'trade_shipment_marked_sent',
        title: 'Shipment confirmed',
        body: `${sideLabel(side)} marked their deck as shipped${trackingCode ? ` with tracking ${trackingCode}` : ''}.`,
        href: `/trades/${tradeId}`,
        metadata: { tradeId, side, trackingCode },
      })
    }

    if (refreshedParticipants.every((row) => row.shipment_status === 'shipped')) {
      for (const participantRow of refreshedParticipants) {
        if (!participantRow.user_id) continue
        await createNotification(supabase, {
          userId: participantRow.user_id,
          actorUserId: user.id,
          type: 'trade_both_shipments_confirmed',
          title: 'Both decks are in transit',
          body: 'Both traders have confirmed shipment. The next checkpoint is receipt at the hub.',
          href: `/trades/${tradeId}`,
          metadata: { tradeId },
        })
      }
    }

    redirect(`/trades/${tradeId}`)
  }

  async function markReceivedAction(formData: FormData) {
    'use server'

    const side = String(formData.get('side') || '') as 'a' | 'b'
    const supabase = await createClient()
    const adminSupabase = createAdminClientOrNull() ?? supabase
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')
    const access = await getAdminAccessForUser(user)
    if (!access.isAdmin) redirect(`/trades/${tradeId}`)

    const tradeResult = await adminSupabase.from('trade_transactions').select('*').eq('id', tradeId).maybeSingle()
    const allParticipantsResult = await adminSupabase
      .from('trade_transaction_participants')
      .select('*')
      .eq('transaction_id', tradeId)

    const trade = tradeResult.data as TradeTransactionRow | null
    const allParticipants = (allParticipantsResult.data ?? []) as TradeParticipantRow[]
    if (!trade) redirect(`/trades/${tradeId}`)

    const now = new Date().toISOString()

    await adminSupabase
      .from('trade_transaction_participants')
      .update({
        shipment_status: 'received',
        received_at: now,
        updated_at: now,
      })
      .eq('transaction_id', tradeId)
      .eq('side', side)

    const refreshedParticipants = allParticipants.map((row) =>
      row.side === side ? { ...row, shipment_status: 'received' as const } : row
    )
    const nextStatus = deriveTradeStatus(trade, refreshedParticipants)

    await adminSupabase
      .from('trade_transactions')
      .update({
        status: nextStatus,
        updated_at: now,
      })
      .eq('id', tradeId)

    await adminSupabase.from('escrow_events').insert({
      transaction_id: tradeId,
      actor_user_id: user.id,
      event_type: 'shipment_received_at_escrow',
      event_data: { side, receivedAt: now },
    })

    redirect(`/trades/${tradeId}`)
  }

  async function markInspectionAction(formData: FormData) {
    'use server'

    const side = String(formData.get('side') || '') as 'a' | 'b'
    const inspectionStatus = String(formData.get('inspection_status') || 'passed') as 'passed' | 'failed'
    const inspectionNotes = String(formData.get('inspection_notes') || '').trim() || null
    const supabase = await createClient()
    const adminSupabase = createAdminClientOrNull() ?? supabase
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')
    const access = await getAdminAccessForUser(user)
    if (!access.isAdmin) redirect(`/trades/${tradeId}`)

    const tradeResult = await adminSupabase.from('trade_transactions').select('*').eq('id', tradeId).maybeSingle()
    const allParticipantsResult = await adminSupabase
      .from('trade_transaction_participants')
      .select('*')
      .eq('transaction_id', tradeId)

    const trade = tradeResult.data as TradeTransactionRow | null
    const allParticipants = (allParticipantsResult.data ?? []) as TradeParticipantRow[]
    if (!trade) redirect(`/trades/${tradeId}`)

    const now = new Date().toISOString()
    await adminSupabase
      .from('trade_transaction_participants')
      .update({
        inspection_status: inspectionStatus,
        inspection_notes: inspectionNotes,
        updated_at: now,
      })
      .eq('transaction_id', tradeId)
      .eq('side', side)

    const refreshedParticipants = allParticipants.map((row) =>
      row.side === side ? { ...row, inspection_status: inspectionStatus } : row
    )
    const nextStatus = inspectionStatus === 'failed' ? 'disputed' : deriveTradeStatus(trade, refreshedParticipants)

    await adminSupabase
      .from('trade_transactions')
      .update({
        status: nextStatus,
        release_ready_at: nextStatus === 'ready_to_release' ? now : trade.release_ready_at ?? null,
        dispute_reason: inspectionStatus === 'failed' ? inspectionNotes : trade.dispute_reason ?? null,
        updated_at: now,
      })
      .eq('id', tradeId)

    await adminSupabase.from('escrow_events').insert({
      transaction_id: tradeId,
      actor_user_id: user.id,
      event_type: inspectionStatus === 'failed' ? 'inspection_failed' : 'inspection_passed',
      event_data: { side, inspectionNotes, inspectedAt: now },
    })

    redirect(`/trades/${tradeId}`)
  }

  async function markCompletedAction() {
    'use server'

    const supabase = await createClient()
    const adminSupabase = createAdminClientOrNull() ?? supabase
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')
    const access = await getAdminAccessForUser(user)

    const tradeResult = await adminSupabase.from('trade_transactions').select('*').eq('id', tradeId).maybeSingle()
    const trade = tradeResult.data as TradeTransactionRow | null
    if (!trade || (!access.isAdmin && trade.created_by !== user.id)) {
      redirect(`/trades/${tradeId}`)
    }

    const now = new Date().toISOString()
    await adminSupabase
      .from('trade_transactions')
      .update({
        status: 'completed',
        completed_at: now,
        updated_at: now,
      })
      .eq('id', tradeId)

    await adminSupabase.from('escrow_events').insert({
      transaction_id: tradeId,
      actor_user_id: user.id,
      event_type: 'trade_completed',
      event_data: { completedAt: now },
    })

    for (const participant of participants) {
      if (!participant.user_id || participant.user_id === user.id) continue
      await createNotification(supabase, {
        userId: participant.user_id,
        actorUserId: user.id,
        type: 'trade_completed',
        title: 'Trade completed',
        body: `Trade #${tradeId} was marked completed.`,
        href: `/trades/${tradeId}`,
        metadata: { tradeId },
      })
    }

    redirect(`/trades/${tradeId}`)
  }

  async function markDisputedAction(formData: FormData) {
    'use server'

    const disputeReason = String(formData.get('dispute_reason') || '').trim() || 'Trade manually flagged for dispute.'
    const supabase = await createClient()
    const adminSupabase = createAdminClientOrNull() ?? supabase
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')
    const access = await getAdminAccessForUser(user)
    const tradeResult = await adminSupabase.from('trade_transactions').select('*').eq('id', tradeId).maybeSingle()
    const trade = tradeResult.data as TradeTransactionRow | null
    if (!trade) redirect(`/trades/${tradeId}`)
    if (!access.isAdmin && trade.created_by !== user.id && !participants.some((p) => p.user_id === user.id)) {
      redirect(`/trades/${tradeId}`)
    }

    const now = new Date().toISOString()
    await adminSupabase
      .from('trade_transactions')
      .update({
        status: 'disputed',
        dispute_reason: disputeReason,
        updated_at: now,
      })
      .eq('id', tradeId)

    await adminSupabase.from('escrow_events').insert({
      transaction_id: tradeId,
      actor_user_id: user.id,
      event_type: 'trade_disputed',
      event_data: { disputeReason, disputedAt: now },
    })

    redirect(`/trades/${tradeId}`)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap gap-3">
            <Link href="/trades" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">
              {'<-'} Back to Trades
            </Link>
            <Link href="/checkout-prototype" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
              New Draft
            </Link>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                Live Escrow
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">Trade #{trade.id}</h1>
              <p className="mt-3 max-w-3xl text-zinc-400">
                {trade.lane_type}. This workspace now tracks payment confirmation, inbound shipment, inspection, and release readiness for both sides.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="text-sm text-zinc-400">Status</div>
              <div className="mt-2 text-3xl font-semibold text-white">{formatTradeStatus(currentStatus)}</div>
              <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-4 text-sm text-emerald-50/90">
                {currentStatus === 'awaiting_payment' || currentStatus === 'draft'
                  ? 'Next step: both traders review checkout details, decide on the optional flat box + label add-on, and confirm payment.'
                  : currentStatus === 'awaiting_shipments'
                    ? 'Next step: both traders should pack their decks and confirm shipment to the escrow hub.'
                    : currentStatus === 'in_transit'
                      ? 'Next step: DeckSwap waits for both shipments to arrive at the hub for receipt and inspection.'
                      : currentStatus === 'in_inspection'
                        ? 'Next step: the hub team inspects both decks against the agreed trade record before release.'
                        : currentStatus === 'ready_to_release'
                          ? 'Next step: both decks cleared inspection and the trade can be completed and released.'
                          : 'This trade is active and being tracked through escrow.'}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Equalization</div>
                  <div className="mt-2 text-sm font-medium text-white">{formatUsd(trade.equalization_amount_usd)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Platform Gross</div>
                  <div className="mt-2 text-sm font-medium text-emerald-300">{formatUsd(trade.platform_gross_usd)}</div>
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
              <h2 className="text-2xl font-semibold">Participant Obligations</h2>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {participants.map((participant) => (
                  <div key={participant.side} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-semibold text-white">{sideLabel(participant.side)}</div>
                      <div className="text-sm text-zinc-400">{formatPaymentStatus(participant.payment_status)}</div>
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
                        {participant.tracking_code && (
                          <div className="mt-1 text-xs text-zinc-500">Tracking: {participant.tracking_code}</div>
                        )}
                        {participant.label_box_requested ? (
                          <div className="mt-1 text-xs text-zinc-500">Prepaid flat box kit requested</div>
                        ) : null}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="text-xs uppercase tracking-wide text-zinc-500">Inspection</div>
                        <div className="mt-1 text-white">{formatInspectionStatus(participant.inspection_status)}</div>
                        {participant.inspection_notes && (
                          <div className="mt-1 text-xs text-zinc-500">{participant.inspection_notes}</div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {(participant.user_id === user.id || canManageTrade) && participant.payment_status !== 'paid' && (
                        <form action={markPaidAction} className="flex gap-2">
                          <input type="hidden" name="side" value={participant.side} />
                          <FormActionButton
                            pendingLabel="Saving..."
                            className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 disabled:cursor-wait disabled:opacity-70"
                          >
                            Mark paid
                          </FormActionButton>
                        </form>
                      )}

                      {(participant.user_id === user.id || canManageTrade) && participant.payment_status === 'paid' && participant.shipment_status === 'not_shipped' && (
                        <form action={markShippedAction} className="space-y-2">
                          <input type="hidden" name="side" value={participant.side} />
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
                            Mark shipped to escrow
                          </FormActionButton>
                        </form>
                      )}

                      {access.isAdmin && participant.shipment_status === 'shipped' && (
                        <form action={markReceivedAction}>
                          <input type="hidden" name="side" value={participant.side} />
                          <FormActionButton
                            pendingLabel="Saving..."
                            className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-70"
                          >
                            Mark received at hub
                          </FormActionButton>
                        </form>
                      )}

                      {access.isAdmin && participant.shipment_status === 'received' && participant.inspection_status !== 'passed' && (
                        <form action={markInspectionAction} className="space-y-2">
                          <input type="hidden" name="side" value={participant.side} />
                          <select
                            name="inspection_status"
                            defaultValue="passed"
                            className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white"
                          >
                            <option value="passed">Pass inspection</option>
                            <option value="failed">Fail inspection</option>
                          </select>
                          <textarea
                            name="inspection_notes"
                            rows={3}
                            placeholder="Inspection notes"
                            className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white"
                          />
                          <FormActionButton
                            pendingLabel="Saving..."
                            className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200 disabled:cursor-wait disabled:opacity-70"
                          >
                            Save inspection
                          </FormActionButton>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Operational Readiness</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                {(trade.notes ?? []).map((note) => (
                  <p key={note} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    {note}
                  </p>
                ))}
                {trade.dispute_reason && (
                  <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-100">
                    Dispute: {trade.dispute_reason}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Next Steps</h2>
              {currentUserParticipant ? (
                <div className="mt-4 space-y-3 text-sm text-zinc-300">
                  {(currentStatus === 'draft' || currentStatus === 'awaiting_payment') && (
                    <>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        {participantLabel(currentUserParticipant, user.id)} should review the amount due and decide whether the $20 flat folded box + label add-on is needed for safer outbound packing.
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        After payment is confirmed, this trade automatically moves into shipment readiness and prompts both sides to send decks to the hub.
                      </div>
                    </>
                  )}
                  {currentStatus === 'awaiting_shipments' && (
                    <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sky-100">
                      Payment is complete. Pack your deck, attach tracking if you have it, and confirm shipment to the escrow hub.
                    </div>
                  )}
                  {currentStatus === 'in_transit' && (
                    <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sky-100">
                      Both sides have shipped. We are waiting for the hub to confirm receipt.
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-zinc-400">This trade is visible, but no participant-specific next step could be resolved.</p>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Actions</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {canManageTrade && currentStatus === 'draft' && (
                  <form action={requestPaymentAction}>
                    <FormActionButton
                      pendingLabel="Opening checkout..."
                      className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 disabled:cursor-wait disabled:opacity-70"
                    >
                      Open payment for both sides
                    </FormActionButton>
                  </form>
                )}
                {canManageTrade && currentStatus === 'ready_to_release' && (
                  <form action={markCompletedAction}>
                    <FormActionButton
                      pendingLabel="Completing..."
                      className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 disabled:cursor-wait disabled:opacity-70"
                    >
                      Mark completed
                    </FormActionButton>
                  </form>
                )}
                {(isParticipant || canManageTrade) && currentStatus !== 'completed' && currentStatus !== 'cancelled' && (
                  <form action={markDisputedAction} className="flex-1 min-w-[260px] space-y-2">
                    <textarea
                      name="dispute_reason"
                      rows={3}
                      placeholder="Optional dispute reason"
                      className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white"
                    />
                    <FormActionButton
                      pendingLabel="Saving..."
                      className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 disabled:cursor-wait disabled:opacity-70"
                    >
                      Mark disputed
                    </FormActionButton>
                  </form>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Timeline</h2>
              <div className="mt-4 space-y-3">
                {events.length > 0 ? (
                  events.map((event) => (
                    <div key={`${event.event_type}-${event.created_at}-${event.id ?? 0}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-medium text-white">{event.event_type.replace(/_/g, ' ')}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {event.created_at ? new Date(event.created_at).toLocaleString('en-CA') : 'Unknown time'}
                      </div>
                    </div>
                  ))
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
