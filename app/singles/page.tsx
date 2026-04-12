import type { Metadata } from 'next'
import AppHeader from '@/components/app-header'
import { SinglesMarketplace } from '@/components/singles-marketplace'
import { getUnreadNotificationsCount } from '@/lib/notifications'
import { createClient } from '@/lib/supabase/server'
import { type PublicSingleListing } from '@/lib/singles/marketplace'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Singles Marketplace | Mythiverse Exchange',
  description:
    'Browse public Magic singles listings with a persistent cart and automatic volume discounts on Mythiverse Exchange.',
  alternates: {
    canonical: '/singles',
  },
}

function isSinglesMarketplaceSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("Could not find the 'marketplace_visible' column of 'single_inventory_items'") ||
    message.includes("Could not find the 'marketplace_status' column of 'single_inventory_items'") ||
    message.includes("Could not find the 'marketplace_quantity_available' column of 'single_inventory_items'") ||
    message.includes("Could not find the 'marketplace_price_usd' column of 'single_inventory_items'")
  )
}

export default async function SinglesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const unreadNotifications = user ? await getUnreadNotificationsCount(supabase, user.id) : 0

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
    .order('id', { ascending: true })

  if (error && !isSinglesMarketplaceSchemaMissing(error.message)) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Singles marketplace unavailable</h1>
          <p className="mt-3 text-sm text-zinc-200">{error.message}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-24 text-white">
      <AppHeader current="singles" isSignedIn={!!user} unreadNotifications={unreadNotifications} />

      {isSinglesMarketplaceSchemaMissing(error?.message) ? (
        <section className="mx-auto max-w-4xl px-6 pt-32">
          <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-6 text-sm text-yellow-100">
            Run <code>docs/sql/singles-marketplace-orders.sql</code> after the base singles inventory
            SQL to enable the public singles marketplace.
          </div>
        </section>
      ) : (
        <div className="pt-32">
          <SinglesMarketplace
            listings={(data ?? []) as PublicSingleListing[]}
            isSignedIn={!!user}
          />
        </div>
      )}
    </main>
  )
}
