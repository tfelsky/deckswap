import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  buildTradeDraftRows,
  isEscrowSchemaMissing,
  normalizeSupportedCountry,
} from '@/lib/escrow/foundation'
import {
  formatTradeOfferStatus,
  formatTradeOfferTimestamp,
  isTradeOffersSchemaMissing,
  isUnreadTradeOffer,
  type TradeOfferRow,
} from '@/lib/trade-offers'

export const dynamic = 'force-dynamic'

type DeckSummary = {
  id: number
  user_id?: string | null
  name: string
  commander?: string | null
  image_url?: string | null
  price_total_usd_foil?: number | null
}

function formatUsd(value?: number | null) {
  return `$${Number(value ?? 0).toFixed(2)}`
}

export default async function TradeOfferDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const offerId = Number(id)
  const resolvedSearchParams = searchParams ? await searchParams : {}

  if (!Number.isFinite(offerId)) {
    redirect('/trade-offers')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const offerResult = await supabase.from('trade_offers').select('*').eq('id', offerId).maybeSingle()

  if (!offerResult.data) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Trade offer not found</h1>
          <p className="mt-3 text-sm text-zinc-300">
            {isTradeOffersSchemaMissing(offerResult.error?.message)
              ? 'Run docs/sql/trade-offers.sql in Supabase to enable persistent trade offers.'
              : offerResult.error?.message ?? 'No trade offer exists for this ID.'}
          </p>
        </div>
      </main>
    )
  }

  const offer = offerResult.data as TradeOfferRow
  const isParticipant =
    offer.offered_by_user_id === user.id || offer.requested_user_id === user.id

  if (!isParticipant) {
    redirect('/trade-offers')
  }

  if (isUnreadTradeOffer(offer, user.id)) {
    await supabase
      .from('trade_offers')
      .update(
        offer.offered_by_user_id === user.id
          ? { offered_by_viewed_at: new Date().toISOString() }
          : { requested_user_viewed_at: new Date().toISOString() }
      )
      .eq('id', offerId)
  }

  const [decksResult, privateProfilesResult, ownDecksResult] = await Promise.all([
    supabase
      .from('decks')
      .select('id, user_id, name, commander, image_url, price_total_usd_foil')
      .in('id', [offer.offered_deck_id, offer.requested_deck_id]),
    supabase
      .from('profile_private')
      .select('user_id, shipping_country')
      .in('user_id', [offer.offered_by_user_id, offer.requested_user_id]),
    supabase
      .from('decks')
      .select('id, user_id, name, commander, image_url, price_total_usd_foil')
      .eq('user_id', user.id)
      .order('id', { ascending: false }),
  ])

  const decks = new Map<number, DeckSummary>(
    ((decksResult.data ?? []) as DeckSummary[]).map((deck) => [deck.id, deck])
  )
  const privateProfiles = new Map<string, { user_id: string; shipping_country?: string | null }>(
    ((privateProfilesResult.data ?? []) as Array<{ user_id: string; shipping_country?: string | null }>).map(
      (profile) => [profile.user_id, profile]
    )
  )

  const offeredDeck = decks.get(offer.offered_deck_id)
  const requestedDeck = decks.get(offer.requested_deck_id)
  const canRespond = offer.requested_user_id === user.id && offer.status === 'pending'
  const canCancel = offer.offered_by_user_id === user.id && offer.status === 'pending'
  const canCounter =
    offer.status === 'pending' &&
    offer.last_action_by_user_id !== user.id &&
    (offer.offered_by_user_id === user.id || offer.requested_user_id === user.id)
  const ownDecks = ((ownDecksResult.data ?? []) as DeckSummary[]).filter((deck) => {
    const requestedDeckIdForCounter =
      offer.offered_by_user_id === user.id ? offer.requested_deck_id : offer.offered_deck_id

    return deck.id !== requestedDeckIdForCounter
  })

  async function acceptOfferAction() {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    const currentOfferResult = await supabase
      .from('trade_offers')
      .select('*')
      .eq('id', offerId)
      .single()

    if (currentOfferResult.error || !currentOfferResult.data) {
      redirect(`/trade-offers/${offerId}?error=1`)
    }

    const currentOffer = currentOfferResult.data as TradeOfferRow
    if (currentOffer.requested_user_id !== user.id || currentOffer.status !== 'pending') {
      redirect(`/trade-offers/${offerId}`)
    }

    const [decksResult, profileResult] = await Promise.all([
      supabase
        .from('decks')
        .select('id, price_total_usd_foil')
        .in('id', [currentOffer.offered_deck_id, currentOffer.requested_deck_id]),
      supabase
        .from('profile_private')
        .select('user_id, shipping_country')
        .in('user_id', [currentOffer.offered_by_user_id, currentOffer.requested_user_id]),
    ])

    const deckMap = new Map<number, { id: number; price_total_usd_foil?: number | null }>(
      ((decksResult.data ?? []) as Array<{ id: number; price_total_usd_foil?: number | null }>).map((deck) => [
        deck.id,
        deck,
      ])
    )
    const profileMap = new Map<string, { user_id: string; shipping_country?: string | null }>(
      ((profileResult.data ?? []) as Array<{ user_id: string; shipping_country?: string | null }>).map((profile) => [
        profile.user_id,
        profile,
      ])
    )

    const offeredDeck = deckMap.get(currentOffer.offered_deck_id)
    const requestedDeck = deckMap.get(currentOffer.requested_deck_id)

    if (!offeredDeck || !requestedDeck) {
      redirect(`/trade-offers/${offerId}?error=1`)
    }

    const rows = buildTradeDraftRows(
      {
        deckAValue: Number(offeredDeck.price_total_usd_foil ?? 0) + Number(currentOffer.cash_equalization_usd ?? 0),
        deckBValue: Number(requestedDeck.price_total_usd_foil ?? 0),
        countryA: normalizeSupportedCountry(
          profileMap.get(currentOffer.offered_by_user_id)?.shipping_country
        ),
        countryB: normalizeSupportedCountry(
          profileMap.get(currentOffer.requested_user_id)?.shipping_country
        ),
      },
      currentOffer.offered_by_user_id
    )

    const transactionInsert = await supabase
      .from('trade_transactions')
      .insert(rows.transaction)
      .select('id')
      .single()

    if (transactionInsert.error || !transactionInsert.data) {
      if (isEscrowSchemaMissing(transactionInsert.error?.message)) {
        redirect(`/trade-offers/${offerId}?schemaMissing=1`)
      }
      redirect(`/trade-offers/${offerId}?error=1`)
    }

    const transactionId = transactionInsert.data.id

    const participantInsert = await supabase.from('trade_transaction_participants').insert([
      {
        ...rows.participants[0],
        transaction_id: transactionId,
        deck_id: currentOffer.offered_deck_id,
        user_id: currentOffer.offered_by_user_id,
      },
      {
        ...rows.participants[1],
        transaction_id: transactionId,
        deck_id: currentOffer.requested_deck_id,
        user_id: currentOffer.requested_user_id,
      },
    ])

    if (participantInsert.error) {
      redirect(`/trade-offers/${offerId}?error=1`)
    }

    const eventInsert = await supabase.from('escrow_events').insert({
      ...rows.initialEvent,
      transaction_id: transactionId,
      event_type: 'trade_offer_accepted',
      event_data: {
        offerId,
        source: 'trade_offer',
      },
    })

    if (eventInsert.error) {
      redirect(`/trade-offers/${offerId}?error=1`)
    }

    await supabase
      .from('trade_offers')
      .update({
        status: 'accepted',
        accepted_trade_transaction_id: transactionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', offerId)

    redirect(`/trade-offers/${offerId}?accepted=1`)
  }

  async function declineOfferAction() {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    await supabase
      .from('trade_offers')
      .update({
        status: 'declined',
        updated_at: new Date().toISOString(),
      })
      .eq('id', offerId)
      .eq('requested_user_id', user.id)
      .eq('status', 'pending')

    redirect(`/trade-offers/${offerId}?declined=1`)
  }

  async function cancelOfferAction() {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    await supabase
      .from('trade_offers')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', offerId)
      .eq('offered_by_user_id', user.id)
      .eq('status', 'pending')

    redirect(`/trade-offers/${offerId}?cancelled=1`)
  }

  async function counterOfferAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    const currentOfferResult = await supabase
      .from('trade_offers')
      .select('*')
      .eq('id', offerId)
      .single()

    if (currentOfferResult.error || !currentOfferResult.data) {
      redirect(`/trade-offers/${offerId}?error=1`)
    }

    const currentOffer = currentOfferResult.data as TradeOfferRow
    if (
      currentOffer.status !== 'pending' ||
      currentOffer.last_action_by_user_id === user.id ||
      (currentOffer.offered_by_user_id !== user.id && currentOffer.requested_user_id !== user.id)
    ) {
      redirect(`/trade-offers/${offerId}`)
    }

    const offeredDeckId = Number(formData.get('offered_deck_id'))
    const cashEqualizationValue = String(formData.get('cash_equalization_usd') || '').trim()
    const cashEqualizationUsd =
      cashEqualizationValue === '' ? 0 : Math.max(0, Number(cashEqualizationValue))
    const message = String(formData.get('message') || '').trim()
    const requestedDeckIdForCounter =
      currentOffer.offered_by_user_id === user.id
        ? currentOffer.requested_deck_id
        : currentOffer.offered_deck_id
    const requestedUserIdForCounter =
      currentOffer.offered_by_user_id === user.id
        ? currentOffer.requested_user_id
        : currentOffer.offered_by_user_id

    if (!Number.isFinite(offeredDeckId)) {
      redirect(`/trade-offers/${offerId}?error=1`)
    }

    const offeredDeckResult = await supabase
      .from('decks')
      .select('id, user_id')
      .eq('id', offeredDeckId)
      .single()

    if (offeredDeckResult.error || !offeredDeckResult.data || offeredDeckResult.data.user_id !== user.id) {
      redirect(`/trade-offers/${offerId}?error=1`)
    }

    const insert = await supabase
      .from('trade_offers')
      .insert({
        offered_by_user_id: user.id,
        requested_user_id: requestedUserIdForCounter,
        offered_deck_id: offeredDeckId,
        requested_deck_id: requestedDeckIdForCounter,
        cash_equalization_usd: cashEqualizationUsd,
        message: message || null,
        parent_offer_id: currentOffer.id,
        last_action_by_user_id: user.id,
        offered_by_viewed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insert.error || !insert.data) {
      redirect(`/trade-offers/${offerId}?error=1`)
    }

    await supabase
      .from('trade_offers')
      .update({
        status: 'countered',
        superseded_by_offer_id: insert.data.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentOffer.id)

    redirect(`/trade-offers/${insert.data.id}?countered=1`)
  }

  const accepted = resolvedSearchParams.accepted === '1'
  const declined = resolvedSearchParams.declined === '1'
  const cancelled = resolvedSearchParams.cancelled === '1'
  const countered = resolvedSearchParams.countered === '1'
  const error = resolvedSearchParams.error === '1'
  const schemaMissing = resolvedSearchParams.schemaMissing === '1'

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap gap-3">
            <Link href="/trade-offers" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">
              {'<-'} Back to offers
            </Link>
            {offer.accepted_trade_transaction_id && (
              <Link href={`/trades/${offer.accepted_trade_transaction_id}`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
                View Trade Draft
              </Link>
            )}
          </div>

          <div className="mt-8">
            <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
              Trade Offer
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Offer #{offer.id}</h1>
            <p className="mt-3 max-w-3xl text-zinc-400">
              Created {formatTradeOfferTimestamp(offer.created_at)}. This is the negotiation step before the trade becomes a draft escrow transaction.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="space-y-4">
          {accepted && (
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-200">
              Offer accepted. The trade has been handed off into the escrow transaction foundation.
            </div>
          )}
          {declined && (
            <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm text-yellow-100">
              Offer declined.
            </div>
          )}
          {cancelled && (
            <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm text-yellow-100">
              Offer cancelled.
            </div>
          )}
          {countered && (
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-200">
              Counteroffer sent.
            </div>
          )}
          {schemaMissing && (
            <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm text-yellow-100">
              Run <code>docs/sql/escrow-transaction-foundation.sql</code> in Supabase before accepting offers into the trade draft flow.
            </div>
          )}
          {error && (
            <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">
              We couldn&apos;t complete that action right now.
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">Offer Status</h2>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300">
                  {formatTradeOfferStatus(offer.status)}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Offered deck</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {offeredDeck?.name || 'Unknown deck'}
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">
                    {offeredDeck?.commander || 'Commander not set'}
                  </div>
                  <div className="mt-3 text-sm text-emerald-300">
                    {formatUsd(offeredDeck?.price_total_usd_foil)}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Requested deck</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {requestedDeck?.name || 'Unknown deck'}
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">
                    {requestedDeck?.commander || 'Commander not set'}
                  </div>
                  <div className="mt-3 text-sm text-emerald-300">
                    {formatUsd(requestedDeck?.price_total_usd_foil)}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <div className="text-sm text-emerald-100/80">Cash equalization offered</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-300">
                  {formatUsd(offer.cash_equalization_usd)}
                </div>
              </div>

              {offer.superseded_by_offer_id && (
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                  This offer has been superseded by a counteroffer.
                  <Link
                    href={`/trade-offers/${offer.superseded_by_offer_id}`}
                    className="ml-2 font-medium text-emerald-300 hover:underline"
                  >
                    Open latest offer
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Message</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                {offer.message?.trim() || 'No message was added to this offer.'}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {canRespond && (
              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
                <h2 className="text-2xl font-semibold">Respond to Offer</h2>
                <p className="mt-2 text-sm text-emerald-50/80">
                  Accept to create a draft trade transaction, or decline to close this offer cleanly.
                </p>
                <div className="mt-5 grid gap-3">
                  <form action={acceptOfferAction}>
                    <button className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">
                      Accept and Create Trade Draft
                    </button>
                  </form>
                  <form action={declineOfferAction}>
                    <button className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10">
                      Decline Offer
                    </button>
                  </form>
                </div>
              </div>
            )}

            {canCancel && (
              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold">Sender Controls</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  This offer is still pending. You can cancel it before the other user responds.
                </p>
                <form action={cancelOfferAction} className="mt-5">
                  <button className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10">
                    Cancel Offer
                  </button>
                </form>
              </div>
            )}

            {canCounter && (
              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold">Counteroffer</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Change the deck you&apos;re putting on the table, adjust equalization, and send the negotiation back.
                </p>
                {ownDecks.length > 0 ? (
                  <form action={counterOfferAction} className="mt-5 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Your deck to offer back</label>
                      <select
                        name="offered_deck_id"
                        defaultValue={String(ownDecks[0]?.id ?? '')}
                        style={{ colorScheme: 'dark' }}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white"
                      >
                        {ownDecks.map((deck) => (
                          <option key={deck.id} value={deck.id} className="bg-zinc-900 text-white">
                            {deck.name} | {formatUsd(deck.price_total_usd_foil)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Cash equalization</label>
                      <input
                        name="cash_equalization_usd"
                        defaultValue={String(offer.cash_equalization_usd ?? 0)}
                        inputMode="decimal"
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Counter message</label>
                      <textarea
                        name="message"
                        rows={4}
                        placeholder="Explain what changed in the counteroffer."
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white"
                      />
                    </div>

                    <button className="w-full rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-medium text-emerald-300 hover:bg-emerald-400/15">
                      Send Counteroffer
                    </button>
                  </form>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-zinc-400">
                    You need at least one deck in your account to send a counteroffer.
                  </div>
                )}
              </div>
            )}

            {!canRespond && !canCancel && !canCounter && (
              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold">Offer State</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  This offer has already been resolved or is being viewed by a participant without a pending action.
                </p>
              </div>
            )}

            {offer.accepted_trade_transaction_id && (
              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold">Escrow Handoff</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Once accepted, this offer became a draft escrow transaction with both decks attached.
                </p>
                <Link
                  href={`/trades/${offer.accepted_trade_transaction_id}`}
                  className="mt-5 inline-block rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
                >
                  Open Trade Draft
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
