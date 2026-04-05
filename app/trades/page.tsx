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

type TradeListParticipant = Pick<
  TradeParticipantRow,
  'transaction_id' | 'user_id' | 'side' | 'deck_id' | 'amount_due_usd' | 'payment_status' | 'shipment_status'
>

type DeckSummary = {
  id: number
  name: string
  commander?: string | null
  image_url?: string | null
}

function formatUsd(value?: number | null) {
  return `$${Number(value ?? 0).toFixed(2)}`
}

function formatLaneType(value?: string | null) {
  if (!value) return 'Trade'
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getDeckHeadline(deck?: DeckSummary) {
  if (!deck) return 'Unknown deck'
  return deck.commander?.trim() || deck.name
}

function getDeckSubline(deck?: DeckSummary) {
  if (!deck) return 'Deck details unavailable'
  if (deck.commander?.trim() && deck.name.trim() !== deck.commander.trim()) {
    return deck.name
  }
  return `Deck #${deck.id}`
}

function getTradeTitle(participants: TradeListParticipant[], decks: Map<number, DeckSummary>, laneType?: string | null) {
  const deckA = participants.find((participant) => participant.side === 'a')?.deck_id
    ? decks.get(Number(participants.find((participant) => participant.side === 'a')?.deck_id))
    : undefined
  const deckB = participants.find((participant) => participant.side === 'b')?.deck_id
    ? decks.get(Number(participants.find((participant) => participant.side === 'b')?.deck_id))
    : undefined

  if (deckA || deckB) {
    return `${getDeckHeadline(deckA)} vs ${getDeckHeadline(deckB)}`
  }

  return formatLaneType(laneType)
}

function getTradeSubtitle(participants: TradeListParticipant[], decks: Map<number, DeckSummary>, laneType?: string | null) {
  const deckA = participants.find((participant) => participant.side === 'a')?.deck_id
    ? decks.get(Number(participants.find((participant) => participant.side === 'a')?.deck_id))
    : undefined
  const deckB = participants.find((participant) => participant.side === 'b')?.deck_id
    ? decks.get(Number(participants.find((participant) => participant.side === 'b')?.deck_id))
    : undefined

  if (deckA || deckB) {
    return `${getDeckSubline(deckA)} vs ${getDeckSubline(deckB)}`
  }

  return formatLaneType(laneType)
}

function getTradeParticipants(participantsByTradeId: Map<number, TradeListParticipant[]>, tradeId: number) {
  return participantsByTradeId.get(tradeId) ?? []
}

function TradeDeckThumb({
  deck,
  side,
}: {
  deck?: DeckSummary
  side: 'a' | 'b'
}) {
  const alignment = side === 'a' ? 'object-left-top' : 'object-right-top'

  return (
    <div className="relative h-28 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      {deck?.image_url ? (
        <img
          src={deck.image_url}
          alt={deck.commander?.trim() || deck.name}
          className={`h-full w-full object-cover ${alignment}`}
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-xs uppercase tracking-[0.2em] text-zinc-500">
          No Image
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
        <div className="truncate text-sm font-semibold text-white">{getDeckHeadline(deck)}</div>
        <div className="truncate text-xs text-zinc-300">{getDeckSubline(deck)}</div>
      </div>
    </div>
  )
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
    .select(
      'id, offered_by_user_id, requested_user_id, offered_deck_id, requested_deck_id, cash_equalization_usd, status, message, accepted_trade_transaction_id, last_action_by_user_id, offered_by_viewed_at, requested_user_viewed_at, created_at, updated_at'
    )
    .or(`offered_by_user_id.eq.${user.id},requested_user_id.eq.${user.id}`)

  const participantRowsResult = access.isAdmin
    ? await adminSupabase
        .from('trade_transaction_participants')
        .select('transaction_id, user_id, side, deck_id, amount_due_usd, payment_status, shipment_status')
    : await adminSupabase
        .from('trade_transaction_participants')
        .select('transaction_id, user_id, side, deck_id, amount_due_usd, payment_status, shipment_status')
        .eq('user_id', user.id)

  const participantRows = (participantRowsResult.data ?? []) as TradeListParticipant[]
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

  const tradeIds = trades.map((trade) => trade.id)
  const allParticipantsResult =
    tradeIds.length > 0
      ? await adminSupabase
          .from('trade_transaction_participants')
          .select('transaction_id, user_id, side, deck_id, amount_due_usd, payment_status, shipment_status')
          .in('transaction_id', tradeIds)
      : { data: [] as TradeListParticipant[] }

  const allParticipants = (allParticipantsResult.data ?? []) as TradeListParticipant[]
  const participantsByTradeId = new Map<number, TradeListParticipant[]>()
  for (const participant of allParticipants) {
    const existing = participantsByTradeId.get(Number(participant.transaction_id)) ?? []
    existing.push(participant)
    participantsByTradeId.set(Number(participant.transaction_id), existing)
  }

  const deckIds = Array.from(
    new Set(allParticipants.map((participant) => Number(participant.deck_id)).filter((value) => Number.isFinite(value)))
  )
  const decksResult =
    deckIds.length > 0
      ? await adminSupabase.from('decks').select('id, name, commander, image_url').in('id', deckIds)
      : { data: [] as DeckSummary[] }
  const decks = new Map<number, DeckSummary>(((decksResult.data ?? []) as DeckSummary[]).map((deck) => [deck.id, deck]))

  const myParticipantByTradeId = new Map(
    allParticipants.filter((row) => row.user_id === user.id).map((row) => [Number(row.transaction_id), row])
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
            {access.isAdmin ? (
              <Link href="/checkout-prototype" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
                Create Internal Draft
              </Link>
            ) : null}
          </div>

          <div className="mt-8">
            <div
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium tracking-wide ${
                access.isAdmin
                  ? 'border border-amber-400/20 bg-amber-400/10 text-amber-300'
                  : 'border border-sky-400/20 bg-sky-400/10 text-sky-300'
              }`}
            >
              {access.isAdmin ? 'Internal Queue' : 'User Workspace'}
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              {access.isAdmin ? 'Trade Review Queue' : 'Your Trades'}
            </h1>
            <p className="mt-3 max-w-3xl text-zinc-400">
              {access.isAdmin
                ? 'Internal trade records for monitoring checkout, shipment intake, inspection, and release.'
                : 'Accepted offers appear here so you can confirm payment, track shipping, and follow the trade through completion.'}
            </p>
            <p className="mt-2 max-w-3xl text-sm text-zinc-500">
              {access.isAdmin
                ? 'Each card now highlights the actual decks involved so you can spot the right trade quickly.'
                : 'Each trade shows the two decks involved so it is easier to recognize the one you want to open.'}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {trades.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <h2 className="text-2xl font-semibold">{access.isAdmin ? 'No trades in review' : 'No active trades yet'}</h2>
            <p className="mt-3 text-zinc-400">
              {access.isAdmin
                ? 'Accepted offers and manually created drafts will appear here for internal review.'
                : 'Once an offer is accepted, your trade will appear here with checkout and shipping steps.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {trades.map((trade) => {
              const participants = getTradeParticipants(participantsByTradeId, trade.id)
              const sideA = participants.find((participant) => participant.side === 'a')
              const sideB = participants.find((participant) => participant.side === 'b')
              const deckA = sideA?.deck_id ? decks.get(Number(sideA.deck_id)) : undefined
              const deckB = sideB?.deck_id ? decks.get(Number(sideB.deck_id)) : undefined
              const myParticipant = myParticipantByTradeId.get(trade.id)
              const href = access.isAdmin ? `/trades/${trade.id}` : `/trade-drafts/${trade.id}`
              const tradeTitle = getTradeTitle(participants, decks, trade.lane_type)
              const tradeSubtitle = getTradeSubtitle(participants, decks, trade.lane_type)

              return (
                <Link
                  key={trade.id}
                  href={href}
                  className="rounded-3xl border border-white/10 bg-zinc-900/80 p-5 transition hover:bg-zinc-900"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs uppercase tracking-wide ${
                          access.isAdmin ? 'text-amber-300/80' : 'text-sky-300/80'
                        }`}
                      >
                        Trade #{trade.id}
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white">{tradeTitle}</div>
                      <div className="mt-2 text-sm text-zinc-400">{tradeSubtitle}</div>
                      <div className="mt-2 text-xs text-zinc-500">
                        Opened {trade.created_at ? new Date(trade.created_at).toLocaleString('en-CA') : 'recently'}
                      </div>
                    </div>

                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[360px]">
                      <TradeDeckThumb deck={deckA} side="a" />
                      <TradeDeckThumb deck={deckB} side="b" />
                    </div>

                    {access.isAdmin ? (
                      <div className="grid gap-2 text-left lg:min-w-[140px] lg:text-right">
                        <div className="text-sm text-zinc-400">{formatTradeStatus(trade.status)}</div>
                        <div className="text-lg font-semibold text-amber-300">{formatUsd(trade.platform_gross_usd)}</div>
                        <div className="text-xs text-zinc-500">Internal gross</div>
                      </div>
                    ) : (
                      <div className="grid gap-2 text-left lg:min-w-[170px] lg:text-right">
                        <div className="text-sm text-zinc-400">{formatTradeStatus(trade.status)}</div>
                        <div className="text-sm text-white">
                          {myParticipant ? `Amount due: ${formatUsd(myParticipant.amount_due_usd)}` : 'Trade ready to open'}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {myParticipant
                            ? `${formatPaymentStatus(myParticipant.payment_status)} payment, ${formatShipmentStatus(myParticipant.shipment_status)} shipping`
                            : 'Waiting for your side to be attached'}
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
