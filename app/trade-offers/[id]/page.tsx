import Link from 'next/link'
import { redirect } from 'next/navigation'
import FormActionButton from '@/components/form-action-button'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import {
  buildTradeDraftRows,
  isEscrowSchemaMissing,
  normalizeSupportedCountry,
} from '@/lib/escrow/foundation'
import {
  formatTradeOfferStatus,
  formatTradeOfferTimestamp,
  getTradeOfferSignal,
  isTradeOffersSchemaMissing,
  isUnreadTradeOffer,
  type TradeOfferSignalTone,
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

function getSignalToneClasses(tone: TradeOfferSignalTone) {
  switch (tone) {
    case 'emerald':
      return {
        badge: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
        panel: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
        emphasis: 'text-emerald-200',
        muted: 'text-emerald-100/75',
      }
    case 'amber':
      return {
        badge: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
        panel: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
        emphasis: 'text-amber-100',
        muted: 'text-amber-100/75',
      }
    case 'sky':
      return {
        badge: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
        panel: 'border-sky-400/20 bg-sky-400/10 text-sky-100',
        emphasis: 'text-sky-100',
        muted: 'text-sky-100/75',
      }
    case 'red':
      return {
        badge: 'border-red-400/20 bg-red-400/10 text-red-200',
        panel: 'border-red-400/20 bg-red-400/10 text-red-100',
        emphasis: 'text-red-100',
        muted: 'text-red-100/75',
      }
    case 'zinc':
    default:
      return {
        badge: 'border-white/10 bg-white/5 text-zinc-300',
        panel: 'border-white/10 bg-white/5 text-zinc-200',
        emphasis: 'text-zinc-100',
        muted: 'text-zinc-400',
      }
  }
}

function buildActionErrorHref(
  offerId: number,
  step: string,
  message?: string | null,
  code?: string | null
) {
  const params = new URLSearchParams({ error: '1', step })
  if (message) {
    params.set('message', message.slice(0, 240))
  }
  if (code) {
    params.set('code', code)
  }
  return `/trade-offers/${offerId}?${params.toString()}`
}

async function findExistingTradeDraftForOffer(
  supabase: ReturnType<typeof createAdminClient>,
  offerId: number
) {
  const existingTradeEvent = await supabase
    .from('escrow_events')
    .select('transaction_id')
    .eq('event_type', 'trade_offer_accepted')
    .contains('event_data', { offerId, source: 'trade_offer' })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingTradeEvent.error) {
    if (isEscrowSchemaMissing(existingTradeEvent.error.message)) {
      return { schemaMissing: true as const, transactionId: null }
    }
    return { schemaMissing: false as const, transactionId: null }
  }

  return {
    schemaMissing: false as const,
    transactionId: Number(existingTradeEvent.data?.transaction_id ?? 0) || null,
  }
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
  const offerSignal = getTradeOfferSignal(offer, user.id)
  const signalTone = getSignalToneClasses(offerSignal.tone)
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
      redirect(
        buildActionErrorHref(
          offerId,
          'load_offer',
          currentOfferResult.error?.message ?? 'Unable to load current offer.',
          currentOfferResult.error?.code
        )
      )
    }

    const currentOffer = currentOfferResult.data as TradeOfferRow
    if (currentOffer.accepted_trade_transaction_id) {
      redirect(`/trade-offers/${offerId}?accepted=1`)
    }

    if (currentOffer.requested_user_id !== user.id || currentOffer.status !== 'pending') {
      redirect(`/trade-offers/${offerId}`)
    }

    const adminSupabase = createAdminClient()
    const existingTrade = await findExistingTradeDraftForOffer(adminSupabase, offerId)
    if (existingTrade.schemaMissing) {
      redirect(`/trade-offers/${offerId}?schemaMissing=1`)
    }

    if (existingTrade.transactionId) {
      const repairOfferUpdate = await adminSupabase
        .from('trade_offers')
        .update({
          status: 'accepted',
          accepted_trade_transaction_id: existingTrade.transactionId,
          last_action_by_user_id: user.id,
          requested_user_viewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId)

      if (repairOfferUpdate.error && isTradeOffersSchemaMissing(repairOfferUpdate.error.message)) {
        redirect(`/trade-offers/${offerId}?schemaMissing=1`)
      }

      redirect(`/trade-offers/${offerId}?accepted=1`)
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
      redirect(buildActionErrorHref(offerId, 'load_decks', 'Offer decks could not be loaded.'))
    }

    const now = new Date().toISOString()
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
      user.id
    )
    rows.transaction.status = 'awaiting_payment'
    rows.transaction.payment_requested_at = now

    const transactionInsert = await adminSupabase
      .from('trade_transactions')
      .insert(rows.transaction)
      .select('id')
      .single()

    if (transactionInsert.error || !transactionInsert.data) {
      if (isEscrowSchemaMissing(transactionInsert.error?.message)) {
        redirect(`/trade-offers/${offerId}?schemaMissing=1`)
      }
      redirect(
        buildActionErrorHref(
          offerId,
          'transaction_insert',
          transactionInsert.error?.message ?? 'Trade transaction insert failed.',
          transactionInsert.error?.code
        )
      )
    }

    const transactionId = transactionInsert.data.id

    const participantInsert = await adminSupabase.from('trade_transaction_participants').insert([
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
      if (isEscrowSchemaMissing(participantInsert.error.message)) {
        redirect(`/trade-offers/${offerId}?schemaMissing=1`)
      }
      redirect(
        buildActionErrorHref(
          offerId,
          'participant_insert',
          participantInsert.error.message,
          participantInsert.error.code
        )
      )
    }

    const eventInsert = await adminSupabase.from('escrow_events').insert({
      ...rows.initialEvent,
      transaction_id: transactionId,
      event_type: 'trade_offer_accepted',
      event_data: {
        offerId,
        source: 'trade_offer',
      },
    })

    if (eventInsert.error) {
      if (isEscrowSchemaMissing(eventInsert.error.message)) {
        redirect(`/trade-offers/${offerId}?schemaMissing=1`)
      }
      redirect(
        buildActionErrorHref(
          offerId,
          'event_insert',
          eventInsert.error.message,
          eventInsert.error.code
        )
      )
    }

    await adminSupabase.from('escrow_events').insert({
      transaction_id: transactionId,
      actor_user_id: user.id,
      event_type: 'payment_requested',
      event_data: {
        requestedAt: now,
        source: 'trade_offer_acceptance',
      },
    })

    const offerUpdate = await adminSupabase
      .from('trade_offers')
      .update({
        status: 'accepted',
        accepted_trade_transaction_id: transactionId,
        last_action_by_user_id: user.id,
        requested_user_viewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', offerId)

    if (offerUpdate.error) {
      if (isTradeOffersSchemaMissing(offerUpdate.error.message)) {
        redirect(`/trade-offers/${offerId}?schemaMissing=1`)
      }
      redirect(
        buildActionErrorHref(
          offerId,
          'offer_update',
          offerUpdate.error.message,
          offerUpdate.error.code
        )
      )
    }

    await createNotification(supabase, {
      userId: currentOffer.offered_by_user_id,
      actorUserId: user.id,
      type: 'trade_offer_accepted',
      title: 'Your trade offer was accepted',
      body: 'Your accepted offer is live. Review the trade draft, choose any shipping add-ons, and pay your side to move into shipment.',
      href: `/trades/${transactionId}`,
      metadata: {
        offerId,
        tradeTransactionId: transactionId,
      },
    })

    await createNotification(supabase, {
      userId: currentOffer.requested_user_id,
      actorUserId: user.id,
      type: 'trade_draft_created',
      title: 'Trade accepted and payment opened',
      body: 'Your accepted trade is now ready for checkout. Review your obligation summary and pay to unlock shipment instructions.',
      href: `/trades/${transactionId}`,
      metadata: {
        offerId,
        tradeTransactionId: transactionId,
      },
    })

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
        last_action_by_user_id: user.id,
        requested_user_viewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', offerId)
      .eq('requested_user_id', user.id)
      .eq('status', 'pending')

    await createNotification(supabase, {
      userId: offer.offered_by_user_id,
      actorUserId: user.id,
      type: 'trade_offer_declined',
      title: 'Trade offer declined',
      body: 'One of your trade offers was declined.',
      href: `/trade-offers/${offerId}`,
      metadata: {
        offerId,
      },
    })

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
        last_action_by_user_id: user.id,
        offered_by_viewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', offerId)
      .eq('offered_by_user_id', user.id)
      .eq('status', 'pending')

    await createNotification(supabase, {
      userId: offer.requested_user_id,
      actorUserId: user.id,
      type: 'trade_offer_cancelled',
      title: 'Trade offer cancelled',
      body: 'A pending trade offer was cancelled before you responded.',
      href: `/trade-offers/${offerId}`,
      metadata: {
        offerId,
      },
    })

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
        last_action_by_user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentOffer.id)

    await createNotification(supabase, {
      userId: requestedUserIdForCounter,
      actorUserId: user.id,
      type: 'trade_offer_countered',
      title: 'Counteroffer received',
      body: message
        ? 'A trade offer came back with changes and a new note.'
        : 'A trade offer came back with changes.',
      href: `/trade-offers/${insert.data.id}`,
      metadata: {
        offerId: insert.data.id,
        parentOfferId: currentOffer.id,
      },
    })

    redirect(`/trade-offers/${insert.data.id}?countered=1`)
  }

  const accepted = resolvedSearchParams.accepted === '1'
  const declined = resolvedSearchParams.declined === '1'
  const cancelled = resolvedSearchParams.cancelled === '1'
  const countered = resolvedSearchParams.countered === '1'
  const error = resolvedSearchParams.error === '1'
  const schemaMissing = resolvedSearchParams.schemaMissing === '1'
  const errorStep =
    typeof resolvedSearchParams.step === 'string' ? resolvedSearchParams.step : null
  const errorMessage =
    typeof resolvedSearchParams.message === 'string' ? resolvedSearchParams.message : null
  const errorCode =
    typeof resolvedSearchParams.code === 'string' ? resolvedSearchParams.code : null

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
            <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium tracking-wide ${signalTone.badge}`}>
              {offerSignal.label}
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Offer #{offer.id}</h1>
            <p className="mt-3 max-w-3xl text-zinc-400">
              Created {formatTradeOfferTimestamp(offer.created_at)}. This is the negotiation step before the trade becomes a draft escrow transaction.
            </p>
            <div className={`mt-4 rounded-2xl border px-4 py-4 text-sm ${signalTone.panel}`}>
              <div className={`text-sm font-semibold uppercase tracking-[0.16em] ${signalTone.emphasis}`}>
                {offerSignal.label}
              </div>
              <p className={`mt-2 max-w-2xl leading-6 ${signalTone.muted}`}>
                {offerSignal.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="space-y-4">
          {accepted && (
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-200">
              Offer accepted. Payment is now open for both sides, and the trade has been handed off into the escrow transaction foundation.
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
              {errorStep ? (
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-red-200/80">
                  Step: {errorStep.replace(/_/g, ' ')}
                </div>
              ) : null}
              {errorCode ? <div className="mt-2 text-xs text-red-100/80">Code: {errorCode}</div> : null}
              {errorMessage ? <div className="mt-2 text-xs text-red-100/80">{errorMessage}</div> : null}
            </div>
          )}
          {offer.accepted_trade_transaction_id && (
            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm text-emerald-100">
              Trade draft #{offer.accepted_trade_transaction_id} is already open for this offer.
              <Link
                href={`/trades/${offer.accepted_trade_transaction_id}`}
                className="ml-2 font-medium text-emerald-300 hover:underline"
              >
                Open trade draft
              </Link>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">Offer Status</h2>
                <div className={`rounded-full border px-3 py-1 text-sm ${signalTone.badge}`}>
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
                    <FormActionButton
                      pendingLabel="Creating trade draft..."
                      className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 transition hover:opacity-90 disabled:cursor-wait disabled:opacity-80"
                    >
                      Accept and Create Trade Draft
                    </FormActionButton>
                  </form>
                  <form action={declineOfferAction}>
                    <FormActionButton
                      pendingLabel="Declining..."
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-80"
                    >
                      Decline Offer
                    </FormActionButton>
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
                  <FormActionButton
                    pendingLabel="Cancelling..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-80"
                  >
                    Cancel Offer
                  </FormActionButton>
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

                    <FormActionButton
                      pendingLabel="Sending counteroffer..."
                      className="w-full rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-400/15 disabled:cursor-wait disabled:opacity-80"
                    >
                      Send Counteroffer
                    </FormActionButton>
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
