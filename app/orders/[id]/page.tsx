import Link from 'next/link'
import { redirect } from 'next/navigation'
import FormActionButton from '@/components/form-action-button'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  DIRECT_SALE_BOX_KIT_PRICE,
  formatDirectSaleOrderStatus,
  formatDirectSaleOrderType,
  isDirectSalesSchemaMissing,
  type DirectSaleOrderRow,
} from '@/lib/direct-sales'
import { createNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

type DeckSummary = {
  id: number
  name: string
  commander?: string | null
}

function formatUsd(value?: number | null) {
  return `$${Number(value ?? 0).toFixed(2)}`
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

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const orderId = Number(id)

  if (!Number.isFinite(orderId)) {
    redirect('/decks')
  }

  const supabase = await createClient()
  const adminSupabase = createAdminClientOrNull() ?? supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const orderResult = await adminSupabase.from('direct_sale_orders').select('*').eq('id', orderId).maybeSingle()

  if (!orderResult.data) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Order not found</h1>
          <p className="mt-3 text-sm text-zinc-300">
            {isDirectSalesSchemaMissing(orderResult.error?.message)
              ? 'Run docs/sql/direct-sale-orders.sql in Supabase to enable direct-sale checkout.'
              : orderResult.error?.message ?? 'No direct-sale order exists for this ID.'}
          </p>
        </div>
      </main>
    )
  }

  const order = orderResult.data as DirectSaleOrderRow
  const isSeller = order.seller_user_id === user.id
  const isBuyer = order.buyer_user_id === user.id
  const access = await getAdminAccessForUser(user)
  const isAdmin = access.isAdmin

  if (!isSeller && !isBuyer && !isAdmin) {
    redirect('/decks')
  }

  const deckResult = await adminSupabase
    .from('decks')
    .select('id, name, commander')
    .eq('id', order.deck_id)
    .maybeSingle()
  const deck = (deckResult.data ?? null) as DeckSummary | null

  async function confirmCheckoutAction() {
    'use server'

    const supabase = await createClient()
    const adminSupabase = createAdminClientOrNull() ?? supabase
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')

    const currentOrderResult = await adminSupabase.from('direct_sale_orders').select('*').eq('id', orderId).maybeSingle()
    const currentOrder = currentOrderResult.data as DirectSaleOrderRow | null

    if (!currentOrder || currentOrder.status !== 'checkout_open') {
      redirect(`/orders/${orderId}`)
    }

    const isCurrentSeller = currentOrder.seller_user_id === user.id
    const isCurrentBuyer = currentOrder.buyer_user_id === user.id
    if ((currentOrder.order_type === 'buy_now' && !isCurrentBuyer) || (currentOrder.order_type === 'guaranteed_offer' && !isCurrentSeller)) {
      redirect(`/orders/${orderId}`)
    }

    const now = new Date().toISOString()
    await adminSupabase
      .from('direct_sale_orders')
      .update({
        status: 'awaiting_shipment',
        checkout_confirmed_at: now,
        payment_confirmed_at: currentOrder.order_type === 'buy_now' ? now : currentOrder.payment_confirmed_at ?? now,
        updated_at: now,
      })
      .eq('id', orderId)

    if (currentOrder.order_type === 'buy_now') {
      await createNotification(supabase, {
        userId: currentOrder.seller_user_id,
        actorUserId: user.id,
        type: 'buy_now_paid',
        title: 'Buy It Now payment confirmed',
        body: 'The buyer completed checkout. Pack the deck, add tracking, and move it into shipping.',
        href: `/orders/${orderId}`,
        metadata: { orderId, deckId: currentOrder.deck_id },
      })
    }

    redirect(`/orders/${orderId}`)
  }

  async function markShippedAction(formData: FormData) {
    'use server'

    const trackingCode = String(formData.get('tracking_code') || '').trim() || null
    const supabase = await createClient()
    const adminSupabase = createAdminClientOrNull() ?? supabase
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')

    const currentOrderResult = await adminSupabase.from('direct_sale_orders').select('*').eq('id', orderId).maybeSingle()
    const currentOrder = currentOrderResult.data as DirectSaleOrderRow | null

    if (!currentOrder || currentOrder.seller_user_id !== user.id || currentOrder.status !== 'awaiting_shipment') {
      redirect(`/orders/${orderId}`)
    }

    const now = new Date().toISOString()
    await adminSupabase
      .from('direct_sale_orders')
      .update({
        status: 'shipped',
        tracking_code: trackingCode,
        shipped_at: now,
        updated_at: now,
      })
      .eq('id', orderId)

    await adminSupabase.from('decks').update({ inventory_status: 'awaiting_delivery' }).eq('id', currentOrder.deck_id)

    if (currentOrder.buyer_user_id) {
      await createNotification(supabase, {
        userId: currentOrder.buyer_user_id,
        actorUserId: user.id,
        type: 'direct_sale_shipped',
        title: 'Your order has shipped',
        body: `The seller marked this direct-sale order as shipped${trackingCode ? ` with tracking ${trackingCode}` : ''}.`,
        href: `/orders/${orderId}`,
        metadata: { orderId, deckId: currentOrder.deck_id, trackingCode },
      })
    }

    redirect(`/orders/${orderId}`)
  }

  async function overrideShippedForTestingAction(formData: FormData) {
    'use server'

    const trackingCode =
      String(formData.get('tracking_code') || '').trim() || `TEST-ORDER-${orderId}`
    const supabase = await createClient()
    const adminSupabase = createAdminClientOrNull() ?? supabase
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')
    const access = await getAdminAccessForUser(user)
    if (!access.isAdmin) redirect(`/orders/${orderId}`)

    const currentOrderResult = await adminSupabase
      .from('direct_sale_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()
    const currentOrder = currentOrderResult.data as DirectSaleOrderRow | null

    if (!currentOrder) {
      redirect(`/orders/${orderId}`)
    }

    const now = new Date().toISOString()
    await adminSupabase
      .from('direct_sale_orders')
      .update({
        status: 'shipped',
        tracking_code: trackingCode,
        shipped_at: now,
        updated_at: now,
      })
      .eq('id', orderId)

    await adminSupabase
      .from('decks')
      .update({ inventory_status: 'awaiting_delivery' })
      .eq('id', currentOrder.deck_id)

    redirect(`/orders/${orderId}`)
  }

  async function markDeliveredAction() {
    'use server'

    const supabase = await createClient()
    const adminSupabase = createAdminClientOrNull() ?? supabase
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')

    const currentOrderResult = await adminSupabase.from('direct_sale_orders').select('*').eq('id', orderId).maybeSingle()
    const currentOrder = currentOrderResult.data as DirectSaleOrderRow | null

    if (!currentOrder || currentOrder.status !== 'shipped') {
      redirect(`/orders/${orderId}`)
    }

    const canConfirm =
      currentOrder.order_type === 'buy_now'
        ? currentOrder.buyer_user_id === user.id
        : currentOrder.seller_user_id === user.id
    if (!canConfirm) {
      redirect(`/orders/${orderId}`)
    }

    const now = new Date().toISOString()
    await adminSupabase
      .from('direct_sale_orders')
      .update({
        status: 'completed',
        delivered_at: now,
        updated_at: now,
      })
      .eq('id', orderId)

    redirect(`/orders/${orderId}`)
  }

  const canConfirmCheckout =
    order.status === 'checkout_open' &&
    ((order.order_type === 'buy_now' && isBuyer) || (order.order_type === 'guaranteed_offer' && isSeller))
  const canMarkShipped = order.status === 'awaiting_shipment' && isSeller
  const canMarkDelivered =
    order.status === 'shipped' &&
    ((order.order_type === 'buy_now' && isBuyer) || (order.order_type === 'guaranteed_offer' && isSeller))
  const canOverrideShippedForTesting =
    isAdmin &&
    order.status !== 'shipped' &&
    order.status !== 'completed' &&
    order.status !== 'cancelled'

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href={deck ? `/decks/${deck.id}` : '/decks'} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">
            {'<-'} Back to deck
          </Link>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium tracking-wide text-amber-200">
                {formatDirectSaleOrderType(order.order_type)}
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">Order #{order.id}</h1>
              <p className="mt-3 text-zinc-400">{deck?.name ?? `Deck #${order.deck_id}`} is moving through checkout and shipping.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="text-sm text-zinc-400">Status</div>
              <div className="mt-2 text-3xl font-semibold text-white">{formatDirectSaleOrderStatus(order.status)}</div>
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-50/90">
                {order.status === 'checkout_open'
                  ? order.order_type === 'buy_now'
                    ? 'Buyer should confirm checkout and payment, then the seller ships the deck.'
                    : 'Seller should confirm the guaranteed-offer checkout, then ship the deck.'
                  : order.status === 'awaiting_shipment'
                    ? 'Checkout is complete. The seller can now ship the deck and add tracking.'
                    : order.status === 'shipped'
                      ? 'Shipment is in motion. Confirm delivery once the deck arrives.'
                      : 'This direct-sale order has moved past shipping.'}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Checkout Summary</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Deck</div>
                  <div className="mt-2 text-lg font-semibold text-white">{deck?.name ?? `Deck #${order.deck_id}`}</div>
                  <div className="mt-1 text-sm text-zinc-400">{deck?.commander || 'Commander not set'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Base price</div>
                  <div className="mt-2 text-lg font-semibold text-amber-200">{formatUsd(order.price_usd)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Box + label add-on</div>
                  <div className="mt-2 text-lg font-semibold text-white">{formatUsd(order.shipping_label_addon_usd)}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {order.label_box_requested ? `Next-day courier packaging kit requested (+${formatUsd(DIRECT_SALE_BOX_KIT_PRICE)}).` : 'No packaging kit requested.'}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Total checkout</div>
                  <div className="mt-2 text-lg font-semibold text-emerald-300">{formatUsd(Number(order.price_usd ?? 0) + Number(order.shipping_label_addon_usd ?? 0))}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Timeline</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Created: {formatTimestamp(order.created_at)}</div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Checkout confirmed: {formatTimestamp(order.checkout_confirmed_at)}</div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Payment confirmed: {formatTimestamp(order.payment_confirmed_at)}</div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Shipped: {formatTimestamp(order.shipped_at)}{order.tracking_code ? ` | Tracking: ${order.tracking_code}` : ''}</div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Delivered: {formatTimestamp(order.delivered_at)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Actions</h2>
            <div className="mt-4 space-y-3">
              {canConfirmCheckout ? (
                <form action={confirmCheckoutAction}>
                  <FormActionButton pendingLabel="Confirming..." className="w-full rounded-2xl bg-amber-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90 disabled:cursor-wait disabled:opacity-70">
                    {order.order_type === 'buy_now' ? 'Confirm payment and open shipping' : 'Confirm guaranteed offer and open shipping'}
                  </FormActionButton>
                </form>
              ) : null}

              {canMarkShipped ? (
                <form action={markShippedAction} className="space-y-3">
                  <input type="text" name="tracking_code" placeholder="Tracking code (optional)" className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white" />
                  <FormActionButton pendingLabel="Saving shipment..." className="w-full rounded-2xl border border-sky-400/20 bg-sky-400/10 px-5 py-3 text-sm font-medium text-sky-100 hover:bg-sky-400/15 disabled:cursor-wait disabled:opacity-70">
                    Mark shipped
                  </FormActionButton>
                </form>
              ) : null}

              {canOverrideShippedForTesting ? (
                <form action={overrideShippedForTestingAction} className="space-y-3">
                  <input
                    type="text"
                    name="tracking_code"
                    placeholder="Optional test tracking code"
                    className="w-full rounded-2xl border border-fuchsia-400/20 bg-zinc-950 px-4 py-3 text-white"
                  />
                  <FormActionButton pendingLabel="Overriding..." className="w-full rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-5 py-3 text-sm font-medium text-fuchsia-100 hover:bg-fuchsia-400/15 disabled:cursor-wait disabled:opacity-70">
                    Admin test override to shipped
                  </FormActionButton>
                  <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 p-4 text-sm text-fuchsia-100">
                    Test-only override. This bypasses the normal checkout and shipping prerequisites for admin QA.
                  </div>
                </form>
              ) : null}

              {canMarkDelivered ? (
                <form action={markDeliveredAction}>
                  <FormActionButton pendingLabel="Confirming delivery..." className="w-full rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-medium text-emerald-100 hover:bg-emerald-400/15 disabled:cursor-wait disabled:opacity-70">
                    Confirm delivered
                  </FormActionButton>
                </form>
              ) : null}

              {!canConfirmCheckout && !canMarkShipped && !canMarkDelivered ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">No direct action is waiting on your role right now.</div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
