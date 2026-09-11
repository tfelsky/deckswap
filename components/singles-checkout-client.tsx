'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import FormActionButton from '@/components/form-action-button'
import { formatCurrencyAmount } from '@/lib/currency'
import {
  MAIL_SLOT,
  calculateMailSlotRentUsd,
  calculateMailSlotShipping,
  estimateMailSlotSavings,
  formatMailSlotDate,
  holdWeekChoices,
  quoteQueuedCheckout,
  type CheckoutMailSlot,
} from '@/lib/singles/mail-slots'
import { buildSinglesQuote, type PublicSingleListing } from '@/lib/singles/marketplace'
import { type SinglesCartItem } from '@/lib/singles/pricing'
import { REWARD_POINTS, resolveRedemption } from '@/lib/rewards/points'

const SINGLES_CART_STORAGE_KEY = 'deckswap_singles_cart_v1'

function readStoredCart() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SINGLES_CART_STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function deliveryOptionClass(selected: boolean) {
  return `flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm transition ${
    selected ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
  }`
}

export function SinglesCheckoutClient({
  listings,
  schemaMissing,
  errorMessage,
  pointsBalance = 0,
  mailSlots = [],
  mailSlotsEnabled = false,
}: {
  listings: PublicSingleListing[]
  schemaMissing: boolean
  errorMessage?: string | null
  pointsBalance?: number
  mailSlots?: CheckoutMailSlot[]
  mailSlotsEnabled?: boolean
}) {
  const [cartItems, setCartItems] = useState<SinglesCartItem[]>([])
  const [applyPoints, setApplyPoints] = useState(false)
  const [queueOrder, setQueueOrder] = useState(false)
  const [holdWeeksChoice, setHoldWeeksChoice] = useState<number | null>(null)

  useEffect(() => {
    setCartItems(readStoredCart())
  }, [])

  const quote = buildSinglesQuote({ cartItems, listings })
  const itemCount = quote.items.reduce((sum, item) => sum + item.quantity, 0)

  // Queue My Order: pay now, the seller holds the cards in a mail slot, and the
  // slot ships once for one combined charge. The server re-derives all of this.
  const openSlot = mailSlots.find((slot) => slot.seller_user_id === quote.sellerUserId) ?? null
  const weekChoices = holdWeekChoices(openSlot)
  const holdWeeks =
    holdWeeksChoice !== null && weekChoices.includes(holdWeeksChoice)
      ? holdWeeksChoice
      : openSlot
        ? 0
        : MAIL_SLOT.defaultHoldWeeks
  const queued = mailSlotsEnabled && queueOrder
  const queueQuote = quoteQueuedCheckout({ pricing: quote.pricing, slot: openSlot, holdWeeks })
  const slotOrders = [
    ...(openSlot?.orders ?? []),
    { item_subtotal_usd: quote.pricing.subtotal, item_count: itemCount },
  ]
  const slotShipping = calculateMailSlotShipping(slotOrders)
  const separateShippingUsd = estimateMailSlotSavings({ orders: slotOrders, rentPaidUsd: 0 }).separateShippingUsd
  const totalBeforePoints = queued ? queueQuote.grandTotal : quote.pricing.grandTotal

  // Resolve the best redemption against the live total. The server re-validates this
  // on submit, so the worst case from a stale balance is the points control no-opping.
  const redemption = applyPoints
    ? resolveRedemption({
        pointsRequested: pointsBalance,
        balance: pointsBalance,
        orderTotalUsd: totalBeforePoints,
      })
    : { pointsApplied: 0, creditUsd: 0, reason: 'none_requested' as const }
  const adjustedTotal = Math.max(0, Number((totalBeforePoints - redemption.creditUsd).toFixed(2)))

  if (schemaMissing) {
    return (
      <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-6 text-sm text-yellow-100">
        Run <code>docs/sql/singles-marketplace-orders.sql</code> after the base singles inventory SQL
        to enable native singles checkout.
      </div>
    )
  }

  if (quote.items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
        <h2 className="text-2xl font-semibold text-white">Your singles cart is empty</h2>
        <p className="mt-2 text-zinc-400">
          Build a cart in the singles marketplace first, then come back here to place the order.
        </p>
        <Link
          href="/singles"
          className="mt-6 inline-block rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
        >
          Browse singles
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <h2 className="text-2xl font-semibold text-white">Cart review</h2>
          <div className="mt-5 grid gap-4">
            {quote.items.map((item) => (
              <article
                key={item.listingId}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="h-20 w-14 overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.cardName}
                        className="h-full w-full object-cover object-top"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-semibold text-white">{item.cardName}</div>
                    <div className="mt-1 text-sm text-zinc-400">
                      {item.setName || 'Unknown set'}
                      {item.collectorNumber ? ` #${item.collectorNumber}` : ''}
                    </div>
                    <div className="mt-2 text-xs text-zinc-500">
                      {[item.foil ? 'Foil' : 'Non-foil', `Qty ${item.quantity}`].join(' · ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-emerald-300">
                      {formatCurrencyAmount(item.lineSubtotalUsd, 'USD')}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {formatCurrencyAmount(item.unitPriceUsd, 'USD')} each
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {mailSlotsEnabled ? (
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold text-white">Delivery</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className={deliveryOptionClass(!queueOrder)}>
                <input
                  type="radio"
                  name="delivery_choice"
                  checked={!queueOrder}
                  onChange={() => setQueueOrder(false)}
                  className="mt-0.5 h-4 w-4 accent-emerald-400"
                />
                <span>
                  <span className="block font-medium text-white">Ship now</span>
                  <span className="mt-0.5 block text-xs text-zinc-400">
                    {quote.pricing.shippingLabel} · {formatCurrencyAmount(quote.pricing.shippingAmount, 'USD')}
                  </span>
                </span>
              </label>
              <label className={deliveryOptionClass(queueOrder)}>
                <input
                  type="radio"
                  name="delivery_choice"
                  checked={queueOrder}
                  onChange={() => setQueueOrder(true)}
                  className="mt-0.5 h-4 w-4 accent-emerald-400"
                />
                <span>
                  <span className="block font-medium text-white">Queue my order</span>
                  <span className="mt-0.5 block text-xs text-zinc-400">
                    {openSlot
                      ? `Add it to your mail slot #${openSlot.id}`
                      : `Seller holds it · ${formatCurrencyAmount(MAIL_SLOT.rentPerWeekUsd, 'USD')}/week`}
                  </span>
                </span>
              </label>
            </div>

            {queueOrder ? (
              <div className="mt-4 space-y-4 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm">
                <p className="text-amber-100/90">
                  Pay for the cards now and the seller holds them in a mail slot instead of shipping.
                  Everything you queue with this seller lands in the same slot and ships together, for
                  one combined shipping charge, when you release it or the hold runs out.
                </p>

                {openSlot ? (
                  <div className="rounded-xl border border-amber-400/20 bg-black/20 p-3 text-amber-100">
                    Mail slot #{openSlot.id} already holds {openSlot.orders.length} order
                    {openSlot.orders.length === 1 ? '' : 's'} and is paid through{' '}
                    {formatMailSlotDate(openSlot.held_until)}.
                  </div>
                ) : null}

                <label className="block">
                  <span className="text-xs uppercase tracking-wide text-amber-200/70">
                    {openSlot ? 'Extend the hold' : 'Hold it for'}
                  </span>
                  <select
                    value={holdWeeks}
                    onChange={(event) => setHoldWeeksChoice(Number(event.target.value))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white"
                  >
                    {weekChoices.map((weeks) => (
                      <option key={weeks} value={weeks}>
                        {weeks === 0
                          ? 'No extension · no extra rent'
                          : `${weeks} week${weeks === 1 ? '' : 's'} · ${formatCurrencyAmount(
                              calculateMailSlotRentUsd(weeks),
                              'USD'
                            )} rent`}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-1 text-xs text-amber-200/80">
                  <div>
                    Held until {formatMailSlotDate(queueQuote.heldUntil)}. Slots max out{' '}
                    {MAIL_SLOT.maxHoldWeeks} weeks after opening.
                  </div>
                  <div>
                    The whole slot ships together ({slotShipping.label}) for{' '}
                    {formatCurrencyAmount(slotShipping.amount, 'USD')}, charged when it ships
                    {slotOrders.length > 1
                      ? `, instead of ${formatCurrencyAmount(separateShippingUsd, 'USD')} shipping these ${slotOrders.length} orders one by one`
                      : ''}
                    .
                  </div>
                </div>
                <p className="text-xs text-zinc-400">
                  Queued orders are a commitment: they can&apos;t be cancelled, and unused rent isn&apos;t
                  refunded if you ship early.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-semibold text-white">Checkout summary</h2>
        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            {errorMessage}
          </div>
        ) : null}
        <div className="mt-5 space-y-3 text-sm text-zinc-300">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>{formatCurrencyAmount(quote.pricing.subtotal, 'USD')}</span>
          </div>
          <div className="flex items-center justify-between text-emerald-200">
            <span>{quote.pricing.tierLabel}</span>
            <span>-{formatCurrencyAmount(quote.pricing.discountAmount, 'USD')}</span>
          </div>
          {queued ? (
            <>
              <div className="flex items-center justify-between">
                <span>Shipping</span>
                <span>Billed when the slot ships</span>
              </div>
              <div className="flex items-center justify-between text-amber-200">
                <span>
                  {queueQuote.holdWeeks > 0
                    ? `Mail slot rent (${queueQuote.holdWeeks} wk)`
                    : 'Mail slot rent (already paid)'}
                </span>
                <span>{formatCurrencyAmount(queueQuote.rentUsd, 'USD')}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span>{quote.pricing.shippingLabel}</span>
                <span>{formatCurrencyAmount(quote.pricing.shippingAmount, 'USD')}</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-zinc-400">
                {quote.pricing.shippingDescription}
              </div>
            </>
          )}
          <div className="flex items-center justify-between">
            <span>Tax</span>
            <span>{formatCurrencyAmount(quote.pricing.taxAmount, 'USD')}</span>
          </div>

          {pointsBalance > 0 ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={applyPoints}
                  onChange={(event) => setApplyPoints(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-400"
                />
                <span className="text-sm">
                  <span className="font-medium text-amber-100">Redeem Mythivex Points</span>
                  <span className="mt-0.5 block text-xs text-amber-200/70">
                    Balance: {pointsBalance.toLocaleString()} MP · {REWARD_POINTS.redemptionPointsPerUsd} MP = $1 ·
                    up to {Math.round(REWARD_POINTS.maxRedemptionFraction * 100)}% of an order
                  </span>
                </span>
              </label>
              {applyPoints && redemption.reason !== 'applied' ? (
                <p className="mt-2 text-xs text-amber-200/70">
                  {redemption.reason === 'below_minimum' || redemption.reason === 'insufficient_balance'
                    ? `You need at least ${REWARD_POINTS.minRedemptionPoints.toLocaleString()} MP to redeem.`
                    : 'This order is too small to apply points yet.'}
                </p>
              ) : null}
            </div>
          ) : null}

          {redemption.pointsApplied > 0 ? (
            <div className="flex items-center justify-between text-amber-200">
              <span>Points redeemed ({redemption.pointsApplied.toLocaleString()} MP)</span>
              <span>-{formatCurrencyAmount(redemption.creditUsd, 'USD')}</span>
            </div>
          ) : null}

          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center justify-between text-lg font-semibold text-white">
              <span>{queued ? 'Due today' : 'Grand total'}</span>
              <span>{formatCurrencyAmount(adjustedTotal, 'USD')}</span>
            </div>
          </div>
        </div>

        <input type="hidden" name="cart_payload" value={JSON.stringify(cartItems)} />
        <input type="hidden" name="redeem_points" value={redemption.pointsApplied} />
        <input type="hidden" name="queue_in_mail_slot" value={queued ? '1' : '0'} />
        <input type="hidden" name="hold_weeks" value={queued ? queueQuote.holdWeeks : 0} />
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
          Checkout revalidates every listing live on submit, recalculates discounts and Canada
          shipping, and creates an order snapshot so later price edits do not change this order.
        </div>
        <div className="mt-4">
          <FormActionButton
            pendingLabel={queued ? 'Queuing order...' : 'Creating order...'}
            className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
          >
            {queued ? 'Pay and queue order' : 'Place singles order'}
          </FormActionButton>
        </div>

        <Link
          href="/singles"
          className="mt-4 inline-block text-sm text-zinc-400 transition hover:text-white"
        >
          Back to singles marketplace
        </Link>
      </div>
    </div>
  )
}
