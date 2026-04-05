import Link from 'next/link'
import { redirect } from 'next/navigation'
import FormActionButton from '@/components/form-action-button'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  DIRECT_SALE_BOX_KIT_PRICE,
  formatDirectSaleOrderType,
  isDirectSaleOrderActive,
  isDirectSalesSchemaMissing,
  type DirectSaleOrderType,
} from '@/lib/direct-sales'
import {
  calculateGuaranteedBuyNowOffer,
  calculateSuggestedBuyNowPrice,
} from '@/lib/decks/trade-value'
import { createNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

type DeckSummary = {
  id: number
  user_id?: string | null
  name: string
  commander?: string | null
  price_total_usd_foil?: number | null
  buy_now_price_usd?: number | null
  buy_now_currency?: string | null
}

function formatUsd(value?: number | null) {
  return `$${Number(value ?? 0).toFixed(2)}`
}

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = searchParams ? await searchParams : {}
  const deckId = Number(Array.isArray(params.deckId) ? params.deckId[0] : params.deckId)
  const type = String(Array.isArray(params.type) ? params.type[0] : params.type ?? 'buy_now') as DirectSaleOrderType

  if (!Number.isFinite(deckId) || (type !== 'buy_now' && type !== 'guaranteed_offer')) {
    redirect('/decks')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/sign-in?next=/orders/new?deckId=${deckId}&type=${type}`)
  }

  const deckResult = await supabase
    .from('decks')
    .select('id, user_id, name, commander, price_total_usd_foil, buy_now_price_usd, buy_now_currency')
    .eq('id', deckId)
    .maybeSingle()

  if (!deckResult.data) {
    redirect('/decks')
  }

  const deck = deckResult.data as DeckSummary
  const isOwner = deck.user_id === user.id
  const currentValue = Number(deck.price_total_usd_foil ?? 0)
  const guaranteedOffer = calculateGuaranteedBuyNowOffer(currentValue)
  const buyNowQuote = calculateSuggestedBuyNowPrice(currentValue)
  const activeBuyNowPrice = Number(deck.buy_now_price_usd ?? 0)
  const isBuyNow = type === 'buy_now'
  const basePrice = isBuyNow ? activeBuyNowPrice : guaranteedOffer.guaranteedOffer
  const schemaMissing = params.schemaMissing === '1'
  const error = params.error === '1'
  const alreadyOpen = params.alreadyOpen === '1'

  if (isBuyNow && (isOwner || basePrice <= 0)) {
    redirect(`/decks/${deckId}`)
  }

  if (!isBuyNow && !isOwner) {
    redirect(`/decks/${deckId}`)
  }

  async function createOrderAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const adminSupabase = createAdminClientOrNull() ?? supabase
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect(`/sign-in?next=/orders/new?deckId=${deckId}&type=${type}`)
    }

    const labelBoxRequested = String(formData.get('label_box_requested') || '') === '1'
    const shippingLabelAddonUsd = labelBoxRequested ? DIRECT_SALE_BOX_KIT_PRICE : 0

    const currentDeckResult = await adminSupabase
      .from('decks')
      .select('id, user_id, name, price_total_usd_foil, buy_now_price_usd, buy_now_currency')
      .eq('id', deckId)
      .maybeSingle()

    if (currentDeckResult.error || !currentDeckResult.data) {
      redirect(`/orders/new?deckId=${deckId}&type=${type}&error=1`)
    }

    const currentDeck = currentDeckResult.data as DeckSummary
    const currentIsOwner = currentDeck.user_id === user.id
    const currentGuaranteed = calculateGuaranteedBuyNowOffer(Number(currentDeck.price_total_usd_foil ?? 0))
    const currentBasePrice =
      type === 'buy_now' ? Number(currentDeck.buy_now_price_usd ?? 0) : currentGuaranteed.guaranteedOffer

    if ((type === 'buy_now' && (currentIsOwner || currentBasePrice <= 0)) || (type === 'guaranteed_offer' && !currentIsOwner)) {
      redirect(`/decks/${deckId}`)
    }

    const activeOrderResult = await adminSupabase
      .from('direct_sale_orders')
      .select('id, status')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (activeOrderResult.error) {
      if (isDirectSalesSchemaMissing(activeOrderResult.error.message)) {
        redirect(`/orders/new?deckId=${deckId}&type=${type}&schemaMissing=1`)
      }
      redirect(`/orders/new?deckId=${deckId}&type=${type}&error=1`)
    }

    const openOrder = (activeOrderResult.data ?? []).find((order) => isDirectSaleOrderActive(order.status))
    if (openOrder) {
      redirect(`/orders/new?deckId=${deckId}&type=${type}&alreadyOpen=1`)
    }

    const insert = await adminSupabase
      .from('direct_sale_orders')
      .insert({
        deck_id: deckId,
        seller_user_id: currentDeck.user_id,
        buyer_user_id: type === 'buy_now' ? user.id : null,
        order_type: type,
        status: 'checkout_open',
        price_usd: currentBasePrice,
        currency: currentDeck.buy_now_currency ?? 'USD',
        shipping_label_addon_usd: shippingLabelAddonUsd,
        label_box_requested: labelBoxRequested,
        notes:
          type === 'buy_now'
            ? 'Direct purchase checkout opened.'
            : 'Guaranteed offer checkout opened for seller review.',
      })
      .select('id')
      .single()

    if (insert.error || !insert.data) {
      if (isDirectSalesSchemaMissing(insert.error?.message)) {
        redirect(`/orders/new?deckId=${deckId}&type=${type}&schemaMissing=1`)
      }
      redirect(`/orders/new?deckId=${deckId}&type=${type}&error=1`)
    }

    await adminSupabase
      .from('decks')
      .update({
        inventory_status: 'checked_out',
      })
      .eq('id', deckId)

    if (type === 'buy_now' && currentDeck.user_id) {
      await createNotification(supabase, {
        userId: currentDeck.user_id,
        actorUserId: user.id,
        type: 'buy_now_checkout_opened',
        title: 'Buy It Now checkout opened',
        body: `${currentDeck.name} now has a live direct-sale checkout. Watch for payment confirmation, then ship the deck.`,
        href: `/orders/${insert.data.id}`,
        metadata: { orderId: insert.data.id, deckId },
      })
    }

    redirect(`/orders/${insert.data.id}`)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href={`/decks/${deckId}`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">
            {'<-'} Back to deck
          </Link>
          <div className="mt-8 max-w-4xl">
            <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium tracking-wide text-amber-200">
              {formatDirectSaleOrderType(type)} Checkout
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">{deck.name}</h1>
            <p className="mt-3 text-zinc-400">
              {isBuyNow
                ? 'Open a direct-sale checkout, then move the deck into shipping once payment is confirmed.'
                : 'Open the guaranteed-offer lane, confirm the seller checkout, and move straight into shipping.'}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Summary</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Commander</div>
                <div className="mt-2 text-lg font-semibold text-white">{deck.commander || 'Commander not set'}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Current deck value</div>
                <div className="mt-2 text-lg font-semibold text-emerald-300">{formatUsd(currentValue)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Buylist floor</div>
                <div className="mt-2 text-lg font-semibold text-amber-200">{formatUsd(buyNowQuote.floor)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-zinc-500">{isBuyNow ? 'Buy now price' : 'Guaranteed offer'}</div>
                <div className="mt-2 text-lg font-semibold text-white">{formatUsd(basePrice)}</div>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-100">
              The next-day courier box option is always available here. DeckSwap will courier a flat folded box with a prepaid shipping label for an extra {formatUsd(DIRECT_SALE_BOX_KIT_PRICE)}.
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Checkout</h2>
            {schemaMissing ? <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">Run <code>docs/sql/direct-sale-orders.sql</code> in Supabase before using direct-sale checkout.</div> : null}
            {error ? <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">We couldn&apos;t open that checkout right now.</div> : null}
            {alreadyOpen ? <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">This deck already has an active direct-sale order open.</div> : null}

            <form action={createOrderAction} className="mt-6 space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Base checkout amount</div>
                <div className="mt-2 text-3xl font-semibold text-white">{formatUsd(basePrice)}</div>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-zinc-950 px-4 py-4 text-sm text-zinc-300">
                <input type="checkbox" name="label_box_requested" value="1" className="mt-1" />
                <span>Add next-day courier box + prepaid label for {formatUsd(DIRECT_SALE_BOX_KIT_PRICE)}.</span>
              </label>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                {isBuyNow
                  ? 'This creates a live order workspace. Buyer confirms payment there, then the seller ships the deck and tracking is recorded.'
                  : 'This creates a guaranteed-offer workspace. Seller confirms the lane, then ships the deck into the direct-sale flow.'}
              </div>

              <FormActionButton
                pendingLabel="Opening checkout..."
                className="w-full rounded-2xl bg-amber-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
              >
                {isBuyNow ? 'Open Buy It Now Checkout' : 'Open Guaranteed Offer Checkout'}
              </FormActionButton>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}
