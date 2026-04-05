import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sendUserTransactionalEmailById } from '@/lib/email-events'
import { createNotification } from '@/lib/notifications'
import { isTradeOffersSchemaMissing } from '@/lib/trade-offers'
import FormActionButton from '@/components/form-action-button'

export const dynamic = 'force-dynamic'

type DeckOption = {
  id: number
  user_id?: string | null
  name: string
  commander?: string | null
  image_url?: string | null
  price_total_usd_foil?: number | null
  is_listed_for_trade?: boolean | null
}

function formatUsd(value?: number | null) {
  return `$${Number(value ?? 0).toFixed(2)}`
}

export default async function ProposeTradeOfferPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = searchParams ? await searchParams : {}
  const requestedDeckId = Number(Array.isArray(params.deckId) ? params.deckId[0] : params.deckId)

  if (!Number.isFinite(requestedDeckId)) {
    redirect('/decks')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/sign-in?next=/trade-offers/propose?deckId=${requestedDeckId}`)
  }

  const [requestedDeckResult, ownDecksResult] = await Promise.all([
    supabase
      .from('decks')
      .select('id, user_id, name, commander, image_url, price_total_usd_foil, is_listed_for_trade')
      .eq('id', requestedDeckId)
      .single(),
    supabase
      .from('decks')
      .select('id, user_id, name, commander, image_url, price_total_usd_foil, is_listed_for_trade')
      .eq('user_id', user.id)
      .order('id', { ascending: false }),
  ])

  if (requestedDeckResult.error || !requestedDeckResult.data) {
    redirect('/decks')
  }

  const requestedDeck = requestedDeckResult.data as DeckOption
  const ownDecks = ((ownDecksResult.data ?? []) as DeckOption[]).filter(
    (deck) => deck.id !== requestedDeck.id
  )

  if (requestedDeck.user_id === user.id) {
    redirect(`/decks/${requestedDeck.id}`)
  }

  if (!requestedDeck.is_listed_for_trade) {
    redirect(`/decks/${requestedDeck.id}`)
  }

  async function createOfferAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect(`/sign-in?next=/trade-offers/propose?deckId=${requestedDeckId}`)
    }

    const offeredDeckId = Number(formData.get('offered_deck_id'))
    const cashEqualizationValue = String(formData.get('cash_equalization_usd') || '').trim()
    const cashEqualizationUsd =
      cashEqualizationValue === '' ? 0 : Math.max(0, Number(cashEqualizationValue))
    const message = String(formData.get('message') || '').trim()

    if (!Number.isFinite(offeredDeckId)) {
      redirect(`/trade-offers/propose?deckId=${requestedDeckId}&error=1`)
    }

    const [offeredDeckResult, requestedDeckResult] = await Promise.all([
      supabase
        .from('decks')
        .select('id, user_id, is_listed_for_trade')
        .eq('id', offeredDeckId)
        .single(),
      supabase
        .from('decks')
        .select('id, user_id, is_listed_for_trade')
        .eq('id', requestedDeckId)
        .single(),
    ])

    if (
      offeredDeckResult.error ||
      !offeredDeckResult.data ||
      offeredDeckResult.data.user_id !== user.id ||
      requestedDeckResult.error ||
      !requestedDeckResult.data ||
      requestedDeckResult.data.user_id === user.id ||
      requestedDeckResult.data.is_listed_for_trade !== true
    ) {
      redirect(`/trade-offers/propose?deckId=${requestedDeckId}&error=1`)
    }

    const insert = await supabase
      .from('trade_offers')
      .insert({
        offered_by_user_id: user.id,
        requested_user_id: requestedDeckResult.data.user_id,
        offered_deck_id: offeredDeckId,
        requested_deck_id: requestedDeckId,
        cash_equalization_usd: cashEqualizationUsd,
        message: message || null,
        last_action_by_user_id: user.id,
        offered_by_viewed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insert.error) {
      if (isTradeOffersSchemaMissing(insert.error.message)) {
        redirect(`/trade-offers/propose?deckId=${requestedDeckId}&schemaMissing=1`)
      }
      redirect(`/trade-offers/propose?deckId=${requestedDeckId}&error=1`)
    }

    await createNotification(supabase, {
      userId: requestedDeckResult.data.user_id,
      actorUserId: user.id,
      type: 'trade_offer_created',
      title: 'New trade offer received',
      body: message
        ? `A user sent a trade offer on your deck and included a note.`
        : 'A user sent a trade offer on your deck.',
      href: `/trade-offers/${insert.data.id}`,
      metadata: {
        offerId: insert.data.id,
        offeredDeckId,
        requestedDeckId,
      },
    })

    try {
      await sendUserTransactionalEmailById({
        userId: requestedDeckResult.data.user_id,
        subject: 'New trade offer received',
        body: message
          ? 'A user sent a trade offer on your deck and included a note. Review the offer and decide whether to accept, decline, or counter.'
          : 'A user sent a trade offer on your deck. Review the offer and decide whether to accept, decline, or counter.',
        href: `/trade-offers/${insert.data.id}`,
        ctaLabel: 'Review trade offer',
        idempotencyKey: `trade-offer-created:${insert.data.id}`,
        eyebrow: 'Trade offer',
      })
    } catch (error) {
      console.error('Failed to send trade offer email:', error)
    }

    redirect(`/trade-offers/${insert.data.id}?created=1`)
  }

  const schemaMissing = params.schemaMissing === '1'
  const error = params.error === '1'

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/decks/${requestedDeck.id}`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
            >
              {'<-'} Back to deck
            </Link>
            <Link
              href="/trade-offers"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Trade Offers
            </Link>
          </div>

          <div className="mt-8 max-w-4xl">
            <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
              Propose Trade
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Offer one of your decks for this listing
            </h1>
            <p className="mt-3 max-w-3xl text-zinc-400">
              Pick one of your decks, add optional cash equalization, and send a note to the other
              user. If they accept, we can hand the offer straight into the escrow transaction flow.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <div className="text-sm uppercase tracking-[0.2em] text-zinc-500">Requested deck</div>
            <h2 className="mt-3 text-2xl font-semibold text-white">{requestedDeck.name}</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {requestedDeck.commander || 'Commander not set'}
            </p>

            <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
              <div className="aspect-[16/10]">
                {requestedDeck.image_url ? (
                  <img
                    src={requestedDeck.image_url}
                    alt={requestedDeck.name}
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full items-end bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-5">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                        Deck Listing
                      </div>
                      <div className="mt-2 text-xl font-semibold text-white">
                        {requestedDeck.commander || requestedDeck.name}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <div className="text-sm text-emerald-100/80">Current blended value</div>
              <div className="mt-2 text-3xl font-semibold text-emerald-300">
                {formatUsd(requestedDeck.price_total_usd_foil)}
              </div>
              <p className="mt-3 text-sm text-emerald-50/85">
                Blended value is the saved deck total from its current card rows, not a guaranteed sale price.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Your offer</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Choose one of your decks and add any context the other user should see.
                </p>
              </div>
            </div>

            {schemaMissing && (
              <div className="mt-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm text-yellow-100">
                Run <code>docs/sql/trade-offers.sql</code> in Supabase to enable persistent trade offers.
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">
                We couldn&apos;t create that trade offer. Double-check your selected deck and try again.
              </div>
            )}

            {ownDecks.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
                <h3 className="text-xl font-semibold">You need a deck to offer</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Import or create one of your own decks first, then come back and propose a trade.
                </p>
                <Link
                  href="/import-deck"
                  className="mt-5 inline-block rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
                >
                  Import a deck
                </Link>
              </div>
            ) : (
              <form action={createOfferAction} className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Your deck to offer</label>
                  <select
                    name="offered_deck_id"
                    defaultValue={String(ownDecks[0]?.id ?? '')}
                    style={{ colorScheme: 'dark' }}
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-emerald-400/40"
                  >
                    {ownDecks.map((deck) => (
                      <option key={deck.id} value={deck.id} className="bg-zinc-900 text-white">
                        {deck.name} | {deck.commander || 'Commander not set'} | {formatUsd(deck.price_total_usd_foil)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-400">
                    Cash equalization you&apos;re offering
                  </label>
                  <input
                    name="cash_equalization_usd"
                    defaultValue="0"
                    inputMode="decimal"
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-emerald-400/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Message</label>
                  <textarea
                    name="message"
                    rows={5}
                    placeholder="Share why you think the decks are a fit, condition notes, or any trade context."
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-emerald-400/40"
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                  If this offer is accepted, DeckSwap can turn it into a draft escrow transaction with both decks and the value difference already attached.
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                  Pick the deck that is actually closest in value and play pattern. You can still leave a note if your deck has unusual condition, accessories, or upgrades that are not obvious from the total alone.
                </div>

                <FormActionButton
                  pendingLabel="Sending trade offer..."
                  className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Send Trade Offer
                </FormActionButton>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
