'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import FormActionButton from '@/components/form-action-button'
import { formatCurrencyAmount } from '@/lib/currency'
import { buildSinglesQuote, type PublicSingleListing } from '@/lib/singles/marketplace'
import { type SinglesCartItem } from '@/lib/singles/pricing'

const SINGLES_CART_STORAGE_KEY = 'deckswap_singles_cart_v1'

function readStoredCart() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SINGLES_CART_STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function SinglesCheckoutClient({
  listings,
  schemaMissing,
  errorMessage,
}: {
  listings: PublicSingleListing[]
  schemaMissing: boolean
  errorMessage?: string | null
}) {
  const [cartItems, setCartItems] = useState<SinglesCartItem[]>([])

  useEffect(() => {
    setCartItems(readStoredCart())
  }, [])

  const quote = buildSinglesQuote({ cartItems, listings })

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
      <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-semibold text-white">Cart review</h2>
        <div className="mt-5 grid gap-4">
          {quote.items.map((item) => (
            <article key={item.listingId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start gap-4">
                <div className="h-20 w-14 overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.cardName} className="h-full w-full object-cover object-top" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold text-white">{item.cardName}</div>
                  <div className="mt-1 text-sm text-zinc-400">
                    {item.setName || 'Unknown set'}
                    {item.collectorNumber ? ` #${item.collectorNumber}` : ''}
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    {item.foil ? 'Foil' : 'Non-foil'} · Qty {item.quantity}
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
          <div className="flex items-center justify-between">
            <span>Shipping</span>
            <span>{formatCurrencyAmount(quote.pricing.shippingAmount, 'USD')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tax</span>
            <span>{formatCurrencyAmount(quote.pricing.taxAmount, 'USD')}</span>
          </div>
          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center justify-between text-lg font-semibold text-white">
              <span>Grand total</span>
              <span>{formatCurrencyAmount(quote.pricing.grandTotal, 'USD')}</span>
            </div>
          </div>
        </div>

        <input type="hidden" name="cart_payload" value={JSON.stringify(cartItems)} />
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
          Checkout revalidates every listing live on submit, recalculates the tier, and creates an
          order snapshot so later price edits do not change this order.
        </div>
        <div className="mt-4">
          <FormActionButton
            pendingLabel="Creating order..."
            className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
          >
            Place singles order
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
