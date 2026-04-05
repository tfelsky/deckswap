import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import AppHeader from '@/components/app-header'
import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import { validateDeckForFormat } from '@/lib/commander/validate'
import {
  SUPPORTED_CURRENCIES,
  convertDeckValueForCurrency,
  currencyLabel,
  formatCurrencyAmount,
  normalizeSupportedCurrency,
} from '@/lib/currency'
import { CARD_CONDITION_DETAILS, CARD_CONDITIONS, getCardConditionMeta, normalizeCardCondition } from '@/lib/decks/conditions'
import { getDeckFormatLabel, SUPPORTED_DECK_FORMATS, formatSupportsCommanderRules, normalizeDeckFormat } from '@/lib/decks/formats'
import {
  getInventoryStatusBadgeClass,
  getInventoryStatusDescription,
  getInventoryStatusLabel,
  getInventoryStatusVisibility,
  isInventoryStatusLocked,
  normalizeInventoryStatus,
  resolveInventoryStatusForSettings,
} from '@/lib/decks/inventory-status'
import { getDeckMarketingChips, normalizeBoxType } from '@/lib/decks/marketing'
import { ALL_COLOR_FILTERS } from '@/lib/decks/color-identity'
import { getUnreadNotificationsCount } from '@/lib/notifications'
import { calculatePercentChange, findImportSnapshot, findNearestSnapshotBeforeDays, formatPercentChange, type DeckPriceSnapshot } from '@/lib/decks/price-history'
import { calculateGuaranteedBuyNowOffer, calculateSuggestedBuyNowPrice } from '@/lib/decks/trade-value'
import { isUnreadTradeOffer, type TradeOfferRow } from '@/lib/trade-offers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import ConfirmFormActionButton from '@/components/confirm-form-action-button'
import { BuyNowQuoteGate } from '@/components/buy-now-quote-gate'

export const dynamic = 'force-dynamic'

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

function parseCurrencyInput(value: FormDataEntryValue | null) {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(2)) : null
}

const HOLIDAY_PROGRAM_ADDRESS =
  'Mythiverse Exchange Holiday program, 126 Green St, Sarnia, Ontario N7T 2X2'

function formatAuctionLaneLabel(status?: string | null) {
  if (!status) return 'Auction Inactive'

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default async function ManageDeckPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const deckId = Number(id)

  if (!Number.isFinite(deckId)) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Invalid deck ID</h1>
          <p className="mt-2 text-sm text-zinc-300">Route value: {id}</p>
          <Link
            href="/my-decks"
            className="mt-5 inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Back to My Decks
          </Link>
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

  const { data: deck, error } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .single()

  const { data: deckCards } = await supabase
    .from('deck_cards')
    .select('id, card_name, section, quantity, cmc, mana_cost, set_code, set_name, collector_number, foil, condition, condition_source, image_url, price_usd, price_usd_foil, is_legendary, is_background, can_be_commander, keywords, partner_with_name, color_identity')
    .eq('deck_id', deckId)

  const { data: priceHistory } = await supabase
    .from('deck_price_history')
    .select('captured_at, price_total_usd_foil, snapshot_type')
    .eq('deck_id', deckId)
    .order('captured_at', { ascending: false })

  const { data: tradeOffersData } = await supabase
    .from('trade_offers')
    .select('id, offered_by_user_id, requested_user_id, offered_deck_id, requested_deck_id, cash_equalization_usd, status, message, accepted_trade_transaction_id, last_action_by_user_id, offered_by_viewed_at, requested_user_viewed_at, created_at, updated_at')
    .or(`offered_by_user_id.eq.${user.id},requested_user_id.eq.${user.id}`)

  const { data: auctionListing } = await supabase
    .from('auction_listings')
    .select('id, status, ends_at')
    .eq('deck_id', deckId)
    .in('status', ['active', 'pending_confirmation', 'awaiting_payment', 'paid', 'shipped', 'delivered'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const bracketSummary = getCommanderBracketSummary((deckCards ?? []) as Array<{
    card_name: string
    section: 'commander' | 'mainboard' | 'sideboard' | 'token'
    quantity: number
    cmc?: number | null
    mana_cost?: string | null
  }>)

  if (error || !deck) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Deck not found</h1>
          <p className="mt-2 text-sm text-zinc-300">Tried deck ID: {deckId}</p>
          {error && (
            <p className="mt-2 text-sm text-zinc-400">Supabase: {error.message}</p>
          )}
          <Link
            href="/my-decks"
            className="mt-5 inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Back to My Decks
          </Link>
        </div>
      </main>
    )
  }

  if (deck.user_id !== user.id) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Not authorized</h1>
          <p className="mt-2 text-sm text-zinc-300">
            This deck does not belong to your account.
          </p>
          <Link
            href="/my-decks"
            className="mt-5 inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Back to My Decks
          </Link>
        </div>
      </main>
    )
  }

  const unreadTradeOffers = ((tradeOffersData ?? []) as TradeOfferRow[]).filter((offer) =>
    isUnreadTradeOffer(offer, user.id)
  ).length
  const unreadNotifications = await getUnreadNotificationsCount(supabase, user.id)

  const access = await getAdminAccessForUser(user)
  const isAdmin = access.isAdmin
  const activeTab =
    resolvedSearchParams?.tab === 'settings' ? 'settings' : 'overview'
  const deckFormat = normalizeDeckFormat(deck.format)
  const isCommanderDeck = formatSupportsCommanderRules(deckFormat)
  const snapshots = (priceHistory ?? []) as DeckPriceSnapshot[]
  const gradingCards = ((deckCards ?? []) as Array<{
    id: number
    card_name: string
    section: 'commander' | 'mainboard' | 'sideboard'
    quantity: number
    set_code?: string | null
    collector_number?: string | null
    condition?: string | null
    condition_source?: string | null
    image_url?: string | null
    foil?: boolean | null
    price_usd?: number | string | null
    price_usd_foil?: number | string | null
    price_eur?: number | string | null
    price_eur_foil?: number | string | null
  }>)
    .map((card) => {
      const unitPrice = Number(
        (card.foil ? card.price_usd_foil : null) ?? card.price_usd ?? 0
      )
      return {
        ...card,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      }
    })
    .sort((a, b) => b.unitPrice - a.unitPrice || a.card_name.localeCompare(b.card_name))
  const currentPrice = Number(deck.price_total_usd_foil ?? 0)
  const importSnapshot = findImportSnapshot(snapshots)
  const change30 = calculatePercentChange(
    currentPrice,
    findNearestSnapshotBeforeDays(snapshots, 30)?.price_total_usd_foil ?? null
  )
  const change60 = calculatePercentChange(
    currentPrice,
    findNearestSnapshotBeforeDays(snapshots, 60)?.price_total_usd_foil ?? null
  )
  const highestValueCard = gradingCards[0] ?? null
  const buyNowCurrency = normalizeSupportedCurrency(
    (deck as typeof deck & { buy_now_currency?: string | null }).buy_now_currency
  )
  const buyNowSuggestionUsd = calculateSuggestedBuyNowPrice(currentPrice)
  const guaranteedBuyNowUsd = calculateGuaranteedBuyNowOffer(currentPrice)
  const buyNowSuggestion = {
    floor: convertDeckValueForCurrency({
      usdValue: buyNowSuggestionUsd.floor,
      eurValue: buyNowSuggestionUsd.floor * 0.92,
      currency: buyNowCurrency,
    }),
    suggested: convertDeckValueForCurrency({
      usdValue: buyNowSuggestionUsd.suggested,
      eurValue: buyNowSuggestionUsd.suggested * 0.92,
      currency: buyNowCurrency,
    }),
    ceiling: convertDeckValueForCurrency({
      usdValue: buyNowSuggestionUsd.ceiling,
      eurValue: buyNowSuggestionUsd.ceiling * 0.92,
      currency: buyNowCurrency,
    }),
  }
  const guaranteedBuyNow = convertDeckValueForCurrency({
    usdValue: guaranteedBuyNowUsd.guaranteedOffer,
    eurValue: guaranteedBuyNowUsd.guaranteedOffer * 0.92,
    currency: buyNowCurrency,
  })
  const guaranteedHaircut = convertDeckValueForCurrency({
    usdValue: guaranteedBuyNowUsd.haircut,
    eurValue: guaranteedBuyNowUsd.haircut * 0.92,
    currency: buyNowCurrency,
  })
  const selectedWantedColors = new Set(
    ((deck as typeof deck & { wanted_color_identities?: string[] | null }).wanted_color_identities ?? []).map(
      (value: string) => String(value)
    )
  )
  const selectedWantedFormats = new Set(
    ((deck as typeof deck & { wanted_formats?: string[] | null }).wanted_formats ?? []).map((value: string) =>
      String(value)
    )
  )
  const inventoryStatus = normalizeInventoryStatus(
    (deck as typeof deck & { inventory_status?: string | null }).inventory_status
  )
  const inventoryStatusLocked = isInventoryStatusLocked(inventoryStatus)
  const deckSwapLaneLive = !!(deck as typeof deck & { is_listed_for_trade?: boolean | null }).is_listed_for_trade
  const buyNowLaneLive =
    Number((deck as typeof deck & { buy_now_price_usd?: number | null }).buy_now_price_usd ?? 0) > 0
  const auctionLaneStatus = String(auctionListing?.status ?? '').trim() || null
  const auctionLaneLive = !!auctionLaneStatus
  const holidayDonationSubmittedAt = (
    deck as typeof deck & { holiday_donation_submitted_at?: string | null }
  ).holiday_donation_submitted_at
  const holidayDonationAgreedAt = (
    deck as typeof deck & { holiday_donation_agreed_at?: string | null }
  ).holiday_donation_agreed_at

  async function syncDeckAfterCardMutation(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
    const { data: ownedDeck, error: ownedDeckError } = await supabase
      .from('decks')
      .select('id, user_id, format, image_url')
      .eq('id', deckId)
      .eq('user_id', userId)
      .single()

    if (ownedDeckError || !ownedDeck) {
      redirect(`/my-decks/${deckId}?tab=settings`)
    }

    const { data: refreshedCards, error: refreshedCardsError } = await supabase
      .from('deck_cards')
      .select(
        'id, section, quantity, card_name, set_code, set_name, collector_number, foil, image_url, is_legendary, is_background, can_be_commander, keywords, partner_with_name, color_identity, price_usd, price_usd_foil'
      )
      .eq('deck_id', deckId)

    const { data: refreshedTokens, error: refreshedTokensError } = await supabase
      .from('deck_tokens')
      .select('quantity')
      .eq('deck_id', deckId)

    if (refreshedCardsError || !refreshedCards || refreshedTokensError) {
      redirect(`/my-decks/${deckId}?tab=settings`)
    }

    const typedCards = refreshedCards as Array<{
      section: 'commander' | 'mainboard' | 'sideboard'
      quantity: number
      card_name: string
      set_code?: string | null
      set_name?: string | null
      collector_number?: string | null
      foil?: boolean | null
      image_url?: string | null
      is_legendary?: boolean | null
      is_background?: boolean | null
      can_be_commander?: boolean | null
      keywords?: string[] | null
      partner_with_name?: string | null
      color_identity?: string[] | null
      price_usd?: number | null
      price_usd_foil?: number | null
    }>

    const validation = validateDeckForFormat(
      typedCards.map((card) => ({
        section: card.section,
        quantity: card.quantity,
        cardName: card.card_name,
        setCode: card.set_code ?? undefined,
        setName: card.set_name ?? undefined,
        collectorNumber: card.collector_number ?? undefined,
        foil: card.foil ?? false,
        isLegendary: card.is_legendary ?? undefined,
        isBackground: card.is_background ?? undefined,
        canBeCommander: card.can_be_commander ?? undefined,
        keywords: card.keywords ?? undefined,
        partnerWithName: card.partner_with_name ?? undefined,
        colorIdentity: card.color_identity ?? undefined,
      })),
      normalizeDeckFormat(ownedDeck.format)
    )

    const commanderNames = typedCards
      .filter((card) => card.section === 'commander')
      .map((card) => card.card_name)
    const primaryCommander = typedCards.find((card) => card.section === 'commander')
    const tokenCount = (refreshedTokens ?? []).reduce(
      (sum, token) => sum + Number(token.quantity ?? 0),
      0
    )
    const priceTotalUsd = typedCards.reduce(
      (sum, card) => sum + Number(card.price_usd ?? 0) * Number(card.quantity ?? 0),
      0
    )
    const priceTotalUsdFoil = typedCards.reduce((sum, card) => {
      const unitPrice = Number((card.foil ? card.price_usd_foil : null) ?? card.price_usd ?? 0)
      return sum + unitPrice * Number(card.quantity ?? 0)
    }, 0)

    await supabase
      .from('decks')
      .update({
        commander: commanderNames[0] ?? null,
        commander_count: validation.commanderCount,
        mainboard_count: validation.mainboardCount,
        sideboard_count: validation.sideboardCount ?? 0,
        token_count: tokenCount,
        commander_mode: validation.commanderMode,
        commander_names: commanderNames,
        is_valid: validation.isValid,
        validation_errors: validation.errors,
        image_url: primaryCommander?.image_url ?? ownedDeck.image_url ?? null,
        price_total_usd: Number(priceTotalUsd.toFixed(2)),
        price_total_usd_foil: Number(priceTotalUsdFoil.toFixed(2)),
      })
      .eq('id', deckId)
      .eq('user_id', userId)
  }

  async function updateOverview(formData: FormData) {
    'use server'

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    const name = formData.get('name') as string
    const commander = formData.get('commander') as string

    await supabase
      .from('decks')
      .update({
        name,
        commander: commander || null,
      })
      .eq('id', deckId)
      .eq('user_id', user.id)

    redirect(`/my-decks/${deckId}`)
  }

  async function updateSettings(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    const nextFormat = normalizeDeckFormat(String(formData.get('format') || 'unknown'))
    const isSleeved = formData.get('is_sleeved') === 'on'
    const isBoxed = formData.get('is_boxed') === 'on'
    const isSealed = formData.get('is_sealed') === 'on'
    const isCompletePrecon = formData.get('is_complete_precon') === 'on'
    const isListedForTrade = formData.get('is_listed_for_trade') === 'on'
    const boxType = isBoxed ? normalizeBoxType(String(formData.get('box_type') || '')) : null
    const tradeListingNotes = String(formData.get('trade_listing_notes') || '').trim() || null
    const tradeWantedProfile = String(formData.get('trade_wanted_profile') || '').trim() || null
    const buyNowPriceUsd = parseCurrencyInput(formData.get('buy_now_price_usd'))
    const buyNowCurrency = normalizeSupportedCurrency(
      String(formData.get('buy_now_currency') || 'USD')
    )
    const buyNowListingNotes = String(formData.get('buy_now_listing_notes') || '').trim() || null
    const inventoryStatus = resolveInventoryStatusForSettings({
      currentStatus: (deck as typeof deck & { inventory_status?: string | null }).inventory_status,
      isListedForTrade,
      buyNowPrice: buyNowPriceUsd,
    })
    const wantedColorIdentities = formData
      .getAll('wanted_color_identities')
      .map((value) => String(value).trim().toUpperCase())
      .filter(Boolean)
    const wantedFormats = formData
      .getAll('wanted_formats')
      .map((value) => normalizeDeckFormat(String(value)))
      .filter((value) => value !== 'unknown')

    const { data: currentCards } = await supabase
      .from('deck_cards')
      .select('section, quantity, card_name, set_code, set_name, collector_number, foil, is_legendary, is_background, can_be_commander, keywords, partner_with_name, color_identity')
      .eq('deck_id', deckId)

    const validation = validateDeckForFormat(
      ((currentCards ?? []) as Array<{
        section: 'commander' | 'mainboard' | 'sideboard'
        quantity: number
        card_name: string
        set_code?: string | null
        set_name?: string | null
        collector_number?: string | null
        foil?: boolean | null
        is_legendary?: boolean | null
        is_background?: boolean | null
        can_be_commander?: boolean | null
        keywords?: string[] | null
        partner_with_name?: string | null
        color_identity?: string[] | null
      }>).map((card) => ({
        section: card.section,
        quantity: card.quantity,
        cardName: card.card_name,
        setCode: card.set_code ?? undefined,
        setName: card.set_name ?? undefined,
        collectorNumber: card.collector_number ?? undefined,
        foil: card.foil ?? false,
        isLegendary: card.is_legendary ?? undefined,
        isBackground: card.is_background ?? undefined,
        canBeCommander: card.can_be_commander ?? undefined,
        keywords: card.keywords ?? undefined,
        partnerWithName: card.partner_with_name ?? undefined,
        colorIdentity: card.color_identity ?? undefined,
      })),
      nextFormat
    )

    await supabase
      .from('decks')
      .update({
        format: nextFormat,
        is_valid: validation.isValid,
        validation_errors: validation.errors,
        commander_count: validation.commanderCount,
        mainboard_count: validation.mainboardCount,
        sideboard_count: validation.sideboardCount ?? 0,
        token_count: validation.tokenCount,
        commander_mode: validation.commanderMode,
        is_sleeved: isSleeved,
        is_boxed: isBoxed,
        is_sealed: isSealed,
        is_complete_precon: isCompletePrecon,
        is_listed_for_trade: isListedForTrade,
        trade_listing_notes: tradeListingNotes,
        trade_wanted_profile: tradeWantedProfile,
        buy_now_price_usd: buyNowPriceUsd,
        buy_now_currency: buyNowPriceUsd != null ? buyNowCurrency : 'USD',
        buy_now_listing_notes: buyNowPriceUsd != null ? buyNowListingNotes : null,
        inventory_status: inventoryStatus,
        wanted_color_identities: isListedForTrade ? wantedColorIdentities : [],
        wanted_formats: isListedForTrade ? wantedFormats : [],
        box_type: boxType,
      })
      .eq('id', deckId)
      .eq('user_id', user.id)

    redirect(`/my-decks/${deckId}?tab=settings`)
  }

  async function submitHolidayDonation(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    if (formData.get('confirm_holiday_donation') !== 'on') {
      redirect(`/my-decks/${deckId}?tab=settings&holiday=confirm`)
    }

    const now = new Date().toISOString()

    await supabase
      .from('decks')
      .update({
        inventory_status: 'holiday_pending_receipt',
        holiday_donation_agreed_at: now,
        holiday_donation_submitted_at: now,
        is_listed_for_trade: false,
        buy_now_price_usd: null,
        buy_now_currency: 'USD',
        buy_now_listing_notes: null,
      })
      .eq('id', deckId)
      .eq('user_id', user.id)

    redirect(`/my-decks/${deckId}?tab=settings&holiday=submitted`)
  }

  async function undoHolidayDonation() {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    const { data: currentDeck } = await supabase
      .from('decks')
      .select('inventory_status')
      .eq('id', deckId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!currentDeck || currentDeck.inventory_status !== 'holiday_pending_receipt') {
      redirect(`/my-decks/${deckId}?tab=settings`)
    }

    await supabase
      .from('decks')
      .update({
        inventory_status: 'staged',
        holiday_donation_agreed_at: null,
        holiday_donation_submitted_at: null,
      })
      .eq('id', deckId)
      .eq('user_id', user.id)

    redirect(`/my-decks/${deckId}?tab=settings&holiday=undone`)
  }

  async function deleteDeck() {
    'use server'

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    await supabase
      .from('decks')
      .delete()
      .eq('id', deckId)
      .eq('user_id', user.id)

    redirect('/my-decks')
  }

  async function updateCardCondition(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    const cardId = Number(formData.get('card_id'))
    const nextCondition = normalizeCardCondition(String(formData.get('condition') || 'near_mint'))

    if (!Number.isFinite(cardId)) {
      redirect(`/my-decks/${deckId}?tab=settings`)
    }

    await supabase
      .from('deck_cards')
      .update({ condition: nextCondition, condition_source: 'manual' })
      .eq('id', cardId)
      .eq('deck_id', deckId)

    redirect(`/my-decks/${deckId}?tab=settings`)
  }

  async function updateDeckCard(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    const cardId = Number(formData.get('card_id'))
    const nextQuantity = Number(formData.get('quantity'))
    const nextSectionRaw = String(formData.get('section') || 'mainboard')
    const nextCondition = normalizeCardCondition(String(formData.get('condition') || 'near_mint'))
    const nextSetCode = String(formData.get('set_code') || '')
      .trim()
      .toLowerCase()
      .slice(0, 12)
    const nextCollectorNumber = String(formData.get('collector_number') || '')
      .trim()
      .slice(0, 32)
    const nextFoil = formData.get('foil') === 'on'
    const nextSection =
      nextSectionRaw === 'commander' || nextSectionRaw === 'sideboard' ? nextSectionRaw : 'mainboard'

    if (!Number.isFinite(cardId) || !Number.isFinite(nextQuantity) || nextQuantity < 1 || nextQuantity > 99) {
      redirect(`/my-decks/${deckId}?tab=settings`)
    }

    await supabase
      .from('deck_cards')
      .update({
        quantity: Math.trunc(nextQuantity),
        section: nextSection,
        condition: nextCondition,
        condition_source: 'manual',
        set_code: nextSetCode || null,
        collector_number: nextCollectorNumber || null,
        foil: nextFoil,
      })
      .eq('id', cardId)
      .eq('deck_id', deckId)

    await syncDeckAfterCardMutation(supabase, user.id)

    redirect(`/my-decks/${deckId}?tab=settings`)
  }

  async function deleteDeckCard(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    const cardId = Number(formData.get('card_id'))

    if (!Number.isFinite(cardId)) {
      redirect(`/my-decks/${deckId}?tab=settings`)
    }

    await supabase
      .from('deck_cards')
      .delete()
      .eq('id', cardId)
      .eq('deck_id', deckId)

    await syncDeckAfterCardMutation(supabase, user.id)

    redirect(`/my-decks/${deckId}?tab=settings`)
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-8 pb-8 pt-40 text-white">
      <AppHeader
        current="my-decks"
        isSignedIn
        isAdmin={isAdmin}
        unreadTradeOffers={unreadTradeOffers}
        unreadNotifications={unreadNotifications}
      />
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/my-decks"
            className="text-sm text-zinc-400 hover:underline"
          >
            {'<-'} Back
          </Link>

          <Link
            href="/import-deck"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm text-white hover:bg-white/10"
          >
            Import Deck
          </Link>

          <Link
            href={`/decks/${deckId}`}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm text-white hover:bg-white/10"
          >
            Public Deck View
          </Link>

          <Link
            href={`/auction-prototype?deckId=${deckId}`}
            className={`rounded-xl border px-3 py-1 text-sm font-medium ${
              inventoryStatusLocked
                ? 'pointer-events-none border-zinc-700 bg-zinc-800/70 text-zinc-500'
                : 'border-amber-400/20 bg-amber-400/10 text-amber-300 hover:bg-amber-400/15'
            }`}
          >
            {inventoryStatusLocked ? 'Auction Locked' : 'Auction This Deck'}
          </Link>

          <Link
            href="/trade-offers"
            className={`rounded-xl border px-3 py-1 text-sm ${
              inventoryStatusLocked
                ? 'pointer-events-none border-zinc-700 bg-zinc-800/70 text-zinc-500'
                : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            {inventoryStatusLocked ? 'Offer Flow Locked' : 'Trade Offers'}
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-300 hover:bg-emerald-400/15"
            >
              Admin Dashboard
            </Link>
          )}
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-300">
                {getDeckFormatLabel(deckFormat)}
              </div>
              <h1 className="mt-4 text-3xl font-semibold">{deck.name}</h1>
              <p className="mt-2 text-sm text-zinc-400">
                Imported {formatImportedAt(deck.imported_at)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Current Value</div>
                <div className="mt-2 text-2xl font-semibold text-emerald-300">
                  ${currentPrice.toFixed(2)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">30d Move</div>
                <div className={`mt-2 text-2xl font-semibold ${changeTone(change30)}`}>
                  {formatPercentChange(change30) ?? 'Awaiting history'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">60d Move</div>
                <div className={`mt-2 text-2xl font-semibold ${changeTone(change60)}`}>
                  {formatPercentChange(change60) ?? 'Awaiting history'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] ${getInventoryStatusBadgeClass(inventoryStatus)}`}
            >
              {getInventoryStatusLabel(inventoryStatus)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
              {getInventoryStatusDescription(inventoryStatus)} Visibility: {getInventoryStatusVisibility(inventoryStatus)}.
            </span>
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Live lanes</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  deckSwapLaneLive
                    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                    : 'border-white/10 bg-white/5 text-zinc-500'
                }`}
              >
                {deckSwapLaneLive ? 'DeckSwap Live' : 'DeckSwap Off'}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  buyNowLaneLive
                    ? 'border-amber-400/20 bg-amber-400/10 text-amber-200'
                    : 'border-white/10 bg-white/5 text-zinc-500'
                }`}
              >
                {buyNowLaneLive ? 'Buy It Now Live' : 'Buy It Now Off'}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  auctionLaneLive
                    ? 'border-orange-400/20 bg-orange-400/10 text-orange-200'
                    : 'border-white/10 bg-white/5 text-zinc-500'
                }`}
              >
                {auctionLaneLive ? formatAuctionLaneLabel(auctionLaneStatus) : 'Auction Off'}
              </span>
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              DeckSwap, Buy It Now, and auction can run in parallel. Inventory status handles the broader operational state, while these markers show which selling lanes are currently underway.
            </p>
          </div>

          {inventoryStatus === 'holiday_pending_receipt' && (
            <div className="mt-6 rounded-3xl border border-zinc-500/30 bg-zinc-500/10 p-5 text-zinc-200">
              <div className="text-sm font-medium text-white">Holiday donation submitted</div>
              <p className="mt-2 text-sm text-zinc-300">
                This deck is now parked in a pending-receipt state and should not be treated like an active marketplace listing.
              </p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                Ship to: {HOLIDAY_PROGRAM_ADDRESS}
              </div>
              {holidayDonationSubmittedAt && (
                <p className="mt-3 text-xs text-zinc-400">
                  Submitted {formatImportedAt(holidayDonationSubmittedAt)}.
                </p>
              )}
              <form action={undoHolidayDonation} className="mt-4">
                <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10">
                  Undo Holiday Donation
                </button>
              </form>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-5">
            <Link
              href={`/my-decks/${deckId}`}
              className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                activeTab === 'overview'
                  ? 'bg-emerald-400 text-zinc-950'
                  : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              Deck Details
            </Link>
            <Link
              href={`/my-decks/${deckId}?tab=settings`}
              className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                activeTab === 'settings'
                  ? 'bg-emerald-400 text-zinc-950'
                  : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              Listing & Status
            </Link>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Deck Details</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Edit the identity of the deck itself here. Marketplace behavior lives under Listing & Status.
              </p>
              <form action={updateOverview} className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Deck name</label>
                  <input
                    name="name"
                    defaultValue={deck.name}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-400">
                    Commander or lead card
                  </label>
                  <input
                    name="commander"
                    defaultValue={deck.commander ?? ''}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
                  />
                </div>

                <button className="w-full rounded-xl bg-emerald-400 py-3 text-black">
                  Save Deck Details
                </button>
              </form>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold">
                  {isCommanderDeck ? 'Commander Bracket' : 'Deck Format'}
                </h2>
                {isCommanderDeck ? (
                  <>
                    <div className="mt-3 text-xl font-semibold">{bracketSummary.label}</div>
                    <p className="mt-2 text-sm text-zinc-400">{bracketSummary.description}</p>
                  </>
                ) : (
                  <>
                    <div className="mt-3 text-xl font-semibold">{getDeckFormatLabel(deckFormat)}</div>
                    <p className="mt-2 text-sm text-zinc-400">
                      This deck uses relaxed import validation tuned for non-Commander formats.
                    </p>
                  </>
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold">Import Snapshot</h2>
                <div className="mt-4 space-y-2 text-sm text-zinc-300">
                  <p>Imported at: {formatImportedAt(deck.imported_at)}</p>
                  <p>
                    Import price:{' '}
                    {importSnapshot?.price_total_usd_foil != null
                      ? `$${Number(importSnapshot.price_total_usd_foil).toFixed(2)}`
                      : 'Awaiting first priced snapshot'}
                  </p>
                  <p>Source type: {deck.source_type || 'Unknown'}</p>
                  <p>Source URL: {deck.source_url || 'None recorded'}</p>
                </div>

                <div className="mt-5">
                  <Link
                    href={`/auction-prototype?deckId=${deckId}`}
                    className="inline-flex rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-400/15"
                  >
                    Try auction launch flow
                  </Link>
                </div>
              </div>

              <form action={deleteDeck}>
                <ConfirmFormActionButton
                  confirmMessage="Delete this deck permanently? This cannot be undone."
                  pendingLabel="Deleting..."
                  className="w-full rounded-xl bg-red-500 py-3"
                >
                  Delete Deck
                </ConfirmFormActionButton>
              </form>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px] xl:items-start">
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold">Listing & Status</h2>
                <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                  Control how this deck appears in the marketplace, which lane is active, and whether it stays private, public, or completed in your inventory.
                </p>
              </div>

              <form action={updateSettings} className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                    <div className="text-sm font-medium text-white">Inventory status</div>
                    <p className="mt-2 text-sm text-zinc-400">
                      Status is automatic. This deck starts in staging after import, then shifts only when it moves through broader operational flow like auction handling, checkout, escrow, delivery, or donation. DeckSwap, Buy It Now, and auction lanes can all be active at the same time.
                    </p>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">Current status</div>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] ${getInventoryStatusBadgeClass(inventoryStatus)}`}
                        >
                          {getInventoryStatusLabel(inventoryStatus)}
                        </span>
                        <span className="text-sm text-zinc-400">
                          {getInventoryStatusVisibility(inventoryStatus)}
                        </span>
                      </div>
                    </div>

                    <p className="mt-4 text-sm text-zinc-300">
                      {getInventoryStatusDescription(inventoryStatus)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          deckSwapLaneLive
                            ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                            : 'border-white/10 bg-white/5 text-zinc-500'
                        }`}
                      >
                        {deckSwapLaneLive ? 'DeckSwap is underway' : 'DeckSwap is off'}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          buyNowLaneLive
                            ? 'border-amber-400/20 bg-amber-400/10 text-amber-200'
                            : 'border-white/10 bg-white/5 text-zinc-500'
                        }`}
                      >
                        {buyNowLaneLive ? 'Buy It Now is underway' : 'Buy It Now is off'}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          auctionLaneLive
                            ? 'border-orange-400/20 bg-orange-400/10 text-orange-200'
                            : 'border-white/10 bg-white/5 text-zinc-500'
                        }`}
                      >
                        {auctionLaneLive
                          ? `${formatAuctionLaneLabel(auctionLaneStatus)}`
                          : 'Auction is off'}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <a
                        href="#deckswap-lane"
                        className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100 hover:bg-emerald-400/15"
                      >
                        Start DeckSwap
                      </a>
                      <a
                        href="#buy-now-lane"
                        className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100 hover:bg-amber-400/15"
                      >
                        Set Buy It Now
                      </a>
                      <Link
                        href={`/auction-prototype?deckId=${deckId}`}
                        className={`rounded-2xl border px-4 py-3 text-sm ${
                          inventoryStatusLocked
                            ? 'pointer-events-none border-zinc-700 bg-zinc-800/70 text-zinc-500'
                            : 'border-orange-400/20 bg-orange-400/10 text-orange-100 hover:bg-orange-400/15'
                        }`}
                      >
                        {inventoryStatusLocked ? 'Auction Unavailable' : 'Set Auction Rules'}
                      </Link>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                    <div className="text-sm font-medium text-white">Format and validation</div>
                    <p className="mt-2 text-sm text-zinc-400">
                      Override detection when the imported list needs a different rules profile.
                    </p>

                    <div className="mt-4">
                      <label className="mb-2 block text-sm text-zinc-300">Detected / chosen format</label>
                      <select
                        name="format"
                        defaultValue={deckFormat}
                        className="w-full rounded-xl border border-white/10 bg-zinc-950/70 p-3 text-white"
                      >
                        {SUPPORTED_DECK_FORMATS.map((format) => (
                          <option key={format} value={format}>
                            {getDeckFormatLabel(format)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">Automatic lane logic</div>
                      <p className="mt-2 text-sm text-zinc-300">
                        Saving with Buy It Now set promotes the deck to <span className="text-amber-200">Buy It Now Live</span>. Saving with Deck Swap enabled but no BIN promotes it to <span className="text-emerald-200">DeckSwap Live</span>. If neither lane is active, it falls back to <span className="text-zinc-200">Staged</span>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">Marketplace presentation</div>
                      <p className="mt-2 text-sm text-zinc-400">
                        Help buyers and traders understand how complete and ready this deck feels before they ever message you.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-zinc-300">
                      {getDeckMarketingChips(deck).length > 0
                        ? `${getDeckMarketingChips(deck).length} presentation signal${getDeckMarketingChips(deck).length === 1 ? '' : 's'} active`
                        : 'No presentation signals yet'}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200">
                      <input
                        type="checkbox"
                        name="is_sleeved"
                        defaultChecked={deck.is_sleeved ?? false}
                        className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-emerald-400"
                      />
                      Sleeved
                    </label>

                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200">
                      <input
                        type="checkbox"
                        name="is_boxed"
                        defaultChecked={deck.is_boxed ?? false}
                        className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-emerald-400"
                      />
                      Boxed
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200">
                      <input
                        type="checkbox"
                        name="is_sealed"
                        defaultChecked={(deck as typeof deck & { is_sealed?: boolean | null }).is_sealed ?? false}
                        className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-emerald-400"
                      />
                      Sealed
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200">
                      <input
                        type="checkbox"
                        name="is_complete_precon"
                        defaultChecked={(deck as typeof deck & { is_complete_precon?: boolean | null }).is_complete_precon ?? false}
                        className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-emerald-400"
                      />
                      Complete Commander precon
                    </label>
                  </div>

                  <div className="mt-4 max-w-md">
                    <label className="mb-2 block text-sm text-zinc-400">Box type</label>
                    <input
                      name="box_type"
                      defaultValue={deck.box_type ?? ''}
                      placeholder="Boulder 100+"
                      className="w-full rounded-xl border border-white/10 bg-zinc-950/70 p-3 text-white"
                    />
                  </div>
                </div>

                <div className="grid gap-6 2xl:grid-cols-2">
                  <div
                    id="deckswap-lane"
                    className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6"
                  >
                  <div className="text-sm font-medium text-white">Deck Swap listing</div>
                  <p className="mt-2 text-sm text-emerald-50/80">
                    Start here when you want to maximize value. Deck Swap should usually be the first lane, with direct sale next and auctions saved for the fallback case when you need to move a deck faster.
                  </p>

                  <label className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-black/20 px-4 py-3 text-sm text-emerald-50">
                    <input
                      type="checkbox"
                      name="is_listed_for_trade"
                      defaultChecked={(deck as typeof deck & { is_listed_for_trade?: boolean | null }).is_listed_for_trade ?? false}
                      className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-emerald-400"
                    />
                    List this deck for trade
                  </label>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">Condition spot-check</div>
                      {highestValueCard ? (
                        <>
                          <div className="mt-2 text-sm font-medium text-white">
                            {highestValueCard.card_name}
                          </div>
                          <div className="mt-1 text-sm text-zinc-300">
                            ${highestValueCard.unitPrice.toFixed(2)} each
                          </div>
                          <p className="mt-3 text-sm text-zinc-400">
                            Before you mark the deck available, confirm the most expensive card is graded correctly. Buyers will anchor on the top-end pieces first.
                          </p>
                          <div className="mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium
                            border-amber-400/20 bg-amber-400/10 text-amber-200">
                            {highestValueCard.condition_source === 'manual'
                              ? 'Top card manually graded'
                              : 'Top card still using import default'}
                          </div>
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-zinc-400">
                          Import pricing first so the listing flow can highlight the most important card to confirm.
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">What are you looking for?</label>
                        <textarea
                          name="trade_wanted_profile"
                          rows={4}
                          defaultValue={(deck as typeof deck & { trade_wanted_profile?: string | null }).trade_wanted_profile ?? ''}
                          placeholder="Example: Looking for tuned white-based commander decks, sealed precons, or value-close trades with strong token support."
                          className="w-full rounded-xl border border-white/10 bg-zinc-950/70 p-3 text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">Preferred color identities</label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {ALL_COLOR_FILTERS.map((filter) => (
                            <label
                              key={filter.code}
                              className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200"
                            >
                              <input
                                type="checkbox"
                                name="wanted_color_identities"
                                value={filter.code}
                                defaultChecked={selectedWantedColors.has(filter.code)}
                                className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-emerald-400"
                              />
                              {filter.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">Preferred formats</label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {SUPPORTED_DECK_FORMATS.filter((format) => format !== 'unknown').map((format) => (
                            <label
                              key={format}
                              className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200"
                            >
                              <input
                                type="checkbox"
                                name="wanted_formats"
                                value={format}
                                defaultChecked={selectedWantedFormats.has(format)}
                                className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-emerald-400"
                              />
                              {getDeckFormatLabel(format)}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">Listing notes</label>
                        <textarea
                          name="trade_listing_notes"
                          rows={3}
                          defaultValue={(deck as typeof deck & { trade_listing_notes?: string | null }).trade_listing_notes ?? ''}
                          placeholder="Example: Open to even trades, willing to add sealed accessories, prefer Canada/US shipping lanes."
                          className="w-full rounded-xl border border-white/10 bg-zinc-950/70 p-3 text-white"
                        />
                      </div>
                    </div>
                  </div>
                  </div>

                  <div
                    id="buy-now-lane"
                    className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6"
                  >
                  <div className="text-sm font-medium text-white">Buy It Now</div>
                  <p className="mt-2 text-sm text-amber-50/80">
                    This is the middle lane: below maximizing value through Deck Swap, but ahead of a full auction. Set a direct-sale price you would accept without running bidding, and keep it between the conservative buylist path and the stronger Deck Swap value.
                  </p>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-amber-50/85">
                    Value ladder: <span className="font-medium text-emerald-200">1. Deck Swap first</span>, <span className="font-medium text-white">2. Buy It Now second</span>, <span className="font-medium text-amber-200">3. Auction only if the first two paths do not move the deck</span>.
                  </div>

                  <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-50/85">
                    Guaranteed exit lane: if you want certainty over maximizing price, DeckSwap can quote a <span className="font-medium text-white">we&apos;ll buy it now</span> price that undercuts the estimated buylist by {formatCurrencyAmount(guaranteedHaircut, buyNowCurrency)}.
                  </div>

                  <BuyNowQuoteGate
                    currency={buyNowCurrency}
                    buylistFloor={formatCurrencyAmount(buyNowSuggestion.floor, buyNowCurrency)}
                    guaranteedOffer={formatCurrencyAmount(guaranteedBuyNow, buyNowCurrency)}
                    guaranteedHaircut={formatCurrencyAmount(guaranteedHaircut, buyNowCurrency)}
                    suggestedBuyNow={formatCurrencyAmount(buyNowSuggestion.suggested, buyNowCurrency)}
                    ceiling={formatCurrencyAmount(buyNowSuggestion.ceiling, buyNowCurrency)}
                  />

                  <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                    <div>
                      <label className="mb-2 block text-sm text-zinc-300">Buy it now currency</label>
                      <select
                        name="buy_now_currency"
                        defaultValue={buyNowCurrency}
                        className="w-full rounded-xl border border-white/10 bg-zinc-950/70 p-3 text-white"
                      >
                        {SUPPORTED_CURRENCIES.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency} - {currencyLabel(currency)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-300">Buy it now price</label>
                      <input
                        name="buy_now_price_usd"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={(deck as typeof deck & { buy_now_price_usd?: number | null }).buy_now_price_usd ?? ''}
                        placeholder="Get your quote above, or enter a custom price"
                        className="w-full rounded-xl border border-white/10 bg-zinc-950/70 p-3 text-white"
                      />
                      <p className="mt-2 text-xs text-zinc-400">
                        Currency is explicit on the public listing so buyers know whether this is USD, CAD, EUR, or GBP.
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-300">Buy it now notes</label>
                      <textarea
                        name="buy_now_listing_notes"
                        rows={3}
                        defaultValue={(deck as typeof deck & { buy_now_listing_notes?: string | null }).buy_now_listing_notes ?? ''}
                        placeholder="Example: Happy to sell outright in Canada/US, deck ships sleeved and boxed, not splitting singles."
                        className="w-full rounded-xl border border-white/10 bg-zinc-950/70 p-3 text-white"
                      />
                      <p className="mt-2 text-xs text-zinc-400">
                        Internal suggestions are approximate reference anchors for the selected currency.
                      </p>
                    </div>
                  </div>
                  </div>
                </div>

                <button className="w-full rounded-xl bg-emerald-400 py-3 text-black">
                  Save Settings
                </button>
              </form>
            </div>

            <div className="space-y-6 xl:sticky xl:top-32">
              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold">Listing Summary</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Current status</div>
                    <div className="mt-2 text-lg font-semibold text-white">{getInventoryStatusLabel(inventoryStatus)}</div>
                    <div className="mt-1 text-sm text-zinc-400">{getInventoryStatusVisibility(inventoryStatus)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Deck value</div>
                    <div className="mt-2 text-lg font-semibold text-emerald-300">${currentPrice.toFixed(2)}</div>
                    <div className="mt-1 text-sm text-zinc-400">{deck.commander || deck.name}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Lane activity</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs ${
                        deckSwapLaneLive
                          ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                          : 'border-white/10 bg-white/5 text-zinc-500'
                      }`}>
                        DeckSwap
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-xs ${
                        buyNowLaneLive
                          ? 'border-amber-400/20 bg-amber-400/10 text-amber-200'
                          : 'border-white/10 bg-white/5 text-zinc-500'
                      }`}>
                        Buy It Now
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-xs ${
                        auctionLaneLive
                          ? 'border-orange-400/20 bg-orange-400/10 text-orange-200'
                          : 'border-white/10 bg-white/5 text-zinc-500'
                      }`}>
                        {auctionLaneLive ? formatAuctionLaneLabel(auctionLaneStatus) : 'Auction'}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-zinc-400">
                      {deckSwapLaneLive || buyNowLaneLive || auctionLaneLive
                        ? 'Multiple lanes can stay active together so the deck can keep moving.'
                        : 'This deck is still private until you activate at least one lane.'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold">Import Metadata</h2>
                <div className="mt-4 space-y-2 text-sm text-zinc-300">
                  <p>Imported at: {formatImportedAt(deck.imported_at)}</p>
                  <p>Source type: {deck.source_type || 'Unknown'}</p>
                  <p>Source URL: {deck.source_url || 'None recorded'}</p>
                  <p>Validation status: {deck.is_valid ? 'Valid' : 'Needs review'}</p>
                  <p>Inventory status: {getInventoryStatusLabel(inventoryStatus)}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold">Price History</h2>
                <div className="mt-4 space-y-2 text-sm text-zinc-300">
                  <p>Current price: ${currentPrice.toFixed(2)}</p>
                  <p>
                    Import snapshot:{' '}
                    {importSnapshot?.price_total_usd_foil != null
                      ? `$${Number(importSnapshot.price_total_usd_foil).toFixed(2)}`
                      : 'Not captured yet'}
                  </p>
                  <p className={changeTone(change30)}>
                    30-day move: {formatPercentChange(change30) ?? 'Awaiting enough history'}
                  </p>
                  <p className={changeTone(change60)}>
                    60-day move: {formatPercentChange(change60) ?? 'Awaiting enough history'}
                  </p>
                </div>
              </div>

              <form action={deleteDeck}>
                <ConfirmFormActionButton
                  confirmMessage="Delete this deck permanently? This cannot be undone."
                  pendingLabel="Deleting..."
                  className="w-full rounded-xl bg-red-500 py-3"
                >
                  Delete Deck
                </ConfirmFormActionButton>
              </form>
            </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Card Management</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Review imported rows, fix quantity and print details, move cards between sections, and remove anything that should not be there. We still recommend grading the highest-value cards before the deck goes live.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                  {gradingCards.length} card rows
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                    <div className="text-xs uppercase tracking-wide text-emerald-300">
                      Review flow
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      Start with the most expensive cards
                    </div>
                    <p className="mt-2 text-sm text-emerald-50/85">
                      Cards are ordered by current value. We recommend manually grading any card above $10 before it enters a listing, trade, or escrow review.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">
                      Validation handling
                    </div>
                    <p className="mt-2 text-sm text-zinc-300">
                      Card edits immediately recalculate commander structure, deck counts, validity, and price totals so your saved deck stays internally consistent.
                    </p>
                  </div>

                  {CARD_CONDITIONS.map((condition) => {
                    const detail = CARD_CONDITION_DETAILS[condition]
                    return (
                      <div
                        key={condition}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="text-xs uppercase tracking-wide text-emerald-300">
                          {detail.shortLabel}
                        </div>
                        <div className="mt-2 text-lg font-semibold text-white">{detail.label}</div>
                        <p className="mt-2 text-sm text-zinc-400">{detail.description}</p>
                      </div>
                    )
                  })}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="space-y-3">
                    {gradingCards.map((card) => (
                      <form
                        key={card.id}
                        action={updateDeckCard}
                        className="grid gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 md:grid-cols-[88px_1fr_280px_160px]"
                      >
                        <input type="hidden" name="card_id" value={card.id} />
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
                          <div className="aspect-[5/7]">
                            {card.image_url ? (
                              <img
                                src={card.image_url}
                                alt={card.card_name}
                                className="h-full w-full object-cover object-top"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center px-3 text-center text-xs text-zinc-500">
                                No image
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{card.card_name}</div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {card.section} · Qty {card.quantity} · {card.set_code?.toUpperCase() || 'N/A'}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                              Value {card.unitPrice > 0 ? `$${card.unitPrice.toFixed(2)}` : 'N/A'}
                            </span>
                            <span
                              className={`rounded-full border px-3 py-1 text-xs ${
                                card.condition_source === 'manual'
                                  ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                                  : 'border-amber-400/20 bg-amber-400/10 text-amber-200'
                              }`}
                            >
                              {card.condition_source === 'manual'
                                ? 'Manually graded'
                                : 'Accepted by import'}
                            </span>
                            {card.unitPrice >= 10 && card.condition_source !== 'manual' && (
                              <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs text-red-200">
                                Manual review suggested
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
                              Section
                            </label>
                            <select
                              name="section"
                              defaultValue={card.section}
                              className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-white"
                            >
                              <option value="commander">Commander</option>
                              <option value="mainboard">Mainboard</option>
                              <option value="sideboard">Sideboard</option>
                            </select>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
                                Quantity
                              </label>
                              <input
                                name="quantity"
                                type="number"
                                min="1"
                                max="99"
                                step="1"
                                defaultValue={card.quantity}
                                className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-white"
                              />
                            </div>
                            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-zinc-200">
                              <input
                                name="foil"
                                type="checkbox"
                                defaultChecked={!!card.foil}
                                className="h-4 w-4 rounded border-white/20 bg-zinc-950 text-emerald-400"
                              />
                              Foil printing
                            </label>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
                                Set code
                              </label>
                              <input
                                name="set_code"
                                type="text"
                                defaultValue={card.set_code ?? ''}
                                placeholder="mh3"
                                className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-white"
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
                                Collector number
                              </label>
                              <input
                                name="collector_number"
                                type="text"
                                defaultValue={card.collector_number ?? ''}
                                placeholder="247"
                                className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
                              Condition
                            </label>
                            <select
                              name="condition"
                              defaultValue={normalizeCardCondition(card.condition)}
                              className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-white"
                            >
                              {CARD_CONDITIONS.map((condition) => (
                                <option key={condition} value={condition}>
                                  {CARD_CONDITION_DETAILS[condition].label}
                                </option>
                              ))}
                            </select>
                            <p className="mt-2 text-xs text-zinc-500">
                              {getCardConditionMeta(card.condition).description}
                            </p>
                            {card.condition_source !== 'manual' && (
                              <p className="mt-2 text-xs text-amber-300/80">
                                This condition came from the import default and has not been manually confirmed yet.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col justify-end gap-3">
                          <button className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-medium text-zinc-950">
                            Save Card
                          </button>
                          <ConfirmFormActionButton
                            formAction={deleteDeckCard}
                            confirmMessage="Delete this card from the deck? This changes the saved list immediately."
                            pendingLabel="Deleting..."
                            className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100"
                          >
                            Delete Card
                          </ConfirmFormActionButton>
                        </div>
                      </form>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <form
              action={submitHolidayDonation}
              className="rounded-3xl border border-zinc-500/30 bg-zinc-900/80 p-6"
            >
              <div className="text-sm font-medium text-zinc-100">Holiday charity donation</div>
              <p className="mt-2 text-sm text-zinc-300">
                Move this deck out of the marketplace and into the Mythiverse Exchange holiday program when you are ready to give it away.
              </p>
              <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  name="confirm_holiday_donation"
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-zinc-900 text-emerald-400"
                />
                <span>
                  I understand this will move the deck into <span className="font-medium text-white">Holiday Donation Pending Receipt</span>, turn off trade and Buy It Now availability, and reveal the shipping instructions after I confirm.
                </span>
              </label>
              {holidayDonationAgreedAt && (
                <p className="mt-3 text-xs text-zinc-400">
                  Donation confirmed {formatImportedAt(holidayDonationAgreedAt)}.
                </p>
              )}
              <button className="mt-4 w-full rounded-xl border border-zinc-500/40 bg-zinc-400/20 py-3 text-sm font-medium text-zinc-100 hover:bg-zinc-400/30">
                Submit for Holiday Donation
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
