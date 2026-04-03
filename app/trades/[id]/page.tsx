import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  formatPaymentStatus,
  formatTradeStatus,
  isEscrowSchemaMissing,
  type EscrowEventRow,
  type TradeParticipantRow,
  type TradeTransactionRow,
} from '@/lib/escrow/foundation'

export const dynamic = 'force-dynamic'

function formatUsd(value?: number | null) {
  return `$${Number(value ?? 0).toFixed(2)}`
}

function sideLabel(side: 'a' | 'b') {
  return side === 'a' ? 'User A' : 'User B'
}

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tradeId = Number(id)

  if (!Number.isFinite(tradeId)) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Invalid trade ID</h1>
        </div>
      </main>
    )
  }

  const supabase = await createClient()
  const [tradeResult, participantResult, eventResult] = await Promise.all([
    supabase
      .from('trade_transactions')
      .select('*')
      .eq('id', tradeId)
      .maybeSingle(),
    supabase
      .from('trade_transaction_participants')
      .select('*')
      .eq('transaction_id', tradeId)
      .order('side', { ascending: true }),
    supabase
      .from('escrow_events')
      .select('*')
      .eq('transaction_id', tradeId)
      .order('created_at', { ascending: false }),
  ])

  if (!tradeResult.data) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Trade not found</h1>
          <p className="mt-3 text-sm text-zinc-300">
            {isEscrowSchemaMissing(tradeResult.error?.message)
              ? 'Run docs/sql/escrow-transaction-foundation.sql in Supabase to enable persistent trades.'
              : tradeResult.error?.message ?? 'No transaction record exists for this ID.'}
          </p>
        </div>
      </main>
    )
  }

  const trade = tradeResult.data as TradeTransactionRow
  const participants = (participantResult.data ?? []) as TradeParticipantRow[]
  const events = (eventResult.data ?? []) as EscrowEventRow[]

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap gap-3">
            <Link href="/trades" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">
              {'<-'} Back to Trades
            </Link>
            <Link href="/checkout-prototype" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
              New Draft
            </Link>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                Escrow Transaction
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">Trade #{trade.id}</h1>
              <p className="mt-3 max-w-3xl text-zinc-400">
                {trade.lane_type}. This record is the durable foundation under future payment intents, shipment intake, inspection, and release.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="text-sm text-zinc-400">Status</div>
              <div className="mt-2 text-3xl font-semibold text-white">{formatTradeStatus(trade.status)}</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Equalization</div>
                  <div className="mt-2 text-sm font-medium text-white">{formatUsd(trade.equalization_amount_usd)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Platform Gross</div>
                  <div className="mt-2 text-sm font-medium text-emerald-300">{formatUsd(trade.platform_gross_usd)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Participant Obligations</h2>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {participants.map((participant) => (
                  <div key={participant.side} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-semibold text-white">{sideLabel(participant.side)}</div>
                      <div className="text-sm text-zinc-400">{formatPaymentStatus(participant.payment_status)}</div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-zinc-300">
                      <div className="flex items-center justify-between">
                        <span>Deck value</span>
                        <span>{formatUsd(participant.deck_value_usd)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Matching fee</span>
                        <span>{formatUsd(participant.matching_fee_usd)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Shipping</span>
                        <span>{formatUsd(participant.shipping_usd)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Insurance</span>
                        <span>{formatUsd(participant.insurance_usd)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Equalization owed</span>
                        <span>{formatUsd(participant.equalization_owed_usd)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 font-medium text-white">
                        <span>Amount due</span>
                        <span>{formatUsd(participant.amount_due_usd)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Operational Readiness</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                {(trade.notes ?? []).map((note) => (
                  <p key={note} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    {note}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Timeline</h2>
              <div className="mt-4 space-y-3">
                {events.length > 0 ? (
                  events.map((event) => (
                    <div key={`${event.event_type}-${event.created_at}-${event.id ?? 0}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-medium text-white">{event.event_type.replace(/_/g, ' ')}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {event.created_at ? new Date(event.created_at).toLocaleString('en-CA') : 'Unknown time'}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-400">No events recorded yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-dashed border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Next Foundation Steps</h2>
              <div className="mt-4 space-y-2 text-sm text-zinc-300">
                <p>Attach real deck IDs to each side.</p>
                <p>Convert participant dues into payment intents.</p>
                <p>Track inbound shipment and inspection statuses.</p>
                <p>Release equalization only after both decks clear.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
