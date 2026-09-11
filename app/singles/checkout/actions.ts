'use server'

import { redirect } from 'next/navigation'
import { createNotification } from '@/lib/notifications'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isMailSlotsSchemaMissing, normalizeHoldWeeks } from '@/lib/singles/mail-slots'
import { isSinglesOrdersSchemaMissing, type SinglesOrderItemRow } from '@/lib/singles/orders'
import { type SinglesCartItem } from '@/lib/singles/pricing'

function normalizeCartPayload(raw: string): SinglesCartItem[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function createSinglesOrderAction(formData: FormData) {
  const cartItems = normalizeCartPayload(String(formData.get('cart_payload') ?? ''))
  const redeemPoints = Math.max(0, Math.floor(Number(formData.get('redeem_points') ?? 0)) || 0)
  const queueInMailSlot = formData.get('queue_in_mail_slot') === '1'
  const holdWeeks = normalizeHoldWeeks(Number(formData.get('hold_weeks') ?? 0))
  const supabase = await createClient()
  const adminSupabase = createAdminClientOrNull() ?? supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/singles/checkout')
  }

  // Only send the mail-slot args when queuing, so plain checkout keeps working on
  // databases that haven't run the mail-slot migration yet.
  const checkoutResult = await supabase.rpc('create_singles_checkout', {
    p_buyer_user_id: user.id,
    p_cart_items: cartItems,
    p_redeem_points: redeemPoints,
    ...(queueInMailSlot ? { p_queue_in_mail_slot: true, p_hold_weeks: holdWeeks } : {}),
  })

  if (checkoutResult.error) {
    if (queueInMailSlot && isMailSlotsSchemaMissing(checkoutResult.error.message)) {
      redirect(
        `/singles/checkout?error=${encodeURIComponent(
          'Queue My Order is not enabled yet (run the singles mail slots migration). Choose Ship now to place this order.'
        )}`
      )
    }

    if (isSinglesOrdersSchemaMissing(checkoutResult.error.message)) {
      redirect('/singles/checkout?schemaMissing=1')
    }

    redirect(`/singles/checkout?error=${encodeURIComponent(checkoutResult.error.message)}`)
  }

  const payload = checkoutResult.data as { orderId?: number; mailSlotId?: number | null } | null
  const orderId = Number(
    payload?.orderId ?? (Array.isArray(checkoutResult.data) ? checkoutResult.data[0]?.orderId : null)
  )
  const mailSlotId = payload?.mailSlotId ? Number(payload.mailSlotId) : null

  if (!Number.isFinite(orderId)) {
    redirect('/singles/checkout?error=Checkout%20completed%20without%20an%20order%20id.')
  }

  const orderItemsResult = await adminSupabase
    .from('singles_order_items')
    .select('*')
    .eq('order_id', orderId)

  const sellerIds = new Set(
    ((orderItemsResult.data ?? []) as SinglesOrderItemRow[]).map((item) => item.seller_user_id)
  )

  for (const sellerUserId of sellerIds) {
    await createNotification(
      supabase,
      mailSlotId
        ? {
            userId: sellerUserId,
            actorUserId: user.id,
            type: 'singles_order_queued',
            title: 'A singles order was queued in a mail slot',
            body: `Order #${orderId} is paid but on hold in mail slot #${mailSlotId}. Set the cards aside and don't ship until the slot is released.`,
            href: `/singles-orders/slots/${mailSlotId}`,
            metadata: { orderId, mailSlotId },
          }
        : {
            userId: sellerUserId,
            actorUserId: user.id,
            type: 'singles_order_created',
            title: 'A singles order is ready to ship',
            body: `Order #${orderId} includes cards from your singles marketplace inventory.`,
            href: `/singles-orders/${orderId}?clearSinglesCart=1`,
            metadata: { orderId },
          }
    )
  }

  redirect(`/singles-orders/${orderId}?clearSinglesCart=1`)
}
