'use server'

import { redirect } from 'next/navigation'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { sendUserTransactionalEmailById } from '@/lib/email-events'
import { createNotification } from '@/lib/notifications'
import {
  deriveTradeStatus,
  type TradeParticipantRow,
  type TradeTransactionRow,
} from '@/lib/escrow/foundation'
import { createClient } from '@/lib/supabase/server'

function sideLabel(side: 'a' | 'b') {
  return side === 'a' ? 'Trader A' : 'Trader B'
}

function parseTradeId(formData: FormData) {
  const tradeId = Number(formData.get('trade_id'))
  return Number.isFinite(tradeId) ? tradeId : null
}

function getReviewHref(tradeId: number) {
  return `/trades/${tradeId}`
}

function getDraftHref(tradeId: number) {
  return `/trade-deals/${tradeId}`
}

async function sendTradeEmail(input: {
  userId?: string | null
  subject: string
  body: string
  href: string
  ctaLabel: string
  idempotencyKey: string
  eyebrow?: string
}) {
  if (!input.userId) return

  try {
    await sendUserTransactionalEmailById({
      userId: input.userId,
      subject: input.subject,
      body: input.body,
      href: input.href,
      ctaLabel: input.ctaLabel,
      idempotencyKey: input.idempotencyKey,
      eyebrow: input.eyebrow,
    })
  } catch (error) {
    console.error('Failed to send trade lifecycle email:', error)
  }
}

function getReturnTo(formData: FormData, fallback: string) {
  const candidate = String(formData.get('return_to') || '').trim()
  return candidate.startsWith('/') ? candidate : fallback
}

async function getTradeContext(tradeId: number) {
  const supabase = await createClient()
  const adminSupabase = createAdminClientOrNull() ?? supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const access = await getAdminAccessForUser(user)
  const tradeResult = await adminSupabase.from('trade_transactions').select('*').eq('id', tradeId).maybeSingle()
  const participantResult = await adminSupabase
    .from('trade_transaction_participants')
    .select('*')
    .eq('transaction_id', tradeId)
    .order('side', { ascending: true })

  const trade = tradeResult.data as TradeTransactionRow | null
  const participants = (participantResult.data ?? []) as TradeParticipantRow[]

  return {
    supabase,
    adminSupabase,
    user,
    access,
    trade,
    participants,
    isParticipant: participants.some((participant) => participant.user_id === user.id),
  }
}

export async function requestTradePaymentAction(formData: FormData) {
  const tradeId = parseTradeId(formData)
  if (!tradeId) redirect('/trades')

  const context = await getTradeContext(tradeId)
  const fallback = getReviewHref(tradeId)
  const returnTo = getReturnTo(formData, fallback)

  if (!context.trade || !context.access.isAdmin) {
    redirect(returnTo)
  }

  const now = new Date().toISOString()

  await context.adminSupabase
    .from('trade_transactions')
    .update({
      status: 'awaiting_payment',
      payment_requested_at: now,
      updated_at: now,
    })
    .eq('id', tradeId)

  await context.adminSupabase.from('escrow_events').insert({
    transaction_id: tradeId,
    actor_user_id: context.user.id,
    event_type: 'payment_requested',
    event_data: {
      requestedAt: now,
    },
  })

  for (const participant of context.participants) {
    if (!participant.user_id) continue
    await createNotification(context.supabase, {
      userId: participant.user_id,
      actorUserId: context.user.id,
      type: 'trade_payment_requested',
      title: 'Trade payment requested',
      body: `Trade #${tradeId} is ready for checkout. Review your amount due, decide whether you want the $20 box kit, and confirm payment.`,
      href: getDraftHref(tradeId),
      metadata: { tradeId, side: participant.side },
    })

    await sendTradeEmail({
      userId: participant.user_id,
      subject: 'Trade payment requested',
      body: `Trade #${tradeId} is ready for checkout. Review your amount due, decide whether you want the $20 box kit, and confirm payment.`,
      href: getDraftHref(tradeId),
      ctaLabel: 'Open trade deal',
      idempotencyKey: `trade-payment-requested:${tradeId}:${participant.user_id}`,
      eyebrow: 'Trade payment',
    })
  }

  redirect(returnTo)
}

export async function markTradePaidAction(formData: FormData) {
  const tradeId = parseTradeId(formData)
  if (!tradeId) redirect('/trades')

  const side = String(formData.get('side') || '') as 'a' | 'b'
  const context = await getTradeContext(tradeId)
  const fallback = context.access.isAdmin ? getReviewHref(tradeId) : getDraftHref(tradeId)
  const returnTo = getReturnTo(formData, fallback)
  const participant = context.participants.find((row) => row.side === side) ?? null

  if (!context.trade || !participant) {
    redirect(returnTo)
  }

  const canAct = context.access.isAdmin || participant.user_id === context.user.id
  if (!canAct) {
    redirect(returnTo)
  }

  const now = new Date().toISOString()

  await context.adminSupabase
    .from('trade_transaction_participants')
    .update({
      payment_status: 'paid',
      payment_marked_at: now,
      updated_at: now,
    })
    .eq('transaction_id', tradeId)
    .eq('side', side)

  const refreshedParticipants = context.participants.map((row) =>
    row.side === side ? { ...row, payment_status: 'paid' as const } : row
  )
  const nextStatus = deriveTradeStatus(context.trade, refreshedParticipants)

  await context.adminSupabase
    .from('trade_transactions')
    .update({
      status: nextStatus,
      updated_at: now,
    })
    .eq('id', tradeId)

  await context.adminSupabase.from('escrow_events').insert({
    transaction_id: tradeId,
    actor_user_id: context.user.id,
    event_type: 'payment_marked_paid',
    event_data: { side, markedAt: now },
  })

  for (const other of refreshedParticipants) {
    if (!other.user_id || other.user_id === context.user.id) continue
    await createNotification(context.supabase, {
      userId: other.user_id,
      actorUserId: context.user.id,
      type: 'trade_payment_marked_paid',
      title: 'Trade payment confirmed',
      body: `${sideLabel(side)} confirmed payment on Trade #${tradeId}.`,
      href: getDraftHref(tradeId),
      metadata: { tradeId, side },
    })

    await sendTradeEmail({
      userId: other.user_id,
      subject: 'Trade payment confirmed',
      body: `${sideLabel(side)} confirmed payment on Trade #${tradeId}.`,
      href: getDraftHref(tradeId),
      ctaLabel: 'Review trade deal',
      idempotencyKey: `trade-payment-confirmed:${tradeId}:${side}:${other.user_id}`,
      eyebrow: 'Trade payment',
    })
  }

  if (refreshedParticipants.every((row) => row.payment_status === 'paid')) {
    for (const participantRow of refreshedParticipants) {
      if (!participantRow.user_id) continue
      await createNotification(context.supabase, {
        userId: participantRow.user_id,
        actorUserId: context.user.id,
        type: 'trade_ready_to_ship',
        title: 'Both payments are in',
        body: 'Both sides have paid. Pack your deck, confirm shipment, and add tracking when it heads to the escrow hub.',
        href: getDraftHref(tradeId),
        metadata: { tradeId },
      })

      await sendTradeEmail({
        userId: participantRow.user_id,
        subject: 'Both payments are in',
        body: 'Both sides have paid. Pack your deck, confirm shipment, and add tracking when it heads to the escrow hub.',
        href: getDraftHref(tradeId),
        ctaLabel: 'Open shipment checklist',
        idempotencyKey: `trade-ready-to-ship:${tradeId}:${participantRow.user_id}`,
        eyebrow: 'Trade ready',
      })
    }
  }

  redirect(returnTo)
}

export async function markTradeShippedAction(formData: FormData) {
  const tradeId = parseTradeId(formData)
  if (!tradeId) redirect('/trades')

  const side = String(formData.get('side') || '') as 'a' | 'b'
  const trackingCode = String(formData.get('tracking_code') || '').trim() || null
  const context = await getTradeContext(tradeId)
  const fallback = context.access.isAdmin ? getReviewHref(tradeId) : getDraftHref(tradeId)
  const returnTo = getReturnTo(formData, fallback)
  const participant = context.participants.find((row) => row.side === side) ?? null

  if (!context.trade || !participant) {
    redirect(returnTo)
  }

  const canAct = context.access.isAdmin || participant.user_id === context.user.id
  if (!canAct) {
    redirect(returnTo)
  }

  const now = new Date().toISOString()

  await context.adminSupabase
    .from('trade_transaction_participants')
    .update({
      shipment_status: 'shipped',
      tracking_code: trackingCode,
      shipped_at: now,
      updated_at: now,
    })
    .eq('transaction_id', tradeId)
    .eq('side', side)

  const refreshedParticipants = context.participants.map((row) =>
    row.side === side ? { ...row, shipment_status: 'shipped' as const, tracking_code: trackingCode } : row
  )
  const nextStatus = deriveTradeStatus(context.trade, refreshedParticipants)

  await context.adminSupabase
    .from('trade_transactions')
    .update({
      status: nextStatus,
      updated_at: now,
    })
    .eq('id', tradeId)

  await context.adminSupabase.from('escrow_events').insert({
    transaction_id: tradeId,
    actor_user_id: context.user.id,
    event_type: 'shipment_marked_sent',
    event_data: { side, trackingCode, shippedAt: now },
  })

  for (const other of refreshedParticipants) {
    if (!other.user_id || other.user_id === context.user.id) continue
    await createNotification(context.supabase, {
      userId: other.user_id,
      actorUserId: context.user.id,
      type: 'trade_shipment_marked_sent',
      title: 'Shipment confirmed',
      body: `${sideLabel(side)} marked their deck as shipped${trackingCode ? ` with tracking ${trackingCode}` : ''}.`,
      href: getDraftHref(tradeId),
      metadata: { tradeId, side, trackingCode },
    })

    await sendTradeEmail({
      userId: other.user_id,
      subject: 'Shipment confirmed',
      body: `${sideLabel(side)} marked their deck as shipped${trackingCode ? ` with tracking ${trackingCode}` : ''}.`,
      href: getDraftHref(tradeId),
      ctaLabel: 'Review trade deal',
      idempotencyKey: `trade-shipment-confirmed:${tradeId}:${side}:${other.user_id}`,
      eyebrow: 'Shipment update',
    })
  }

  if (refreshedParticipants.every((row) => row.shipment_status === 'shipped')) {
    for (const participantRow of refreshedParticipants) {
      if (!participantRow.user_id) continue
      await createNotification(context.supabase, {
        userId: participantRow.user_id,
        actorUserId: context.user.id,
        type: 'trade_both_shipments_confirmed',
        title: 'Both decks are in transit',
        body: 'Both traders have confirmed shipment. The next checkpoint is receipt at the hub.',
        href: getDraftHref(tradeId),
        metadata: { tradeId },
      })

      await sendTradeEmail({
        userId: participantRow.user_id,
        subject: 'Both decks are in transit',
        body: 'Both traders have confirmed shipment. The next checkpoint is receipt at the hub.',
        href: getDraftHref(tradeId),
        ctaLabel: 'Track trade progress',
        idempotencyKey: `trade-both-shipments:${tradeId}:${participantRow.user_id}`,
        eyebrow: 'Shipment update',
      })
    }
  }

  redirect(returnTo)
}

export async function overrideTradeShippedForTestingAction(formData: FormData) {
  const tradeId = parseTradeId(formData)
  if (!tradeId) redirect('/trades')

  const side = String(formData.get('side') || '') as 'a' | 'b'
  const trackingCode = String(formData.get('tracking_code') || '').trim() || `TEST-SHIP-${tradeId}-${side.toUpperCase()}`
  const overrideReason =
    String(formData.get('override_reason') || '').trim() || 'Admin testing override'
  const context = await getTradeContext(tradeId)
  const returnTo = getReturnTo(formData, getReviewHref(tradeId))
  const participant = context.participants.find((row) => row.side === side) ?? null

  if (!context.trade || !context.access.isAdmin || !participant) {
    redirect(returnTo)
  }

  const now = new Date().toISOString()

  await context.adminSupabase
    .from('trade_transaction_participants')
    .update({
      shipment_status: 'shipped',
      tracking_code: trackingCode,
      shipped_at: now,
      updated_at: now,
    })
    .eq('transaction_id', tradeId)
    .eq('side', side)

  const refreshedParticipants = context.participants.map((row) =>
    row.side === side
      ? { ...row, shipment_status: 'shipped' as const, tracking_code: trackingCode }
      : row
  )
  const nextStatus = deriveTradeStatus(context.trade, refreshedParticipants)

  await context.adminSupabase
    .from('trade_transactions')
    .update({
      status: nextStatus,
      updated_at: now,
    })
    .eq('id', tradeId)

  await context.adminSupabase.from('escrow_events').insert({
    transaction_id: tradeId,
    actor_user_id: context.user.id,
    event_type: 'shipment_override_marked_sent',
    event_data: {
      side,
      trackingCode,
      shippedAt: now,
      reason: overrideReason,
      overrideType: 'admin_test_override',
    },
  })

  redirect(returnTo)
}

export async function markTradeReceivedAction(formData: FormData) {
  const tradeId = parseTradeId(formData)
  if (!tradeId) redirect('/trades')

  const side = String(formData.get('side') || '') as 'a' | 'b'
  const context = await getTradeContext(tradeId)
  const returnTo = getReturnTo(formData, getReviewHref(tradeId))

  if (!context.trade || !context.access.isAdmin) {
    redirect(returnTo)
  }

  const now = new Date().toISOString()

  await context.adminSupabase
    .from('trade_transaction_participants')
    .update({
      shipment_status: 'received',
      received_at: now,
      updated_at: now,
    })
    .eq('transaction_id', tradeId)
    .eq('side', side)

  const refreshedParticipants = context.participants.map((row) =>
    row.side === side ? { ...row, shipment_status: 'received' as const } : row
  )
  const nextStatus = deriveTradeStatus(context.trade, refreshedParticipants)

  await context.adminSupabase
    .from('trade_transactions')
    .update({
      status: nextStatus,
      updated_at: now,
    })
    .eq('id', tradeId)

  await context.adminSupabase.from('escrow_events').insert({
    transaction_id: tradeId,
    actor_user_id: context.user.id,
    event_type: 'shipment_received_at_escrow',
    event_data: { side, receivedAt: now },
  })

  for (const participant of refreshedParticipants) {
    if (!participant.user_id) continue
    await createNotification(context.supabase, {
      userId: participant.user_id,
      actorUserId: context.user.id,
      type: 'trade_shipment_received_at_escrow',
      title: 'Deck received at the escrow hub',
      body: `${sideLabel(side)}'s shipment for Trade #${tradeId} has been received at the hub and moved into intake review.`,
      href: getDraftHref(tradeId),
      metadata: { tradeId, side },
    })

    await sendTradeEmail({
      userId: participant.user_id,
      subject: 'Deck received at the escrow hub',
      body: `${sideLabel(side)}'s shipment for Trade #${tradeId} has been received at the hub and moved into intake review.`,
      href: getDraftHref(tradeId),
      ctaLabel: 'Review trade status',
      idempotencyKey: `trade-received-at-hub:${tradeId}:${side}:${participant.user_id}`,
      eyebrow: 'Escrow intake',
    })
  }

  redirect(returnTo)
}

export async function markTradeInspectionAction(formData: FormData) {
  const tradeId = parseTradeId(formData)
  if (!tradeId) redirect('/trades')

  const side = String(formData.get('side') || '') as 'a' | 'b'
  const inspectionStatus = String(formData.get('inspection_status') || 'passed') as 'passed' | 'failed'
  const inspectionNotes = String(formData.get('inspection_notes') || '').trim() || null
  const context = await getTradeContext(tradeId)
  const returnTo = getReturnTo(formData, getReviewHref(tradeId))

  if (!context.trade || !context.access.isAdmin) {
    redirect(returnTo)
  }

  const now = new Date().toISOString()

  await context.adminSupabase
    .from('trade_transaction_participants')
    .update({
      inspection_status: inspectionStatus,
      inspection_notes: inspectionNotes,
      updated_at: now,
    })
    .eq('transaction_id', tradeId)
    .eq('side', side)

  const refreshedParticipants = context.participants.map((row) =>
    row.side === side ? { ...row, inspection_status: inspectionStatus } : row
  )
  const nextStatus = inspectionStatus === 'failed' ? 'disputed' : deriveTradeStatus(context.trade, refreshedParticipants)

  await context.adminSupabase
    .from('trade_transactions')
    .update({
      status: nextStatus,
      release_ready_at: nextStatus === 'ready_to_release' ? now : context.trade.release_ready_at ?? null,
      dispute_reason: inspectionStatus === 'failed' ? inspectionNotes : context.trade.dispute_reason ?? null,
      updated_at: now,
    })
    .eq('id', tradeId)

  await context.adminSupabase.from('escrow_events').insert({
    transaction_id: tradeId,
    actor_user_id: context.user.id,
    event_type: inspectionStatus === 'failed' ? 'inspection_failed' : 'inspection_passed',
    event_data: { side, inspectionNotes, inspectedAt: now },
  })

  for (const participant of refreshedParticipants) {
    if (!participant.user_id) continue
    await createNotification(context.supabase, {
      userId: participant.user_id,
      actorUserId: context.user.id,
      type: inspectionStatus === 'failed' ? 'trade_inspection_failed' : 'trade_inspection_passed',
      title: inspectionStatus === 'failed' ? 'Deck flagged during inspection' : 'Deck passed inspection',
      body:
        inspectionStatus === 'failed'
          ? `${sideLabel(side)}'s deck for Trade #${tradeId} was flagged during inspection.${inspectionNotes ? ` Notes: ${inspectionNotes}` : ''}`
          : `${sideLabel(side)}'s deck for Trade #${tradeId} passed intake inspection.${inspectionNotes ? ` Notes: ${inspectionNotes}` : ''}`,
      href: getDraftHref(tradeId),
      metadata: { tradeId, side, inspectionStatus },
    })

    await sendTradeEmail({
      userId: participant.user_id,
      subject: inspectionStatus === 'failed' ? 'Deck flagged during inspection' : 'Deck passed inspection',
      body:
        inspectionStatus === 'failed'
          ? `${sideLabel(side)}'s deck for Trade #${tradeId} was flagged during inspection.${inspectionNotes ? ` Notes: ${inspectionNotes}` : ''}`
          : `${sideLabel(side)}'s deck for Trade #${tradeId} passed intake inspection.${inspectionNotes ? ` Notes: ${inspectionNotes}` : ''}`,
      href: getDraftHref(tradeId),
      ctaLabel: inspectionStatus === 'failed' ? 'Review trade issue' : 'Review trade status',
      idempotencyKey: `trade-inspection:${inspectionStatus}:${tradeId}:${side}:${participant.user_id}`,
      eyebrow: inspectionStatus === 'failed' ? 'Inspection issue' : 'Inspection update',
    })
  }

  if (nextStatus === 'ready_to_release') {
    for (const participant of refreshedParticipants) {
      if (!participant.user_id) continue
      await createNotification(context.supabase, {
        userId: participant.user_id,
        actorUserId: context.user.id,
        type: 'trade_ready_to_release',
        title: 'Trade cleared for release',
        body: `Trade #${tradeId} has passed intake and inspection on both sides. The escrow release step is next.`,
        href: getDraftHref(tradeId),
        metadata: { tradeId },
      })

      await sendTradeEmail({
        userId: participant.user_id,
        subject: 'Trade cleared for release',
        body: `Trade #${tradeId} has passed intake and inspection on both sides. The escrow release step is next.`,
        href: getDraftHref(tradeId),
        ctaLabel: 'Review trade status',
        idempotencyKey: `trade-ready-to-release:${tradeId}:${participant.user_id}`,
        eyebrow: 'Escrow release',
      })
    }
  }

  redirect(returnTo)
}

export async function markTradeCompletedAction(formData: FormData) {
  const tradeId = parseTradeId(formData)
  if (!tradeId) redirect('/trades')

  const context = await getTradeContext(tradeId)
  const returnTo = getReturnTo(formData, getReviewHref(tradeId))

  if (!context.trade || !context.access.isAdmin) {
    redirect(returnTo)
  }

  const now = new Date().toISOString()

  await context.adminSupabase
    .from('trade_transactions')
    .update({
      status: 'completed',
      completed_at: now,
      updated_at: now,
    })
    .eq('id', tradeId)

  await context.adminSupabase.from('escrow_events').insert({
    transaction_id: tradeId,
    actor_user_id: context.user.id,
    event_type: 'trade_completed',
    event_data: { completedAt: now },
  })

  for (const participant of context.participants) {
    if (!participant.user_id) continue
    await createNotification(context.supabase, {
      userId: participant.user_id,
      actorUserId: context.user.id,
      type: 'trade_completed',
      title: 'Trade completed',
      body: `Trade #${tradeId} was marked completed.`,
      href: getDraftHref(tradeId),
      metadata: { tradeId },
    })

    await sendTradeEmail({
      userId: participant.user_id,
      subject: 'Trade completed',
      body: `Trade #${tradeId} was marked completed.`,
      href: getDraftHref(tradeId),
      ctaLabel: 'View trade record',
      idempotencyKey: `trade-completed:${tradeId}:${participant.user_id}`,
      eyebrow: 'Trade complete',
    })
  }

  redirect(returnTo)
}

export async function markTradeDisputedAction(formData: FormData) {
  const tradeId = parseTradeId(formData)
  if (!tradeId) redirect('/trades')

  const disputeReason = String(formData.get('dispute_reason') || '').trim() || 'Trade manually flagged for dispute.'
  const context = await getTradeContext(tradeId)
  const fallback =
    context.access.isAdmin || !context.isParticipant ? getReviewHref(tradeId) : getDraftHref(tradeId)
  const returnTo = getReturnTo(formData, fallback)

  if (!context.trade || (!context.access.isAdmin && !context.isParticipant)) {
    redirect(returnTo)
  }

  const now = new Date().toISOString()

  await context.adminSupabase
    .from('trade_transactions')
    .update({
      status: 'disputed',
      dispute_reason: disputeReason,
      updated_at: now,
    })
    .eq('id', tradeId)

  await context.adminSupabase.from('escrow_events').insert({
    transaction_id: tradeId,
    actor_user_id: context.user.id,
    event_type: 'trade_disputed',
    event_data: { disputeReason, disputedAt: now },
  })

  for (const participant of context.participants) {
    if (!participant.user_id || participant.user_id === context.user.id) continue
    await createNotification(context.supabase, {
      userId: participant.user_id,
      actorUserId: context.user.id,
      type: 'trade_disputed',
      title: 'Trade flagged for review',
      body: `Trade #${tradeId} was flagged for review. DeckSwap will follow up before anything moves forward.`,
      href: getDraftHref(tradeId),
      metadata: { tradeId },
    })

    await sendTradeEmail({
      userId: participant.user_id,
      subject: 'Trade flagged for review',
      body: `Trade #${tradeId} was flagged for review. DeckSwap will follow up before anything moves forward.`,
      href: getDraftHref(tradeId),
      ctaLabel: 'Review trade status',
      idempotencyKey: `trade-disputed:${tradeId}:${participant.user_id}`,
      eyebrow: 'Trade review',
    })
  }

  redirect(returnTo)
}
