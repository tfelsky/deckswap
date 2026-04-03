import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  formatTradeStatus,
  isEscrowSchemaMissing,
  type TradeTransactionRow,
} from '@/lib/escrow/foundation'

export const dynamic = 'force-dynamic'

export default async function TradesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const { data, error } = await supabase
    .from('trade_transactions')
    .select('id, created_by, status, lane_type, supported, equalization_amount_usd, platform_gross_usd, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Trades unavailable</h1>
          <p className="mt-3 text-sm text-zinc-300">
            {isEscrowSchemaMissing(error.message)
              ? 'Run docs/sql/escrow-transaction-foundation.sql in Supabase to enable persistent trades.'
              : error.message}
          </p>
        </div>
      </main>
    )
  }

  const trades = (data ?? []) as TradeTransactionRow[]

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap gap-3">
            <Link href="/my-decks" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">
              {'<-'} Back to My Decks
            </Link>
            <Link href="/trade-offers" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
              Trade Offers
            </Link>
            <Link href="/checkout-prototype" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
              New Trade Draft
            </Link>
          </div>

          <div className="mt-8">
            <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
              Transaction Foundation
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Trades And Escrows</h1>
            <p className="mt-3 max-w-3xl text-zinc-400">
              These records are the first durable layer under checkout, payment obligations, and future inspection/release workflows.
            </p>
            <p className="mt-2 max-w-3xl text-sm text-zinc-500">
              Negotiation starts in Trade Offers, then accepted offers hand off into this workspace.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {trades.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <h2 className="text-2xl font-semibold">No trade drafts yet</h2>
            <p className="mt-3 text-zinc-400">Start from the escrow checkout prototype to create the first persisted transaction.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {trades.map((trade) => (
              <Link
                key={trade.id}
                href={`/trades/${trade.id}`}
                className="rounded-3xl border border-white/10 bg-zinc-900/80 p-5 hover:bg-zinc-900"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-emerald-300/80">Trade #{trade.id}</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{trade.lane_type}</div>
                    <div className="mt-2 text-sm text-zinc-400">
                      Created {trade.created_at ? new Date(trade.created_at).toLocaleString('en-CA') : 'recently'}
                    </div>
                  </div>
                  <div className="grid gap-2 text-right">
                    <div className="text-sm text-zinc-400">{formatTradeStatus(trade.status)}</div>
                    <div className="text-lg font-semibold text-emerald-300">${Number(trade.platform_gross_usd ?? 0).toFixed(2)}</div>
                    <div className="text-xs text-zinc-500">Platform gross before payment rails</div>
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
