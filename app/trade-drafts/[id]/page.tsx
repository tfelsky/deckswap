import Link from 'next/link'
import { redirect } from 'next/navigation'
import FormActionButton from '@/components/form-action-button'
import {
  markTradeDisputedAction,
  markTradePaidAction,
  markTradeShippedAction,
} from '@/app/trade-actions'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  deriveTradeStatus,
  formatPaymentStatus,
  formatShipmentStatus,
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

function formatTimestamp(value?: string | null) {
  if (!value) return 'Not recorded'
  return new Date(value).toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function eventCopy(eventType: string) {
  switch (eventType) {
    case 'draft_created':
      return 'Trade draft created'
    case 'payment_requested':
      return 'Checkout opened'
    case 'payment_marked_paid':
      return 'Payment confirmed'
    case 'shipment_marked_sent':
      return 'Shipment confirmed'
    case 'shipment_received_at_escrow':
      return 'Deck received at the hub'
    case 'inspection_passed':
      return 'Inspection passed'
    case 'inspection_failed':
      return 'Inspection issue found'
    case 'trade_completed':
      return 'Trade completed'
    case 'trade_disputed':
      return 'Trade flagged for review'
    default:
      return eventType.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  }
}

function userStatusMessage(
  status: string,
  participant: TradeParticipantRow
) {
  if (status === 'draft' || status === 'awaiting_payment') {
    return participant.payment_status === 'paid'
      ? 'Your payment is recorded. We are waiting for the other trader to finish checkout.'
      : 'Your draft is ready for checkout. Review your amount, choose whether you want the $20 box + prepaid label, and confirm payment.'
  }

  if (status === 'awaiting_shipments') {
    return participant.shipment_status === 'shipped'
      ? 'Your shipment is recorded. We are waiting for the other deck to be sent in.'
      : 'Both sides are paid. Pack your deck and confirm shipment to the escrow hub.'
  }

  if (status === 'in_transit') {
    return 'Both traders have confirmed shipment. We are waiting for receipt at the hub.'
  }

  if (status === 'in_inspection') {
    return 'Both decks are at the hub and in inspection.'
  }

  if (status === 'ready_to_release') {
    return 'Both decks cleared inspection. The trade is ready for release.'
  }

  if (status === 'disputed') {
    return 'This trade is paused for review. We will follow up before anything else moves.'
  }

  if (status === 'completed') {
    return 'This trade is complete.'
  }

  return 'Your trade draft is active.'
}

export default async function TradeDraftPage({
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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const access = await getAdminAccessForUser(user)
  const adminSupabase = createAdminClientOrNull() ?? supabase

  const [tradeResult, participantResult, eventResult] = await Promise.all([
    adminSupabase.from('trade_transactions').select('*').eq('id', tradeId).maybeSingle(),
    adminSupabase
      .from('trade_transaction_participants')
      .select('*')
      .eq('transaction_id', tradeId)
      .order('side', { ascending: true }),
    adminSupabase
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
  const currentStatus = deriveTradeStatus(trade, participants)
  const currentUserParticipant = participants.find((participant) => participant.user_id === user.id) ?? null

  if (!currentUserParticipant) {
    if (access.isAdmin) {
      redirect(`/trades/${tradeId}`)
    }

    redirect('/trades')
  }

  const otherParticipant =
    participants.find((participant) => participant.side !== currentUserParticipant.side) ?? null

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap gap-3">
            <Link href="/trades" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">
              {'<-'} Back to Your Trades
            </Link>
            {access.isAdmin ? (
              <Link href={`/trades/${trade.id}`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
                Open Admin Review
              </Link>
            ) : null}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium tracking-wide text-sky-300">
                User Trade Draft
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">Trade #{trade.id}</h1>
              <p className="mt-3 max-w-3xl text-zinc-400">
                Your checkout and shipping workspace. You only see your own charges here, while the other side only sees theirs.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="text-sm text-zinc-400">Status</div>
              <div className="mt-2 text-3xl font-semibold text-white">{formatTradeStatus(currentStatus)}</div>
              <div className="mt-4 rounded-2xl border border-sky-400/15 bg-sky-400/10 p-4 text-sm text-sky-100">
                {userStatusMessage(currentStatus, currentUserParticipant)}
              </div>
              <div className="mt-4 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Your payment</div>
                  <div className="mt-2 text-white">{formatPaymentStatus(currentUserParticipant.payment_status)}</div>
                  <div className="mt-1 text-xs text-zinc-500">{formatTimestamp(currentUserParticipant.payment_marked_at)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Your shipment</div>
                  <div className="mt-2 text-white">{formatShipmentStatus(currentUserParticipant.shipment_status)}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {currentUserParticipant.shipped_at
                      ? `Sent ${formatTimestamp(currentUserParticipant.shipped_at)}`
                      : 'No shipment confirmed yet'}
                  </div>
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
              <h2 className="text-2xl font-semibold">Your Checkout</h2>
              <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="space-y-2 text-sm text-zinc-300">
                  <div className="flex items-center justify-between">
                    <span>Your deck value</span>
                    <span>{formatUsd(currentUserParticipant.deck_value_usd)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Matching fee</span>
                    <span>{formatUsd(currentUserParticipant.matching_fee_usd)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Shipping</span>
                    <span>{formatUsd(currentUserParticipant.shipping_usd)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Insurance</span>
                    <span>{formatUsd(currentUserParticipant.insurance_usd)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Box + prepaid label</span>
                    <span>{formatUsd(currentUserParticipant.packaging_addon_usd)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Equalization</span>
                    <span>{formatUsd(currentUserParticipant.equalization_owed_usd)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 text-base font-semibold text-white">
                    <span>Total due</span>
                    <span>{formatUsd(currentUserParticipant.amount_due_usd)}</span>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                  {currentUserParticipant.label_box_requested
                    ? 'You requested the next-day flat folded box with prepaid label. That $20 add-on is already included above.'
                    : 'You did not add the next-day flat folded box with prepaid label on this draft.'}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Other Trader Progress</h2>
              {otherParticipant ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Payment</div>
                    <div className="mt-2 text-white">{formatPaymentStatus(otherParticipant.payment_status)}</div>
                    <p className="mt-2 text-sm text-zinc-400">
                      You do not see the other trader&apos;s fees or totals here.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Shipment</div>
                    <div className="mt-2 text-white">{formatShipmentStatus(otherParticipant.shipment_status)}</div>
                    <p className="mt-2 text-sm text-zinc-400">
                      We only show progress updates, not the other side&apos;s checkout details.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-zinc-400">We are still waiting to attach the other trader to this draft.</p>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">What You Need To Do</h2>
              <div className="mt-4 space-y-3">
                {currentUserParticipant.payment_status !== 'paid' ? (
                  <form action={markTradePaidAction} className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                    <input type="hidden" name="trade_id" value={trade.id} />
                    <input type="hidden" name="side" value={currentUserParticipant.side} />
                    <input type="hidden" name="return_to" value={`/trade-drafts/${trade.id}`} />
                    <p className="text-sm text-emerald-100">
                      Confirm your payment to unlock the shipping step for your side.
                    </p>
                    <FormActionButton
                      pendingLabel="Saving..."
                      className="mt-4 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 disabled:cursor-wait disabled:opacity-70"
                    >
                      Confirm payment
                    </FormActionButton>
                  </form>
                ) : null}

                {currentUserParticipant.payment_status === 'paid' &&
                currentUserParticipant.shipment_status === 'not_shipped' ? (
                  <form action={markTradeShippedAction} className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
                    <input type="hidden" name="trade_id" value={trade.id} />
                    <input type="hidden" name="side" value={currentUserParticipant.side} />
                    <input type="hidden" name="return_to" value={`/trade-drafts/${trade.id}`} />
                    <p className="text-sm text-sky-100">
                      Your payment is done. Enter tracking if you have it and confirm your deck is on the way to the escrow hub.
                    </p>
                    <input
                      type="text"
                      name="tracking_code"
                      placeholder="Tracking code (optional)"
                      className="mt-4 w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white"
                    />
                    <FormActionButton
                      pendingLabel="Saving..."
                      className="mt-4 rounded-xl bg-sky-300 px-4 py-2 text-sm font-medium text-zinc-950 disabled:cursor-wait disabled:opacity-70"
                    >
                      Confirm shipment
                    </FormActionButton>
                  </form>
                ) : null}

                {currentStatus !== 'completed' && currentStatus !== 'cancelled' ? (
                  <form action={markTradeDisputedAction} className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                    <input type="hidden" name="trade_id" value={trade.id} />
                    <input type="hidden" name="return_to" value={`/trade-drafts/${trade.id}`} />
                    <p className="text-sm text-red-100">
                      Need help or spot something wrong? Flag the trade and we&apos;ll stop the flow for review.
                    </p>
                    <textarea
                      name="dispute_reason"
                      rows={3}
                      placeholder="Tell us what needs attention"
                      className="mt-4 w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white"
                    />
                    <FormActionButton
                      pendingLabel="Saving..."
                      className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 disabled:cursor-wait disabled:opacity-70"
                    >
                      Flag this trade
                    </FormActionButton>
                  </form>
                ) : null}
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
                      <div className="text-sm font-medium text-white">{eventCopy(event.event_type)}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {event.created_at ? new Date(event.created_at).toLocaleString('en-CA') : 'Unknown time'}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-400">No updates yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Shipping Notes</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Once both sides pay, both traders are prompted to ship decks to the hub.
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  If you chose the box + label add-on, the next-day flat folded box with label is already part of your draft total.
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Tracking is optional in this prototype, but adding it makes status updates clearer for everyone.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
