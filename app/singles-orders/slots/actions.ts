'use server'

import { redirect } from 'next/navigation'
import { createNotification } from '@/lib/notifications'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  formatMailSlotDate,
  normalizeHoldWeeks,
  type SinglesMailSlotRow,
} from '@/lib/singles/mail-slots'
import { awardSinglesOrderCompletionPoints } from '@/lib/singles/order-completion'
import type { SinglesOrderRow } from '@/lib/singles/orders'

// Every transition is authorized and applied by a security-definer RPC (see
// 20260910120000_singles_mail_slots.sql); these actions only relay the form,
// surface RPC errors on the slot page, and send notifications.

function slotHref(slotId: number, error?: string) {
  const href = `/singles-orders/slots/${slotId}`
  return error ? `${href}?error=${encodeURIComponent(error)}` : href
}

async function readSlotRequest(formData: FormData) {
  const slotId = Number(formData.get('mail_slot_id'))
  if (!Number.isFinite(slotId)) redirect('/singles-orders')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/sign-in?next=${encodeURIComponent(slotHref(slotId))}`)

  return { slotId, supabase, user }
}

function readSlot(data: unknown) {
  return (data as { mailSlot?: SinglesMailSlotRow } | null)?.mailSlot ?? null
}

export async function extendMailSlotAction(formData: FormData) {
  const { slotId, supabase, user } = await readSlotRequest(formData)
  const weeks = normalizeHoldWeeks(Number(formData.get('hold_weeks') ?? 0))

  const result = await supabase.rpc('extend_singles_mail_slot', {
    p_slot_id: slotId,
    p_weeks: weeks,
  })

  if (result.error) redirect(slotHref(slotId, result.error.message))

  const slot = readSlot(result.data)
  if (slot) {
    await createNotification(supabase, {
      userId: slot.seller_user_id,
      actorUserId: user.id,
      type: 'singles_mail_slot_extended',
      title: 'A buyer extended their mail slot',
      body: `Keep holding mail slot #${slotId}. It's now paid through ${formatMailSlotDate(slot.held_until)}.`,
      href: slotHref(slotId),
      metadata: { mailSlotId: slotId, weeks },
    })
  }

  redirect(slotHref(slotId))
}

export async function releaseMailSlotAction(formData: FormData) {
  const { slotId, supabase, user } = await readSlotRequest(formData)

  const result = await supabase.rpc('release_singles_mail_slot', { p_slot_id: slotId })

  if (result.error) redirect(slotHref(slotId, result.error.message))

  const slot = readSlot(result.data)
  if (slot) {
    await createNotification(supabase, {
      userId: slot.seller_user_id,
      actorUserId: user.id,
      type: 'singles_mail_slot_ready_to_ship',
      title: 'A mail slot is ready to ship',
      body: `The buyer released mail slot #${slotId}. Pack every order in it into one shipment.`,
      href: slotHref(slotId),
      metadata: { mailSlotId: slotId, reason: slot.release_reason },
    })
  }

  redirect(slotHref(slotId))
}

export async function shipMailSlotAction(formData: FormData) {
  const { slotId, supabase, user } = await readSlotRequest(formData)
  const trackingCode = String(formData.get('tracking_code') ?? '').trim() || null

  const result = await supabase.rpc('ship_singles_mail_slot', {
    p_slot_id: slotId,
    p_tracking_code: trackingCode,
  })

  if (result.error) redirect(slotHref(slotId, result.error.message))

  const slot = readSlot(result.data)
  if (slot) {
    await createNotification(supabase, {
      userId: slot.buyer_user_id,
      actorUserId: user.id,
      type: 'singles_mail_slot_shipped',
      title: 'Your mail slot has shipped',
      body: trackingCode
        ? `Everything in mail slot #${slotId} shipped together with tracking ${trackingCode}.`
        : `Everything in mail slot #${slotId} shipped together.`,
      href: slotHref(slotId),
      metadata: { mailSlotId: slotId, trackingCode },
    })
  }

  redirect(slotHref(slotId))
}

export async function confirmMailSlotDeliveredAction(formData: FormData) {
  const { slotId, supabase, user } = await readSlotRequest(formData)

  const result = await supabase.rpc('confirm_singles_mail_slot_delivered', { p_slot_id: slotId })

  if (result.error) redirect(slotHref(slotId, result.error.message))

  const payload = result.data as { mailSlot?: SinglesMailSlotRow; orderIds?: unknown[] } | null
  const slot = payload?.mailSlot ?? null
  const orderIds = (payload?.orderIds ?? []).map(Number).filter(Number.isFinite)

  // Points mint per order, exactly as a standalone order would earn them.
  const adminSupabase = createAdminClientOrNull() ?? supabase
  const ordersResult =
    orderIds.length > 0
      ? await adminSupabase.from('singles_orders').select('*').in('id', orderIds)
      : { data: [] as SinglesOrderRow[] }

  let buyerPoints = 0
  let bonusMinted = 0
  let sellerPoints = 0
  for (const order of (ordersResult.data ?? []) as SinglesOrderRow[]) {
    const awarded = await awardSinglesOrderCompletionPoints(adminSupabase, order)
    buyerPoints += awarded.buyerPoints
    bonusMinted += awarded.bonusMinted
    sellerPoints += awarded.sellerPoints
  }

  const orderLabel = `${orderIds.length} order${orderIds.length === 1 ? '' : 's'}`

  if (slot) {
    await createNotification(supabase, {
      userId: slot.seller_user_id,
      actorUserId: user.id,
      type: 'singles_mail_slot_delivered',
      title: 'A mail slot was marked delivered',
      body:
        sellerPoints > 0
          ? `Mail slot #${slotId} (${orderLabel}) is complete. You earned ${sellerPoints} Mythivex Points.`
          : `Mail slot #${slotId} (${orderLabel}) is complete.`,
      href: slotHref(slotId),
      metadata: { mailSlotId: slotId, orderIds, rewardPoints: sellerPoints },
    })
  }

  if (buyerPoints + bonusMinted > 0) {
    await createNotification(supabase, {
      userId: user.id,
      actorUserId: user.id,
      type: 'reward_points_earned',
      title: 'You earned Mythivex Points',
      body: `Mail slot #${slotId} (${orderLabel}) earned you ${buyerPoints + bonusMinted} Mythivex Points.`,
      href: slotHref(slotId),
      metadata: { mailSlotId: slotId, orderIds, rewardPoints: buyerPoints, bonusPoints: bonusMinted },
    })
  }

  redirect(slotHref(slotId))
}
