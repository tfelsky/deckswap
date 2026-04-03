import DeckCardViews from '@/components/deck-card-views'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import type { ImportedDeckCard } from '@/lib/commander/types'
import { validateDeckForFormat } from '@/lib/commander/validate'
import {
  calculatePercentChange,
  findImportSnapshot,
  findNearestSnapshotBeforeDays,
  formatPercentChange,
  type DeckPriceSnapshot,
} from '@/lib/decks/price-history'
import {
  formatSupportsCommanderRules,
  getDeckFormatLabel,
  normalizeDeckFormat,
} from '@/lib/decks/formats'
import { createClient } from '@/lib/supabase/server'
import { Info } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const ADMIN_EMAIL = 'tim.felsky@gmail.com'

type Deck = {
  id: number
  user_id?: string | null
  name: string
  commander?: string | null
  power_level?: number | null
  price_estimate?: number | null
  image_url?: string | null
  is_valid?: boolean | null
  validation_errors?: string[] | null
  commander_mode?: string | null
  format?: string | null
  imported_at?: string | null
  price_total_usd?: number | null
  price_total_usd_foil?: number | null
  price_total_eur?: number | null
}

type DeckCard = {
  id: number
  deck_id?: number
  section: 'commander' | 'mainboard'
  quantity: number
  card_name: string
  set_code?: string | null
  set_name?: string | null
  collector_number?: string | null
  foil?: boolean | null
  sort_order?: number | null
  image_url?: string | null
  price_usd?: number | null
  price_usd_foil?: number | null
  is_legendary?: boolean | null
  is_background?: boolean | null
  can_be_commander?: boolean | null
  keywords?: string[] | null
  partner_with_name?: string | null
  color_identity?: string[] | null
  finishes?: string[] | null
  oracle_text?: string | null
  type_line?: string | null
  rarity?: string | null
  mana_cost?: string | null
  cmc?: number | null
  power?: string | null
  toughness?: string | null
  oracle_id?: string | null
  scryfall_id?: string | null
  price_usd_etched?: number | null
  price_eur?: number | null
  price_eur_foil?: number | null
  price_tix?: number | null
}

type DeckToken = {
  id: number
  quantity: number
  token_name: string
  set_code?: string | null
  set_name?: string | null
  collector_number?: string | null
  foil?: boolean | null
  sort_order?: number | null
  image_url?: string | null
}

function toImportedDeckCard(card: DeckCard): ImportedDeckCard {
  return {
    section: card.section,
    quantity: card.quantity,
    cardName: card.card_name,
    foil: card.foil ?? false,
    setCode: card.set_code ?? undefined,
    setName: card.set_name ?? undefined,
    collectorNumber: card.collector_number ?? undefined,
    isLegendary: card.is_legendary ?? undefined,
    isBackground: card.is_background ?? undefined,
    canBeCommander: card.can_be_commander ?? undefined,
    keywords: card.keywords ?? undefined,
    partnerWithName: card.partner_with_name ?? undefined,
    colorIdentity: card.color_identity ?? undefined,
  }
}

function getCommanderCandidates(cards: DeckCard[]) {
  const eligible = cards.filter(
    (card) =>
      card.section === 'mainboard' &&
      (card.can_be_commander || card.is_legendary || card.is_background)
  )

  return eligible.length > 0
    ? eligible
    : cards.filter((card) => card.section === 'mainboard')
}

function formatImportedAt(value?: string | null) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function changeTone(value: number | null) {
  if (value == null) return 'text-zinc-400'
  if (value > 0) return 'text-emerald-300'
  if (value < 0) return 'text-red-300'
  return 'text-zinc-300'
}

export default async function DeckDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const deckId = Number(id)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select(
      'id, user_id, name, commander, power_level, price_estimate, image_url, is_valid, validation_errors, commander_mode, format, imported_at, price_total_usd, price_total_usd_foil, price_total_eur'
    )
    .eq('id', deckId)
    .single()

  if (deckError || !deck) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-400">Deck not found</h1>
          <p className="mt-2 text-sm text-zinc-300">Tried to load deck ID: {id}</p>
          {deckError && (
            <p className="mt-2 text-sm text-zinc-400">
              Supabase error: {deckError.message}
            </p>
          )}
          <Link
            href="/decks"
            className="mt-5 inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Back to decks
          </Link>
        </div>
      </main>
    )
  }

  const { data: cards, error: cardsError } = await supabase
    .from('deck_cards')
    .select(
      'id, deck_id, section, quantity, card_name, set_code, set_name, collector_number, foil, sort_order, image_url, price_usd, price_usd_foil, is_legendary, is_background, can_be_commander, keywords, partner_with_name, color_identity, finishes, oracle_text, type_line, rarity, mana_cost, cmc, power, toughness, oracle_id, scryfall_id, price_usd_etched, price_eur, price_eur_foil, price_tix'
    )
    .eq('deck_id', deckId)
    .order('section', { ascending: true })
    .order('sort_order', { ascending: true })

  const { data: tokens, error: tokensError } = await supabase
    .from('deck_tokens')
    .select(
      'id, quantity, token_name, set_code, set_name, collector_number, foil, sort_order, image_url'
    )
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })

  const { data: priceHistory } = await supabase
    .from('deck_price_history')
    .select('captured_at, price_total_usd_foil, snapshot_type')
    .eq('deck_id', deckId)
    .order('captured_at', { ascending: false })

  if (cardsError || tokensError) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-400">
            Failed to load deck contents
          </h1>
          {cardsError && (
            <p className="mt-2 text-sm text-zinc-300">
              deck_cards: {cardsError.message}
            </p>
          )}
          {tokensError && (
            <p className="mt-2 text-sm text-zinc-300">
              deck_tokens: {tokensError.message}
            </p>
          )}
        </div>
      </main>
    )
  }

  const typedDeck = deck as Deck
  const typedCards = (cards ?? []) as DeckCard[]
  const typedTokens = (tokens ?? []) as DeckToken[]
  const snapshots = (priceHistory ?? []) as DeckPriceSnapshot[]
  const isOwner = !!user && typedDeck.user_id === user.id
  const isAdmin = user?.email === ADMIN_EMAIL
  const deckFormat = normalizeDeckFormat(typedDeck.format)
  const isCommanderDeck = formatSupportsCommanderRules(deckFormat)
  const currentPrice = Number(typedDeck.price_total_usd_foil ?? 0)
  const importSnapshot = findImportSnapshot(snapshots)
  const change30 = calculatePercentChange(
    currentPrice,
    findNearestSnapshotBeforeDays(snapshots, 30)?.price_total_usd_foil ?? null
  )
  const change60 = calculatePercentChange(
    currentPrice,
    findNearestSnapshotBeforeDays(snapshots, 60)?.price_total_usd_foil ?? null
  )

  async function setCommanderAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    const chosenCardId = Number(formData.get('commander_card_id'))
    if (!Number.isFinite(chosenCardId)) {
      redirect(`/decks/${deckId}?imported=1`)
    }

    const { data: ownedDeck, error: ownedDeckError } = await supabase
      .from('decks')
      .select('id, user_id, format')
      .eq('id', deckId)
      .single()

    if (ownedDeckError || !ownedDeck || ownedDeck.user_id !== user.id) {
      redirect(`/decks/${deckId}`)
    }

    const { data: currentCards, error: currentCardsError } = await supabase
      .from('deck_cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('sort_order', { ascending: true })

    if (currentCardsError || !currentCards) {
      redirect(`/decks/${deckId}?imported=1`)
    }

    const selectedCard = (currentCards as DeckCard[]).find(
      (card) => card.id === chosenCardId
    )

    if (!selectedCard) {
      redirect(`/decks/${deckId}?imported=1`)
    }

    const { error: demoteError } = await supabase
      .from('deck_cards')
      .update({ section: 'mainboard' })
      .eq('deck_id', deckId)
      .eq('section', 'commander')

    if (demoteError) {
      redirect(`/decks/${deckId}?imported=1`)
    }

    if (selectedCard.quantity > 1) {
      const { error: reduceError } = await supabase
        .from('deck_cards')
        .update({ quantity: selectedCard.quantity - 1, section: 'mainboard' })
        .eq('id', selectedCard.id)

      if (reduceError) {
        redirect(`/decks/${deckId}?imported=1`)
      }

      const { id: _omitId, ...commanderInsert } = selectedCard

      const { error: insertError } = await supabase.from('deck_cards').insert({
        ...commanderInsert,
        deck_id: deckId,
        section: 'commander',
        quantity: 1,
      })

      if (insertError) {
        redirect(`/decks/${deckId}?imported=1`)
      }
    } else {
      const { error: promoteError } = await supabase
        .from('deck_cards')
        .update({ section: 'commander' })
        .eq('id', selectedCard.id)

      if (promoteError) {
        redirect(`/decks/${deckId}?imported=1`)
      }
    }

    const { data: refreshedCards, error: refreshedCardsError } = await supabase
      .from('deck_cards')
      .select(
        'id, section, quantity, card_name, set_code, set_name, collector_number, foil, sort_order, image_url, is_legendary, is_background, can_be_commander, keywords, partner_with_name, color_identity'
      )
      .eq('deck_id', deckId)
      .order('sort_order', { ascending: true })

    const { data: refreshedTokens, error: refreshedTokensError } = await supabase
      .from('deck_tokens')
      .select('quantity')
      .eq('deck_id', deckId)

    if (refreshedCardsError || !refreshedCards || refreshedTokensError) {
      redirect(`/decks/${deckId}?imported=1`)
    }

    const validation = validateDeckForFormat(
      (refreshedCards as DeckCard[]).map(toImportedDeckCard),
      ownedDeck.format
    )
    const commanderNames = (refreshedCards as DeckCard[])
      .filter((card) => card.section === 'commander')
      .map((card) => card.card_name)

    const primaryCommander = (refreshedCards as DeckCard[]).find(
      (card) => card.section === 'commander'
    )
    const tokenCount = (refreshedTokens ?? []).reduce(
      (sum, token) => sum + Number(token.quantity ?? 0),
      0
    )

    await supabase
      .from('decks')
      .update({
        commander: commanderNames[0] ?? null,
        commander_count: validation.commanderCount,
        mainboard_count: validation.mainboardCount,
        token_count: tokenCount,
        commander_mode: validation.commanderMode,
        commander_names: commanderNames,
        is_valid: validation.isValid,
        validation_errors: validation.errors,
        image_url: primaryCommander?.image_url ?? typedDeck.image_url ?? null,
      })
      .eq('id', deckId)

    redirect(`/decks/${deckId}?commanderUpdated=1`)
  }

  const commanders = typedCards.filter((card) => card.section === 'commander')
  const mainboard = typedCards.filter((card) => card.section === 'mainboard')
  const commanderCandidates = getCommanderCandidates(typedCards)
  const bracketSummary = getCommanderBracketSummary(typedCards)
  const showImportedWarning =
    resolvedSearchParams?.imported === '1' || typedDeck.is_valid === false
  const showCommanderUpdated = resolvedSearchParams?.commanderUpdated === '1'

  const tokenCards = typedTokens.map((token) => ({
    id: token.id,
    quantity: token.quantity,
    card_name: token.token_name,
    set_code: token.set_code,
    set_name: token.set_name,
    collector_number: token.collector_number,
    foil: token.foil,
    image_url: token.image_url,
    section: 'token' as const,
  }))

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/decks"
              className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
            >
              {'<-'} Back to marketplace
            </Link>

            <Link
              href="/import-deck"
              className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Import Deck
            </Link>

            {isOwner && (
              <Link
                href={`/my-decks/${deckId}?tab=settings`}
                className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Deck Settings
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                className="inline-block rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-400/15"
              >
                Admin Dashboard
              </Link>
            )}
          </div>

          {showCommanderUpdated && (
            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              Commander updated. The deck validation status has been recalculated.
            </div>
          )}

          {showImportedWarning &&
            typedDeck.validation_errors &&
            typedDeck.validation_errors.length > 0 && (
              <details open className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                <summary className="cursor-pointer list-none font-medium text-yellow-200">
                  Imported, but validation found issues
                </summary>
                <ul className="mt-3 list-disc pl-5 text-yellow-100/90">
                  {typedDeck.validation_errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </details>
            )}

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(280px,360px)_1fr] lg:items-start">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
              <div className="mx-auto w-full max-w-[10rem] p-5 pb-0">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 shadow-2xl">
                  <div className="aspect-[5/7]">
                    {typedDeck.image_url ? (
                      <img
                        src={typedDeck.image_url}
                        alt={typedDeck.name}
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full items-end p-6">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                            {getDeckFormatLabel(deckFormat)}
                          </div>
                          <div className="mt-2 text-3xl font-semibold">
                            {typedDeck.commander || typedDeck.name}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-300">
                  {getDeckFormatLabel(deckFormat)}
                </div>
                <h1 className="mt-4 text-3xl font-semibold">{typedDeck.name}</h1>
                <p className="mt-2 text-zinc-400">
                  Imported {formatImportedAt(typedDeck.imported_at)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {!typedDeck.commander &&
                isCommanderDeck &&
                isOwner &&
                commanderCandidates.length > 0 && (
                  <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5">
                    <div className="text-sm font-medium text-yellow-200">
                      Set Commander
                    </div>
                    <p className="mt-2 text-sm text-yellow-100/80">
                      This import did not mark a commander. Choose one from the
                      imported cards and we&apos;ll revalidate the deck here.
                    </p>
                    <form action={setCommanderAction} className="mt-4 space-y-3">
                      <select
                        name="commander_card_id"
                        defaultValue=""
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none focus:border-emerald-400/40"
                      >
                        <option value="">Select a commander</option>
                        {commanderCandidates.map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.card_name}
                          </option>
                        ))}
                      </select>
                      <button className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">
                        Save Commander
                      </button>
                    </form>
                  </div>
                )}

              {isCommanderDeck ? (
                <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    Commander Bracket
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <button type="button" className="text-zinc-500 hover:text-white">
                          <Info className="h-4 w-4" />
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent className="border-white/10 bg-zinc-900 text-zinc-100">
                        <div className="space-y-2 text-sm">
                          <p className="font-medium text-white">{bracketSummary.label}</p>
                          <p>{bracketSummary.description}</p>
                          <p className="text-zinc-400">{bracketSummary.bracketRule}</p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                  <div className="mt-2 text-3xl font-semibold">
                    {bracketSummary.label}
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    {bracketSummary.description}
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
                  <div className="text-sm text-zinc-400">Deck Format</div>
                  <div className="mt-2 text-3xl font-semibold">
                    {getDeckFormatLabel(deckFormat)}
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    This deck is using the relaxed import flow for broader supported formats.
                  </p>
                </div>
              )}

              {isCommanderDeck && (
                <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
                  <div className="text-sm text-zinc-400">Bracket Signals</div>
                  <div className="mt-2 text-3xl font-semibold text-emerald-300">
                    {bracketSummary.gameChangerCount}
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    Game Changer{bracketSummary.gameChangerCount === 1 ? '' : 's'} detected.
                  </p>
                  {bracketSummary.gameChangers.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {bracketSummary.gameChangers.slice(0, 6).map((cardName) => (
                        <span
                          key={cardName}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300"
                        >
                          {cardName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
                <div className="text-sm text-zinc-400">Current Value</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-300">
                  ${typedDeck.price_total_usd_foil?.toFixed(2) ?? '0.00'}
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  Based on blended card pricing using each card&apos;s foil setting.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
                <div className="text-sm text-zinc-400">Price Trend</div>
                <div className="mt-3 space-y-2 text-sm text-zinc-300">
                  <div>
                    Import snapshot:{' '}
                    {importSnapshot?.price_total_usd_foil != null
                      ? `$${Number(importSnapshot.price_total_usd_foil).toFixed(2)}`
                      : 'Awaiting first snapshot'}
                  </div>
                  <div className={changeTone(change30)}>
                    30d move: {formatPercentChange(change30) ?? 'Awaiting enough history'}
                  </div>
                  <div className={changeTone(change60)}>
                    60d move: {formatPercentChange(change60) ?? 'Awaiting enough history'}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
                <div className="text-sm text-zinc-400">Contents</div>
                <div className="mt-3 space-y-2 text-sm text-zinc-300">
                  <div>Commanders: {commanders.reduce((sum, card) => sum + card.quantity, 0)}</div>
                  <div>Mainboard: {mainboard.reduce((sum, card) => sum + card.quantity, 0)}</div>
                  <div>Tokens: {tokenCards.reduce((sum, card) => sum + card.quantity, 0)}</div>
                </div>
              </div>

              {isCommanderDeck && (
                <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
                  <div className="text-sm text-zinc-400">Bracket Notes</div>
                  <div className="mt-3 space-y-2 text-sm text-zinc-300">
                    {bracketSummary.notes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <DeckCardViews
          commanders={commanders}
          mainboard={mainboard}
          tokens={tokenCards}
        />
      </section>
    </main>
  )
}
