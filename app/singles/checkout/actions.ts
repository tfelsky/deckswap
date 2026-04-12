'use server'

import { redirect } from 'next/navigation'
import { createNotification } from '@/lib/notifications'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
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
  const supabase = await createClient()
  const adminSupabase = createAdminClientOrNull() ?? supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/singles/checkout')
  }

  const checkoutResult = await supabase.rpc('create_singles_checkout', {
    p_buyer_user_id: user.id,
    p_cart_items: cartItems,
  })

  if (checkoutResult.error) {
    if (isSinglesOrdersSchemaMissing(checkoutResult.error.message)) {
      redirect('/singles/checkout?schemaMissing=1')
    }

    redirect(`/singles/checkout?error=${encodeURIComponent(checkoutResult.error.message)}`)
  }

  const orderId = Number(
    (checkoutResult.data as { orderId?: number } | null)?.orderId ??
      (Array.isArray(checkoutResult.data) ? checkoutResult.data[0]?.orderId : null)
  )

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
    await createNotification(supabase, {
      userId: sellerUserId,
      actorUserId: user.id,
      type: 'singles_order_created',
      title: 'A singles order is ready to ship',
      body: `Order #${orderId} includes cards from your singles marketplace inventory.`,
      href: `/singles-orders/${orderId}?clearSinglesCart=1`,
      metadata: { orderId },
    })
  }

  redirect(`/singles-orders/${orderId}?clearSinglesCart=1`)
}
