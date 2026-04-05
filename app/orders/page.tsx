import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  formatDirectSaleOrderStatus,
  formatDirectSaleOrderType,
  type DirectSaleOrderRow,
} from '@/lib/direct-sales'

export const dynamic = 'force-dynamic'

function formatUsd(value?: number | null) {
  return `$${Number(value ?? 0).toFixed(2)}`
}

export default async function OrdersPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClientOrNull() ?? supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const [sellerResult, buyerResult] = await Promise.all([
    adminSupabase.from('direct_sale_orders').select('*').eq('seller_user_id', user.id).order('created_at', { ascending: false }),
    adminSupabase.from('direct_sale_orders').select('*').eq('buyer_user_id', user.id).order('created_at', { ascending: false }),
  ])

  const rows = new Map<number, DirectSaleOrderRow>()
  ;((sellerResult.data ?? []) as DirectSaleOrderRow[]).forEach((row) => rows.set(row.id, row))
  ;((buyerResult.data ?? []) as DirectSaleOrderRow[]).forEach((row) => rows.set(row.id, row))
  const orders = Array.from(rows.values()).sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium tracking-wide text-amber-200">
            Direct Sales
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Buy It Now and Guaranteed Offer Orders</h1>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-10">
        {orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <h2 className="text-2xl font-semibold">No direct-sale orders yet</h2>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="rounded-3xl border border-white/10 bg-zinc-900/80 p-5 hover:bg-zinc-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-amber-200">{formatDirectSaleOrderType(order.order_type)}</div>
                    <div className="mt-2 text-2xl font-semibold text-white">Order #{order.id}</div>
                    <div className="mt-2 text-sm text-zinc-400">{formatDirectSaleOrderStatus(order.status)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-emerald-300">{formatUsd(Number(order.price_usd ?? 0) + Number(order.shipping_label_addon_usd ?? 0))}</div>
                    <div className="text-xs text-zinc-500">Checkout total</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
