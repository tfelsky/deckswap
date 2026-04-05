import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  formatPaymentStatus,
  formatShipmentStatus,
  formatTradeStatus,
  isEscrowSchemaMissing,
  type TradeParticipantRow,
  type TradeTransactionRow,
} from '@/lib/escrow/foundation'
import { isUnreadTradeOffer, type TradeOfferRow } from '@/lib/trade-offers'

export const dynamic = 'force-dynamic'

function formatUsd(value?: number | null) {
  return `$${Number(value ?? 0).toFixed(2)}`
}

export default async function TradesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const access = await getAdminAccessForUser(user)
  const adminSupabase = createAdminClientOrNull() ?? supabase

  const { data: offersData } = await supabase
    .from('trade_offers')
    .select('id, offered_by_user_id, requested_user_id, offered_deck_id, requested_deck_id, cash_equalization_usd, status, message, accepted_trade_transaction_id, last_action_by_user_id, offered_by_viewed_at, requested_user_viewed_at, created_at, updated_at')
    .or(`offered_by_user_id.eq.${user.id},requested_user_id.eq.${user.id}`)

  const participantRowsResult = access.isAdmin
    ? await adminSupabase
        .from('trade_transaction_participants')
        .select('transaction_id, user_id, side, amount_due_usd, payment_status, shipment_status')
    : await adminSupabase
        .from('trade_transaction_participants')
        .select('transaction_id, user_id, side, amount_due_usd, payment_status, shipment_status')
        .eq('user_id', user.id)

  const participantRows = (participantRowsResult.data ?? []) as Array<
    Pick<
      TradeParticipantRow,
      'transaction_id' | 'user_id' | 'side' | 'amount_due_usd' | 'payment_status' | 'shipment_status'
    >
  >
  const participantTransactionIds = Array.from(
    new Set(participantRows.map((row) => Number(row.transaction_id)).filter((value) => Number.isFinite(value)))
  )

  let data: TradeTransactionRow[] | null = null
  let error: { message: string } | null = null

  if (access.isAdmin) {
    const result = await adminSupabase
      .from('trade_transactions')
      .select('id, created_by, status, lane_type, supported, equalization_amount_usd, platform_gross_usd, created_at')
      .order('created_at', { ascending: false })

    data = (result.data ?? []) as TradeTransactionRow[]
    error = result.error ? { message: result.error.message } : null
  } else {
    const ownedResult = await adminSupabase
      .from('trade_transactions')
      .select('id, created_by, status, lane_type, supported, equalization_amount_usd, platform_gross_usd, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    const participantResult =
      participantTransactionIds.length > 0
        ? await adminSupabase
            .from('trade_transactions')
            .select('id, created_by, status, lane_type, supported, equalization_amount_usd, platform_gross_usd, created_at')
            .in('id', participantTransactionIds)
            .order('created_at', { ascending: false })
        : { data: [], error: null as { message: string } | null }

    const combined = new Map<number, TradeTransactionRow>()
    ;((ownedResult.data ?? []) as TradeTransactionRow[]).forEach((trade) => combined.set(trade.id, trade))
    ;((participantResult.data ?? []) as TradeTransactionRow[]).forEach((trade) => combined.set(trade.id, trade))
    data = Array.from(combined.values()).sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    )
    error = ownedResult.error
      ? { message: ownedResult.error.message }
      : participantResult.error
        ? { message: participantResult.error.message }
        : null
  }

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
  const unreadOffers = ((offersData ?? []) as TradeOfferRow[]).filter((offer) =>
    isUnreadTradeOffer(offer, user.id)
  ).length
  const participantByTradeId = new Map(
    participantRows
      .filter((row) => row.user_id === user.id)
      .map((row) => [Number(row.transaction_id), row])
  )

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap gap-3">
            <Link href="/my-decks" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">
              {'<-'} Back to My Decks
            </Link>
            <Link href="/trade-offers" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
              Trade Offers{unreadOffers > 0 ? ` (${unreadOffers})` : ''}
            </Link>
            <Link href="/checkout-prototype" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
              New Trade Draft
            </Link>
          </div>

          <div className="mt-8">
            <div className={`inline-flex rounded-full px-3 py-1 text-xs font-medium tracking-wide ${
              access.isAdmin
                ? 'border border-amber-400/20 bg-amber-400/10 text-amber-300'
                : 'border border-sky-400/20 bg-sky-400/10 text-sky-300'
            }`}>
              {access.isAdmin ? 'Admin Trade Review' : 'User Trade Drafts'}
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              {access.isAdmin ? 'Trades And Escrows' : 'Your Active Trade Drafts'}
            </h1>
            <p className="mt-3 max-w-3xl text-zinc-400">
              {access.isAdmin
                ? 'Internal escrow records for payment readiness, shipment intake, inspection, and release decisions.'
                : 'Accepted offers land here so you can handle checkout, payment confirmation, and shipment updates without seeing the other trader’s internal costs.'}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {trades.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <h2 className="text-2xl font-semibold">{access.isAdmin ? 'No trade reviews yet' : 'No trade drafts yet'}</h2>
            <p className="mt-3 text-zinc-400">
              {access.isAdmin
                ? 'Accepted offers and prototype checkouts will appear here for review.'
                : 'Accepted offers will open your trade drafts here once checkout is created.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {trades.map((trade) => {
              const myParticipant = participantByTradeId.get(trade.id)
              const href = access.isAdmin ? `/trades/${trade.id}` : `/trade-drafts/${trade.id}`

              return (
                <Link
                  key={trade.id}
                  href={href}
                  className="rounded-3xl border border-white/10 bg-zinc-900/80 p-5 hover:bg-zinc-900"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className={`text-xs uppercase tracking-wide ${
                        access.isAdmin ? 'text-amber-300/80' : 'text-sky-300/80'
                      }`}>
                        Trade #{trade.id}
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white">{trade.lane_type}</div>
                      <div className="mt-2 text-sm text-zinc-400">
                        Created {trade.created_at ? new Date(trade.created_at).toLocaleString('en-CA') : 'recently'}
                      </div>
                    </div>

                    {access.isAdmin ? (
                      <div className="grid gap-2 text-right">
                        <div className="text-sm text-zinc-400">{formatTradeStatus(trade.status)}</div>
                        <div className="text-lg font-semibold text-amber-300">{formatUsd(trade.platform_gross_usd)}</div>
                        <div className="text-xs text-zinc-500">Platform gross before payment rails</div>
                      </div>
                    ) : (
                      <div className="grid gap-2 text-right">
                        <div className="text-sm text-zinc-400">{formatTradeStatus(trade.status)}</div>
                        <div className="text-sm text-white">
                          {myParticipant ? `Your total: ${formatUsd(myParticipant.amount_due_usd)}` : 'Open draft'}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {myParticipant
                            ? `${formatPaymentStatus(myParticipant.payment_status)} payment, ${formatShipmentStatus(myParticipant.shipment_status)} shipment`
                            : 'Waiting for your participant row'}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
