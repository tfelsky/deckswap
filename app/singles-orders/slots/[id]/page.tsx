import Link from 'next/link'
import { redirect } from 'next/navigation'
import AppHeader from '@/components/app-header'
import ConfirmFormActionButton from '@/components/confirm-form-action-button'
import FormActionButton from '@/components/form-action-button'
import {
  confirmMailSlotDeliveredAction,
  extendMailSlotAction,
  releaseMailSlotAction,
  shipMailSlotAction,
} from '@/app/singles-orders/slots/actions'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { formatCurrencyAmount } from '@/lib/currency'
import {
  MAIL_SLOT,
  calculateMailSlotRentUsd,
  calculateMailSlotShipping,
  daysUntil,
  estimateMailSlotSavings,
  formatMailSlotDate,
  formatMailSlotPhase,
  holdWeekChoices,
  isMailSlotsSchemaMissing,
  resolveMailSlotPhase,
  type MailSlotPhase,
  type SinglesMailSlotChargeRow,
  type SinglesMailSlotRow,
} from '@/lib/singles/mail-slots'
import {
  formatSinglesOrderStatus,
  formatSinglesTimelineTimestamp,
  type SinglesOrderItemRow,
  type SinglesOrderRow,
} from '@/lib/singles/orders'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function readSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function usd(value?: number | null) {
  return formatCurrencyAmount(Number(value ?? 0), 'USD')
}

function percentOf(part: number, whole: number) {
  if (whole <= 0) return 0
  return Math.min(100, Math.max(0, (part / whole) * 100))
}

function describeSlot(phase: MailSlotPhase, isSeller: boolean, slot: SinglesMailSlotRow) {
  const heldUntil = formatMailSlotDate(slot.held_until)

  switch (phase) {
    case 'holding':
      return isSeller
        ? `Paid for and waiting. Hold every order in this slot until ${heldUntil}, and don't ship yet.`
        : `Paid for and on hold with the seller until ${heldUntil}. Keep queuing orders from this seller; everything ships together.`
    case 'hold_ended':
      return isSeller
        ? 'The paid hold has ended. Ship everything in this slot together.'
        : 'Your paid hold has ended, so the seller will ship everything in this slot together. Extend it to keep collecting.'
    case 'ready_to_ship':
      return isSeller
        ? 'Released for shipping. Pack every order below into one shipment.'
        : 'Released for shipping. The seller is packing everything into one shipment.'
    case 'shipped':
      return slot.tracking_code
        ? `Everything in this slot shipped together. Tracking: ${slot.tracking_code}.`
        : 'Everything in this slot shipped together.'
    case 'delivered':
      return 'Delivered. Every order in this slot is complete.'
  }
}

export default async function MailSlotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const slotId = Number(id)

  if (!Number.isFinite(slotId)) {
    redirect('/singles-orders')
  }

  const supabase = await createClient()
  const adminSupabase = createAdminClientOrNull() ?? supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/sign-in?next=/singles-orders/slots/${slotId}`)
  }

  const access = await getAdminAccessForUser(user)
  const slotResult = await adminSupabase
    .from('singles_mail_slots')
    .select('*')
    .eq('id', slotId)
    .maybeSingle()

  if (slotResult.error && isMailSlotsSchemaMissing(slotResult.error.message)) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-6 text-sm text-yellow-100">
          Run <code>supabase/migrations/20260910120000_singles_mail_slots.sql</code> to enable mail slots.
        </div>
      </main>
    )
  }

  if (!slotResult.data) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Mail slot not found</h1>
        </div>
      </main>
    )
  }

  const slot = slotResult.data as SinglesMailSlotRow
  const isBuyer = slot.buyer_user_id === user.id
  const isSeller = slot.seller_user_id === user.id

  if (!isBuyer && !isSeller && !access.isAdmin) {
    redirect('/singles-orders')
  }

  const [ordersResult, chargesResult] = await Promise.all([
    adminSupabase
      .from('singles_orders')
      .select('*')
      .eq('mail_slot_id', slotId)
      .order('created_at', { ascending: true }),
    adminSupabase
      .from('singles_mail_slot_charges')
      .select('*')
      .eq('mail_slot_id', slotId)
      .order('created_at', { ascending: true }),
  ])
  const orders = (ordersResult.data ?? []) as SinglesOrderRow[]
  const charges = (chargesResult.data ?? []) as SinglesMailSlotChargeRow[]

  const itemsResult =
    orders.length > 0
      ? await adminSupabase
          .from('singles_order_items')
          .select('*')
          .in(
            'order_id',
            orders.map((order) => order.id)
          )
          .order('created_at', { ascending: true })
      : { data: [] as SinglesOrderItemRow[] }
  const itemsByOrder = new Map<number, SinglesOrderItemRow[]>()
  for (const item of (itemsResult.data ?? []) as SinglesOrderItemRow[]) {
    itemsByOrder.set(item.order_id, [...(itemsByOrder.get(item.order_id) ?? []), item])
  }

  const now = new Date()
  const phase = resolveMailSlotPhase(slot, now)
  const shipping = calculateMailSlotShipping(orders)
  const shippingCharged = slot.shipping_amount_usd != null
  const savings = estimateMailSlotSavings({
    orders,
    rentPaidUsd: Number(slot.rent_paid_usd ?? 0),
    combinedShippingUsd: slot.shipping_amount_usd,
  })
  const extendChoices = holdWeekChoices(slot, now).filter((weeks) => weeks > 0)
  const errorMessage = readSearchParam(resolvedSearchParams.error)

  // Hold meter: how much of the 13-week cap is paid for, and how much has elapsed.
  const openedMs = Date.parse(slot.opened_at)
  const holdSpanMs = Date.parse(slot.max_hold_until) - openedMs
  const paidPercent = percentOf(Date.parse(slot.held_until) - openedMs, holdSpanMs)
  const elapsedPercent = Math.min(paidPercent, percentOf(now.getTime() - openedMs, holdSpanMs))

  const canExtend = isBuyer && slot.status === 'open' && extendChoices.length > 0
  const canRelease = isBuyer && slot.status === 'open'
  const canShip = isSeller && (phase === 'ready_to_ship' || phase === 'hold_ended')
  const canConfirmDelivered = isBuyer && phase === 'shipped'
  const sellerWaiting = isSeller && phase === 'holding'

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="singles-orders" isSignedIn />

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
              <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium tracking-wide text-amber-200">
                {isSeller ? 'Mail slot · holding for a buyer' : 'Mail slot · Queue My Order'}
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">Mail slot #{slot.id}</h1>
              <p className="mt-3 max-w-2xl text-zinc-400">{describeSlot(phase, isSeller, slot)}</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="text-sm text-zinc-400">Status</div>
              <div className="mt-2 text-3xl font-semibold text-white">{formatMailSlotPhase(phase)}</div>
              {phase === 'holding' ? (
                <div className="mt-1 text-sm text-amber-200">
                  {daysUntil(slot.held_until, now)} days left · until {formatMailSlotDate(slot.held_until)}
                </div>
              ) : null}

              {slot.status === 'open' ? (
                <div className="mt-5">
                  <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-amber-400/40"
                      style={{ width: `${paidPercent}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-amber-300"
                      style={{ width: `${elapsedPercent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-zinc-500">
                    <span>Opened {formatMailSlotDate(slot.opened_at)}</span>
                    <span>Max {formatMailSlotDate(slot.max_hold_until)}</span>
                  </div>
                  <div className="mt-2 text-xs text-zinc-400">
                    {Number(slot.weeks_purchased ?? 0)} of {MAIL_SLOT.maxHoldWeeks} weeks paid
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-1 text-xs text-zinc-400">
                  <div>
                    Released: {formatSinglesTimelineTimestamp(slot.released_at)}
                    {slot.release_reason === 'hold_expired'
                      ? ' (hold ended)'
                      : slot.release_reason === 'buyer_request'
                        ? ' (by buyer)'
                        : ''}
                  </div>
                  <div>Shipped: {formatSinglesTimelineTimestamp(slot.shipped_at)}</div>
                  <div>Delivered: {formatSinglesTimelineTimestamp(slot.delivered_at)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">In this slot</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {orders.length} order{orders.length === 1 ? '' : 's'} · {shipping.itemCount} card
              {shipping.itemCount === 1 ? '' : 's'} · {usd(shipping.subtotal)} in singles
            </p>
            <div className="mt-5 space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <Link
                      href={`/singles-orders/${order.id}`}
                      className="font-semibold text-white transition hover:text-emerald-200"
                    >
                      Order #{order.id}
                    </Link>
                    <div className="text-right text-sm">
                      <div className="font-semibold text-emerald-300">{usd(order.grand_total_usd)}</div>
                      <div className="text-xs text-zinc-500">
                        {formatSinglesOrderStatus(order.status)} ·{' '}
                        {formatSinglesTimelineTimestamp(order.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {(itemsByOrder.get(order.id) ?? []).map((item) => (
                      <div key={item.id} className="flex items-center gap-3 text-sm">
                        <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-950">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.card_name}
                              className="h-full w-full object-cover object-top"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-white">{item.card_name}</div>
                          <div className="truncate text-xs text-zinc-500">
                            {item.set_name || 'Unknown set'}
                            {item.foil ? ' · Foil' : ''} · Qty {item.quantity}
                          </div>
                        </div>
                        <div className="text-zinc-300">{usd(item.line_subtotal_usd)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Actions</h2>
              {errorMessage ? (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
                  {errorMessage}
                </div>
              ) : null}
              <div className="mt-4 space-y-4">
                {canExtend ? (
                  <form action={extendMailSlotAction} className="space-y-3">
                    <input type="hidden" name="mail_slot_id" value={slot.id} />
                    <label className="block text-sm text-zinc-400">
                      Keep holding for
                      <select
                        name="hold_weeks"
                        defaultValue={extendChoices[0]}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white"
                      >
                        {extendChoices.map((weeks) => (
                          <option key={weeks} value={weeks}>
                            {weeks} more week{weeks === 1 ? '' : 's'} · {usd(calculateMailSlotRentUsd(weeks))}
                          </option>
                        ))}
                      </select>
                    </label>
                    <FormActionButton
                      pendingLabel="Extending..."
                      className="w-full rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-3 text-sm font-medium text-amber-100 transition hover:bg-amber-400/15 disabled:cursor-wait disabled:opacity-70"
                    >
                      Pay rent and extend
                    </FormActionButton>
                  </form>
                ) : null}

                {canRelease ? (
                  <form action={releaseMailSlotAction}>
                    <input type="hidden" name="mail_slot_id" value={slot.id} />
                    <ConfirmFormActionButton
                      confirmMessage={
                        phase === 'holding'
                          ? `Ship everything in mail slot #${slot.id} now? Combined shipping is charged on release, and unused rent isn't refunded.`
                          : `Ship everything in mail slot #${slot.id} now? Combined shipping is charged on release.`
                      }
                      pendingLabel="Releasing..."
                      className="w-full rounded-2xl border border-sky-400/20 bg-sky-400/10 px-5 py-3 text-sm font-medium text-sky-100 transition hover:bg-sky-400/15 disabled:cursor-wait disabled:opacity-70"
                    >
                      Ship my slot now
                    </ConfirmFormActionButton>
                    <p className="mt-2 text-xs text-zinc-500">
                      One combined shipment ({shipping.label}) for about {usd(shipping.amount)}, billed on
                      release.
                    </p>
                  </form>
                ) : null}

                {canShip ? (
                  <form action={shipMailSlotAction} className="space-y-3">
                    <input type="hidden" name="mail_slot_id" value={slot.id} />
                    <input
                      type="text"
                      name="tracking_code"
                      placeholder="Tracking code (optional)"
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white"
                    />
                    <FormActionButton
                      pendingLabel="Marking shipped..."
                      className="w-full rounded-2xl border border-sky-400/20 bg-sky-400/10 px-5 py-3 text-sm font-medium text-sky-100 transition hover:bg-sky-400/15 disabled:cursor-wait disabled:opacity-70"
                    >
                      Mark slot shipped
                    </FormActionButton>
                  </form>
                ) : null}

                {canConfirmDelivered ? (
                  <form action={confirmMailSlotDeliveredAction}>
                    <input type="hidden" name="mail_slot_id" value={slot.id} />
                    <FormActionButton
                      pendingLabel="Confirming..."
                      className="w-full rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/15 disabled:cursor-wait disabled:opacity-70"
                    >
                      Confirm delivered
                    </FormActionButton>
                  </form>
                ) : null}

                {sellerWaiting ? (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                    Hold these cards until {formatMailSlotDate(slot.held_until)}. You&apos;ll be notified when
                    the buyer releases the slot or the hold ends.
                  </div>
                ) : null}

                {!canExtend && !canRelease && !canShip && !canConfirmDelivered && !sellerWaiting ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                    No direct action is waiting on your role right now.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Shipping math</h2>
              <div className="mt-5 space-y-3 text-sm text-zinc-300">
                <div className="flex items-center justify-between gap-4">
                  <span>{shippingCharged ? 'Combined shipping (charged)' : 'Combined shipping (estimate)'}</span>
                  <span>{usd(savings.combinedShippingUsd)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Rent paid</span>
                  <span>{usd(savings.rentPaidUsd)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-zinc-500">
                  <span>
                    Shipping {orders.length} order{orders.length === 1 ? '' : 's'} separately
                  </span>
                  <span>{usd(savings.separateShippingUsd)}</span>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between text-base font-semibold text-white">
                    <span>{savings.netSavingsUsd >= 0 ? 'Saved by queuing' : 'Extra cost of queuing'}</span>
                    <span className={savings.netSavingsUsd >= 0 ? 'text-emerald-300' : 'text-amber-300'}>
                      {usd(Math.abs(savings.netSavingsUsd))}
                    </span>
                  </div>
                </div>
                {savings.netSavingsUsd < 0 && isBuyer && slot.status === 'open' ? (
                  <p className="text-xs text-zinc-500">
                    Queuing pays off as more orders share the one shipment.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Charges</h2>
              {charges.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-400">No slot charges yet.</p>
              ) : (
                <div className="mt-4 space-y-2 text-sm">
                  {charges.map((charge) => (
                    <div
                      key={charge.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div>
                        <div className="text-white">
                          {charge.kind === 'rent'
                            ? `Rent · ${Number(charge.weeks ?? 0)} week${Number(charge.weeks ?? 0) === 1 ? '' : 's'}`
                            : 'Combined shipping'}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {formatSinglesTimelineTimestamp(charge.created_at)}
                          {charge.order_id ? ` · with order #${charge.order_id}` : ''}
                        </div>
                      </div>
                      <div className="text-zinc-200">{usd(charge.amount_usd)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
