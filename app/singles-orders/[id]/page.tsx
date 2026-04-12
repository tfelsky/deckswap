import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SinglesCartResetter } from '@/components/singles-cart-resetter'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { formatCurrencyAmount } from '@/lib/currency'
import { createNotification } from '@/lib/notifications'
import { createClient } from '@/lib/supabase/server'
import {
  formatSinglesOrderStatus,
  formatSinglesTimelineTimestamp,
  isSinglesOrdersSchemaMissing,
  type SinglesOrderItemRow,
  type SinglesOrderRow,
} from '@/lib/singles/orders'

export const dynamic = 'force-dynamic'

function readSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export default async function SinglesOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const orderId = Number(id)

  if (!Number.isFinite(orderId)) {
    redirect('/singles-orders')
  }

  const supabase = await createClient()
  const adminSupabase = createAdminClientOrNull() ?? supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/singles-orders')
  }

  const access = await getAdminAccessForUser(user)
  const orderResult = await adminSupabase
    .from('singles_orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  if (orderResult.error && isSinglesOrdersSchemaMissing(orderResult.error.message)) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-6 text-sm text-yellow-100">
          Run <code>docs/sql/singles-marketplace-orders.sql</code> to enable singles orders.
        </div>
      </main>
    )
  }

  if (!orderResult.data) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Singles order not found</h1>
        </div>
      </main>
    )
  }

  const order = orderResult.data as SinglesOrderRow
  const itemsResult = await adminSupabase
    .from('singles_order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  const items = (itemsResult.data ?? []) as SinglesOrderItemRow[]

  const isBuyer = order.buyer_user_id === user.id
  const isSeller = order.seller_user_id === user.id || items.some((item) => item.seller_user_id === user.id)

  if (!isBuyer && !isSeller && !access.isAdmin) {
    redirect('/singles-orders')
  }

  const clearSinglesCart = readSearchParam(resolvedSearchParams.clearSinglesCart) === '1'

  async function markShippedAction(formData: FormData) {
    'use server'

    const trackingCode = String(formData.get('tracking_code') ?? '').trim() || null
    const supabase = await createClient()
    const adminSupabase = createAdminClientOrNull() ?? supabase
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/sign-in?next=/singles-orders')

    const currentOrderResult = await adminSupabase
      .from('singles_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()
    const currentOrder = currentOrderResult.data as SinglesOrderRow | null

    if (!currentOrder || currentOrder.seller_user_id !== user.id || currentOrder.status !== 'awaiting_shipment') {
      redirect(`/singles-orders/${orderId}`)
    }

    const now = new Date().toISOString()
    await adminSupabase
      .from('singles_orders')
      .update({
        status: 'shipped',
        tracking_code: trackingCode,
        shipped_at: now,
        updated_at: now,
      })
      .eq('id', orderId)

    await createNotification(supabase, {
      userId: currentOrder.buyer_user_id,
      actorUserId: user.id,
      type: 'singles_order_shipped',
      title: 'Your singles order has shipped',
      body: trackingCode
        ? `Order #${orderId} was marked shipped with tracking ${trackingCode}.`
        : `Order #${orderId} was marked shipped.`,
      href: `/singles-orders/${orderId}`,
      metadata: { orderId, trackingCode },
    })

    redirect(`/singles-orders/${orderId}`)
  }

  async function markDeliveredAction() {
    'use server'

    const supabase = await createClient()
    const adminSupabase = createAdminClientOrNull() ?? supabase
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/sign-in?next=/singles-orders')

    const currentOrderResult = await adminSupabase
      .from('singles_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()
    const currentOrder = currentOrderResult.data as SinglesOrderRow | null

    if (!currentOrder || currentOrder.buyer_user_id !== user.id || currentOrder.status !== 'shipped') {
      redirect(`/singles-orders/${orderId}`)
    }

    const now = new Date().toISOString()
    await adminSupabase
      .from('singles_orders')
      .update({
        status: 'completed',
        delivered_at: now,
        completed_at: now,
        updated_at: now,
      })
      .eq('id', orderId)

    await createNotification(supabase, {
      userId: currentOrder.seller_user_id,
      actorUserId: user.id,
      type: 'singles_order_completed',
      title: 'A singles order was marked delivered',
      body: `Order #${orderId} is now complete.`,
      href: `/singles-orders/${orderId}`,
      metadata: { orderId },
    })

    redirect(`/singles-orders/${orderId}`)
  }

  const canMarkShipped = order.status === 'awaiting_shipment' && isSeller
  const canMarkDelivered = order.status === 'shipped' && isBuyer

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <SinglesCartResetter enabled={clearSinglesCart} />

      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link
            href="/singles-orders"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
          >
            {'<-'} Back to singles orders
          </Link>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                Singles order
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">Order #{order.id}</h1>
              <p className="mt-3 text-zinc-400">
                Multi-line singles checkout with an immutable pricing snapshot from order creation.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="text-sm text-zinc-400">Status</div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {formatSinglesOrderStatus(order.status)}
              </div>
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                {isBuyer
                  ? 'You placed this singles order. Inventory and discount totals are locked to the checkout snapshot.'
                  : 'This order includes singles from your marketplace inventory.'}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Line items</h2>
              <div className="mt-5 grid gap-4">
                {items.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start gap-4">
                      <div className="h-20 w-14 overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.card_name} className="h-full w-full object-cover object-top" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-lg font-semibold text-white">{item.card_name}</div>
                        <div className="mt-1 text-sm text-zinc-400">
                          {item.set_name || 'Unknown set'}
                          {item.collector_number ? ` #${item.collector_number}` : ''}
                        </div>
                        <div className="mt-2 text-xs text-zinc-500">
                          {item.foil ? 'Foil' : 'Non-foil'} · Qty {item.quantity}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-emerald-300">
                          {formatCurrencyAmount(Number(item.line_subtotal_usd ?? 0), 'USD')}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {formatCurrencyAmount(Number(item.unit_price_usd ?? 0), 'USD')} each
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Timeline</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Checkout confirmed: {formatSinglesTimelineTimestamp(order.checkout_confirmed_at)}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Payment confirmed: {formatSinglesTimelineTimestamp(order.payment_confirmed_at)}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Shipped: {formatSinglesTimelineTimestamp(order.shipped_at)}
                  {order.tracking_code ? ` | Tracking: ${order.tracking_code}` : ''}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Delivered: {formatSinglesTimelineTimestamp(order.delivered_at)}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Completed: {formatSinglesTimelineTimestamp(order.completed_at)}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Pricing snapshot</h2>
              <div className="mt-5 space-y-3 text-sm text-zinc-300">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrencyAmount(Number(order.item_subtotal_usd ?? 0), 'USD')}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-200">
                  <span>{order.discount_tier_label || 'No volume discount yet'}</span>
                  <span>-{formatCurrencyAmount(Number(order.discount_amount_usd ?? 0), 'USD')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shipping</span>
                  <span>{formatCurrencyAmount(Number(order.shipping_amount_usd ?? 0), 'USD')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tax</span>
                  <span>{formatCurrencyAmount(Number(order.tax_amount_usd ?? 0), 'USD')}</span>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between text-base font-semibold text-white">
                    <span>Grand total</span>
                    <span>{formatCurrencyAmount(Number(order.grand_total_usd ?? 0), 'USD')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Access model</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Buyer access is limited to the order they placed.
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Seller access is limited to orders that contain their listed singles.
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Pricing stays frozen from the original checkout snapshot even if the marketplace listing changes later.
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Actions</h2>
              <div className="mt-4 space-y-3">
                {canMarkShipped ? (
                  <form action={markShippedAction} className="space-y-3">
                    <input
                      type="text"
                      name="tracking_code"
                      placeholder="Tracking code (optional)"
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white"
                    />
                    <button className="w-full rounded-2xl border border-sky-400/20 bg-sky-400/10 px-5 py-3 text-sm font-medium text-sky-100 transition hover:bg-sky-400/15">
                      Mark shipped
                    </button>
                  </form>
                ) : null}

                {canMarkDelivered ? (
                  <form action={markDeliveredAction}>
                    <button className="w-full rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/15">
                      Confirm delivered
                    </button>
                  </form>
                ) : null}

                {!canMarkShipped && !canMarkDelivered ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                    No direct action is waiting on your role right now.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
