import Link from 'next/link'
import { createSinglesOrderAction } from '@/app/singles/checkout/actions'
import { SinglesCheckoutClient } from '@/components/singles-checkout-client'
import AppHeader from '@/components/app-header'
import { getUnreadNotificationsCount } from '@/lib/notifications'
import { createClient } from '@/lib/supabase/server'
import { type CheckoutMailSlot, type MailSlotOrderLike } from '@/lib/singles/mail-slots'
import { type PublicSingleListing } from '@/lib/singles/marketplace'

export const dynamic = 'force-dynamic'

function readSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function isSinglesMarketplaceSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("Could not find the 'marketplace_visible' column of 'single_inventory_items'") ||
    message.includes("Could not find the relation 'public.singles_orders'") ||
    message.includes("Could not find the function public.create_singles_checkout")
  )
}

export default async function SinglesCheckoutPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 pt-32 text-white">
        <AppHeader current="singles" isSignedIn={false} />
        <section className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-8">
            <h1 className="text-3xl font-semibold">Sign in to check out singles</h1>
            <p className="mt-3 text-zinc-400">
              Your cart stays local in the browser, but placing the order requires an authenticated account.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/sign-in?next=/singles/checkout"
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
              >
                Sign in
              </Link>
              <Link
                href="/singles"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                Back to singles
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  const unreadNotifications = await getUnreadNotificationsCount(supabase, user.id)
  const { data: rewardBalance } = await supabase
    .from('reward_point_balances')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle()
  const pointsBalance = Math.max(0, Math.floor(Number(rewardBalance?.balance ?? 0)))

  // Open mail slots let a queued order join what's already on hold with that
  // seller. If the table isn't there yet, Queue My Order is simply not offered.
  const mailSlotsResult = await supabase
    .from('singles_mail_slots')
    .select('id, seller_user_id, held_until, max_hold_until')
    .eq('buyer_user_id', user.id)
    .eq('status', 'open')
  const openMailSlots = (mailSlotsResult.data ?? []) as Omit<CheckoutMailSlot, 'orders'>[]
  const slotOrdersResult =
    openMailSlots.length > 0
      ? await supabase
          .from('singles_orders')
          .select('mail_slot_id, item_subtotal_usd, item_count')
          .in(
            'mail_slot_id',
            openMailSlots.map((slot) => slot.id)
          )
      : { data: [] }
  const slotOrders = (slotOrdersResult.data ?? []) as (MailSlotOrderLike & { mail_slot_id: number })[]
  const mailSlots: CheckoutMailSlot[] = openMailSlots.map((slot) => ({
    ...slot,
    orders: slotOrders.filter((order) => order.mail_slot_id === slot.id),
  }))
  const { data, error } = await supabase
    .from('single_inventory_items')
    .select(
      'id, user_id, card_name, quantity, marketplace_quantity_available, marketplace_price_usd, marketplace_currency, marketplace_visible, marketplace_status, marketplace_notes, foil, condition, language, set_code, set_name, collector_number, image_url, type_line, oracle_text, color_identity'
    )
    .eq('marketplace_visible', true)
    .eq('marketplace_status', 'active')
    .gt('marketplace_quantity_available', 0)
    .gt('marketplace_price_usd', 0)
    .eq('inventory_status', 'buy_it_now_live')

  const schemaMissing =
    readSearchParam(resolvedSearchParams.schemaMissing) === '1' ||
    isSinglesMarketplaceSchemaMissing(error?.message)
  const errorMessage = readSearchParam(resolvedSearchParams.error)

  return (
    <main className="min-h-screen bg-zinc-950 pb-16 text-white">
      <AppHeader current="singles" isSignedIn unreadNotifications={unreadNotifications} />

      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 pt-32">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
            Native checkout
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Review singles order</h1>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Submit the cart through DeckSwap’s checkout flow. Inventory, pricing, and discount tier are
            revalidated on the server before the order is created.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <form action={createSinglesOrderAction}>
          <SinglesCheckoutClient
            listings={(data ?? []) as PublicSingleListing[]}
            schemaMissing={schemaMissing}
            errorMessage={errorMessage || null}
            pointsBalance={pointsBalance}
            mailSlots={mailSlots}
            mailSlotsEnabled={!mailSlotsResult.error}
          />
        </form>
      </section>
    </main>
  )
}
