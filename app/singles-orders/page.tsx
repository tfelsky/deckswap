import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { formatCurrencyAmount } from '@/lib/currency'
import { formatSinglesOrderStatus, isSinglesOrdersSchemaMissing, type SinglesOrderItemRow, type SinglesOrderRow } from '@/lib/singles/orders'

export const dynamic = 'force-dynamic'

export default async function SinglesOrdersPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClientOrNull() ?? supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/singles-orders')
  }

  const buyerOrdersResult = await adminSupabase
    .from('singles_orders')
    .select('*')
    .eq('buyer_user_id', user.id)
    .order('created_at', { ascending: false })

  if (buyerOrdersResult.error && isSinglesOrdersSchemaMissing(buyerOrdersResult.error.message)) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-6 text-sm text-yellow-100">
          Run <code>docs/sql/singles-marketplace-orders.sql</code> to enable singles orders.
        </div>
      </main>
    )
  }

  const sellerItemsResult = await adminSupabase
    .from('singles_order_items')
    .select('*')
    .eq('seller_user_id', user.id)

  const sellerOrderIds = new Set(
    ((sellerItemsResult.data ?? []) as SinglesOrderItemRow[]).map((item) => item.order_id)
  )
  const sellerOrdersResult =
    sellerOrderIds.size > 0
      ? await adminSupabase
          .from('singles_orders')
          .select('*')
          .in('id', Array.from(sellerOrderIds))
      : { data: [] as SinglesOrderRow[] }

  const rows = new Map<number, SinglesOrderRow>()
  ;((buyerOrdersResult.data ?? []) as SinglesOrderRow[]).forEach((row) => rows.set(row.id, row))
  ;((sellerOrdersResult.data ?? []) as SinglesOrderRow[]).forEach((row) => rows.set(row.id, row))
  const orders = Array.from(rows.values()).sort(
    (left, right) =>
      new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime()
  )

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
            Singles Orders
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Singles checkout workspaces</h1>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <h2 className="text-2xl font-semibold">No singles orders yet</h2>
            <Link
              href="/singles"
              className="mt-6 inline-block rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
            >
              Browse singles
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/singles-orders/${order.id}`}
                className="rounded-3xl border border-white/10 bg-zinc-900/80 p-5 transition hover:bg-zinc-900"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-emerald-200">Singles order</div>
                    <div className="mt-2 text-2xl font-semibold text-white">Order #{order.id}</div>
                    <div className="mt-2 text-sm text-zinc-400">{formatSinglesOrderStatus(order.status)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-emerald-300">
                      {formatCurrencyAmount(Number(order.grand_total_usd ?? 0), 'USD')}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {Number(order.item_count ?? 0)} card{Number(order.item_count ?? 0) === 1 ? '' : 's'}
                    </div>
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
