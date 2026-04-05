import DeckCardViews from '@/components/deck-card-views'
import FormActionButton from '@/components/form-action-button'
import GuestDraftCleanup from '@/components/guest-draft-cleanup'
import AppHeader from '@/components/app-header'
import { AdminOnlyCallout } from '@/components/admin-only-callout'
import { Button } from '@/components/ui/button'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Textarea } from '@/components/ui/textarea'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  convertDeckValueForCurrency,
  formatCurrencyAmount,
  normalizeSupportedCurrency,
} from '@/lib/currency'
import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import {
  normalizeImportedCommanderOverlap,
  planCommanderOverlapRowFixes,
} from '@/lib/commander/normalize'
import type { ImportedDeckCard } from '@/lib/commander/types'
import { validateDeckForFormat } from '@/lib/commander/validate'
import { rebuildDeckStructureFromSavedRows } from '@/lib/deck-repair'
import { fetchMoxfieldDeck } from '@/lib/deck-sources/moxfield'
import {
  formatCommentTimestamp,
  isDeckCommentsSchemaMissing,
  type DeckComment,
} from '@/lib/deck-comments'
import {
  calculatePercentChange,
  findImportSnapshot,
  findNearestSnapshotBeforeDays,
  formatPercentChange,
  type DeckPriceSnapshot,
} from '@/lib/decks/price-history'
import {
  detectDeckFormat,
  formatSupportsCommanderRules,
  getDeckFormatLabel,
  normalizeDeckFormat,
} from '@/lib/decks/formats'
import {
  getInventoryStatusBadgeClass,
  getInventoryStatusDescription,
  getInventoryStatusLabel,
  getInventoryStatusVisibility,
  isInventoryStatusLocked,
  normalizeInventoryStatus,
} from '@/lib/decks/inventory-status'
import { CARD_CONDITION_DETAILS } from '@/lib/decks/conditions'
import { getDeckMarketingChips } from '@/lib/decks/marketing'
import {
  calculateDeckTradeValue,
  calculateGuaranteedBuyNowOffer,
  calculateSuggestedBuyNowPrice,
} from '@/lib/decks/trade-value'
import { GUEST_IMPORT_SAVED_QUERY_KEY } from '@/lib/guest-import'
import {
  formatDeckImportEventTimestamp,
  isDeckImportEventsSchemaMissing,
  logDeckImportEvent,
  type DeckImportEventRow,
} from '@/lib/import-events'
import { createNotification, getUnreadNotificationsCount } from '@/lib/notifications'
import {
  calculateInternalValidationSummary,
  formatShipFrom,
  getTrustBadges,
  isProfileSchemaMissing,
  marketplaceLinks,
  type PrivateProfile,
  type ProfileVerification,
  type PublicProfile,
  type ReputationSummary,
} from '@/lib/profiles'
import { createClient } from '@/lib/supabase/server'
import { enrichDeckWithScryfall, syncDeckDerivedState } from '@/app/import-deck/enrich'
import { Info } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

export const dynamic = 'force-dynamic'

type Deck = {
  id: number
  user_id?: string | null
  source_type?: string | null
  source_url?: string | null
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
  is_sleeved?: boolean | null
  is_boxed?: boolean | null
  is_sealed?: boolean | null
  is_complete_precon?: boolean | null
  is_listed_for_trade?: boolean | null
  trade_listing_notes?: string | null
  trade_wanted_profile?: string | null
  buy_now_price_usd?: number | null
  buy_now_currency?: string | null
  buy_now_listing_notes?: string | null
  inventory_status?: string | null
  holiday_donation_submitted_at?: string | null
  wanted_color_identities?: string[] | null
  wanted_formats?: string[] | null
  box_type?: string | null
}

type DeckCard = {
  id: number
  deck_id?: number
  section: 'commander' | 'mainboard' | 'sideboard'
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
  condition?: string | null
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

type CommentAuthor = {
  user_id: string
  display_name?: string | null
  username?: string | null
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
      'id, user_id, source_type, source_url, name, commander, power_level, price_estimate, image_url, is_valid, validation_errors, commander_mode, format, imported_at, price_total_usd, price_total_usd_foil, price_total_eur, is_sleeved, is_boxed, is_sealed, is_complete_precon, is_listed_for_trade, trade_listing_notes, trade_wanted_profile, buy_now_price_usd, buy_now_currency, buy_now_listing_notes, inventory_status, holiday_donation_submitted_at, wanted_color_identities, wanted_formats, box_type'
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
      'id, deck_id, section, quantity, card_name, set_code, set_name, collector_number, foil, sort_order, image_url, price_usd, price_usd_foil, is_legendary, is_background, can_be_commander, keywords, partner_with_name, color_identity, condition, finishes, oracle_text, type_line, rarity, mana_cost, cmc, power, toughness, oracle_id, scryfall_id, price_usd_etched, price_eur, price_eur_foil, price_tix'
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

  const { data: commentsData, error: commentsError } = await supabase
    .from('deck_comments')
    .select('id, deck_id, user_id, body, created_at, updated_at')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true })

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
  const commentsSchemaMissing = isDeckCommentsSchemaMissing(commentsError?.message)
  const typedComments =
    commentsSchemaMissing || commentsError ? ([] as DeckComment[]) : ((commentsData ?? []) as DeckComment[])
  const isOwner = !!user && typedDeck.user_id === user.id
  const access = await getAdminAccessForUser(user)
  const isAdmin = access.isAdmin
  const isSuperadmin = access.isSuperadmin
  const activeInternalTab =
    isSuperadmin && resolvedSearchParams?.view === 'superadmin' ? 'superadmin' : 'deck'
  const showInternalAdminPanel = isAdmin && (!isSuperadmin || activeInternalTab === 'superadmin')
  const { data: importEventsData, error: importEventsError } = showInternalAdminPanel
    ? await supabase
        .from('deck_import_events')
        .select('id, deck_id, actor_user_id, source_type, event_type, severity, message, details, created_at')
        .eq('deck_id', deckId)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] as DeckImportEventRow[], error: null }
  const deckFormat = normalizeDeckFormat(typedDeck.format)
  const isCommanderDeck = formatSupportsCommanderRules(deckFormat)
  const currentPrice = Number(typedDeck.price_total_usd_foil ?? 0)
  const tradeValue = calculateDeckTradeValue(currentPrice)
  const guaranteedBuyNowUsd = calculateGuaranteedBuyNowOffer(currentPrice)
  const buyNowCurrency = normalizeSupportedCurrency(typedDeck.buy_now_currency)
  const buyNowSuggestionUsd = calculateSuggestedBuyNowPrice(currentPrice)
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
  const buyNowPrice = Number(typedDeck.buy_now_price_usd ?? 0)
  const hasBuyNow = buyNowPrice > 0
  const inventoryStatus = normalizeInventoryStatus(typedDeck.inventory_status)
  const inventoryStatusLocked = isInventoryStatusLocked(inventoryStatus)
  const marketingChips = getDeckMarketingChips(typedDeck)
  const importSnapshot = findImportSnapshot(snapshots)
  const change30 = calculatePercentChange(
    currentPrice,
    findNearestSnapshotBeforeDays(snapshots, 30)?.price_total_usd_foil ?? null
  )
  const change60 = calculatePercentChange(
    currentPrice,
    findNearestSnapshotBeforeDays(snapshots, 60)?.price_total_usd_foil ?? null
  )

  if (!isOwner && !isAdmin && getInventoryStatusVisibility(inventoryStatus) === 'private') {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-zinc-900 p-8">
          <div
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getInventoryStatusBadgeClass(inventoryStatus)}`}
          >
            {getInventoryStatusLabel(inventoryStatus)}
          </div>
          <h1 className="mt-5 text-3xl font-semibold">This deck is not in the live marketplace right now</h1>
          <p className="mt-3 text-zinc-400">
            Private inventory states like staging, donation intake, escrow handling, and post-checkout processing stay off the public marketplace.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/decks"
              className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
            >
              Browse Live Decks
            </Link>
            <Link
              href="/completed-sales"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10"
            >
              View Completed Sales
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const commentAuthorIds = [...new Set(typedComments.map((comment) => comment.user_id))]
  const { data: commentAuthorsData, error: commentAuthorsError } = commentAuthorIds.length
    ? await supabase
        .from('profiles')
        .select('user_id, display_name, username')
        .in('user_id', commentAuthorIds)
    : { data: [] as CommentAuthor[], error: null }
  const commentAuthors = new Map<string, CommentAuthor>(
    ((commentAuthorsData ?? []) as CommentAuthor[]).map((author) => [author.user_id, author])
  )

  const [
    sellerProfileResult,
    sellerPrivateResult,
    sellerSummaryResult,
    sellerVerificationResult,
  ] = typedDeck.user_id
    ? await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', typedDeck.user_id).maybeSingle(),
        isAdmin
          ? supabase.from('profile_private').select('*').eq('user_id', typedDeck.user_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from('profile_reputation_summary')
          .select('*')
          .eq('user_id', typedDeck.user_id)
          .maybeSingle(),
        supabase
          .from('profile_verifications')
          .select('id, user_id, verification_type, status, notes')
          .eq('user_id', typedDeck.user_id),
      ])
    : [
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: [], error: null },
      ]

  const profileSchemaMissing = [
    sellerProfileResult.error?.message,
    sellerPrivateResult.error?.message,
    sellerSummaryResult.error?.message,
    sellerVerificationResult.error?.message,
  ].some((message) => isProfileSchemaMissing(message))
  const sellerProfile = (sellerProfileResult.data as PublicProfile | null) ?? null
  const sellerPrivateProfile = (sellerPrivateResult.data as PrivateProfile | null) ?? null
  const sellerSummary = (sellerSummaryResult.data as ReputationSummary | null) ?? null
  const sellerVerifications = ((sellerVerificationResult.data ?? []) as ProfileVerification[]) ?? []
  const sellerBadges = getTrustBadges(sellerSummary, sellerVerifications)
  const sellerLinks = marketplaceLinks(sellerProfile).slice(0, 3)
  const internalValidation = calculateInternalValidationSummary(
    sellerSummary,
    sellerProfile,
    sellerPrivateProfile
  )

  async function updateSellerTrustAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const access = await getAdminAccessForUser(user)

    if (!user || !access.isAdmin || !typedDeck.user_id) {
      redirect(`/decks/${deckId}`)
    }

    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('location_country')
      .eq('user_id', typedDeck.user_id)
      .maybeSingle()

    const { data: sellerPrivateProfile } = await supabase
      .from('profile_private')
      .select('shipping_country')
      .eq('user_id', typedDeck.user_id)
      .maybeSingle()

    const avgTradeReplyHoursValue = String(formData.get('avg_trade_reply_hours') || '').trim()
    const internalUserRatingValue = String(formData.get('internal_user_rating') || '').trim()

    const baseSummary = {
      ...sellerSummary,
      last_seen_at: String(formData.get('last_seen_at') || '').trim() || null,
      avg_trade_reply_hours:
        avgTradeReplyHoursValue === '' ? null : Number(avgTradeReplyHoursValue),
      last_login_ip_country: String(formData.get('last_login_ip_country') || '').trim() || null,
      internal_user_rating:
        internalUserRatingValue === '' ? null : Number(internalUserRatingValue),
      is_manually_verified: formData.get('is_manually_verified') === 'on',
      is_known_user: formData.get('is_known_user') === 'on',
      is_friend_of_platform: formData.get('is_friend_of_platform') === 'on',
      banned_status: String(formData.get('banned_status') || 'active'),
      banned_reason: String(formData.get('banned_reason') || '').trim(),
      manual_review_notes: String(formData.get('manual_review_notes') || '').trim(),
    } satisfies Partial<ReputationSummary>

    const internalValidation = calculateInternalValidationSummary(
      baseSummary,
      sellerProfile as Partial<PublicProfile> | null,
      sellerPrivateProfile as Partial<PrivateProfile> | null
    )

    await supabase.from('profile_reputation_summary').upsert(
      {
        user_id: typedDeck.user_id,
        is_manually_verified: baseSummary.is_manually_verified,
        is_known_user: baseSummary.is_known_user,
        is_friend_of_platform: baseSummary.is_friend_of_platform,
        banned_status: baseSummary.banned_status,
        banned_reason: baseSummary.banned_reason,
        manual_review_notes: baseSummary.manual_review_notes,
        last_seen_at: baseSummary.last_seen_at,
        avg_trade_reply_hours: baseSummary.avg_trade_reply_hours,
        last_login_ip_country: baseSummary.last_login_ip_country,
        internal_user_rating: baseSummary.internal_user_rating,
        internal_validation_score: internalValidation.score,
        internal_validation_tier: internalValidation.tier,
        internal_validation_notes: internalValidation.notes,
        internal_validation_last_calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    redirect(`/decks/${deckId}`)
  }

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

    const overlapFixPlan = planCommanderOverlapRowFixes(
      (refreshedCards as DeckCard[]).map((card) => ({
        id: card.id,
        section: card.section,
        quantity: card.quantity,
        card_name: card.card_name,
      }))
    )

    if (overlapFixPlan.hasFixes) {
      for (const update of overlapFixPlan.updates) {
        const { error: updateOverlapError } = await supabase
          .from('deck_cards')
          .update({ quantity: update.quantity })
          .eq('id', update.id)
          .eq('deck_id', deckId)

        if (updateOverlapError) {
          redirect(`/decks/${deckId}?imported=1`)
        }
      }

      if (overlapFixPlan.deletes.length > 0) {
        const { error: deleteOverlapError } = await supabase
          .from('deck_cards')
          .delete()
          .eq('deck_id', deckId)
          .in('id', overlapFixPlan.deletes)

        if (deleteOverlapError) {
          redirect(`/decks/${deckId}?imported=1`)
        }
      }
    }

    const { data: normalizedCards, error: normalizedCardsError } = await supabase
      .from('deck_cards')
      .select(
        'id, section, quantity, card_name, set_code, set_name, collector_number, foil, sort_order, image_url, is_legendary, is_background, can_be_commander, keywords, partner_with_name, color_identity'
      )
      .eq('deck_id', deckId)
      .order('sort_order', { ascending: true })

    if (normalizedCardsError || !normalizedCards) {
      redirect(`/decks/${deckId}?imported=1`)
    }

    const validation = validateDeckForFormat(
      (normalizedCards as DeckCard[]).map(toImportedDeckCard),
      ownedDeck.format
    )
    const commanderNames = (normalizedCards as DeckCard[])
      .filter((card) => card.section === 'commander')
      .map((card) => card.card_name)

    const primaryCommander = (normalizedCards as DeckCard[]).find(
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

    await logDeckImportEvent(supabase, {
      deckId,
      actorUserId: user.id,
      sourceType: typedDeck.source_type ?? null,
      eventType: 'commander_repaired',
      severity: 'info',
      message: `Commander was manually set to ${commanderNames[0] ?? 'unknown commander'} and validation was recalculated.`,
      details: {
        commanderNames,
        commanderMode: validation.commanderMode,
        isValid: validation.isValid,
        overlapFixesApplied: overlapFixPlan.hasFixes,
        overlapUpdates: overlapFixPlan.updates.length,
        overlapDeletes: overlapFixPlan.deletes.length,
      },
    })

    redirect(
      `/decks/${deckId}?commanderUpdated=1${overlapFixPlan.hasFixes ? '&duplicateCardsFixed=1' : ''}`
    )
  }

  async function addDeckCommentAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect(`/sign-in?next=/decks/${deckId}`)
    }

    const body = String(formData.get('body') || '').trim()

    if (body.length < 2) {
      redirect(`/decks/${deckId}?commentError=1`)
    }

    await supabase.from('deck_comments').insert({
      deck_id: deckId,
      user_id: user.id,
      body: body.slice(0, 1200),
    })

    if (typedDeck.user_id && typedDeck.user_id !== user.id) {
      await createNotification(supabase, {
        userId: typedDeck.user_id,
        actorUserId: user.id,
        type: 'deck_comment_added',
        title: 'New comment on your deck',
        body: `${typedDeck.name} received a new public comment.`,
        href: `/decks/${deckId}`,
        metadata: {
          deckId,
          deckName: typedDeck.name,
        },
      })
    }

    redirect(`/decks/${deckId}?commentAdded=1`)
  }

  async function retryEnrichmentAction() {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const access = await getAdminAccessForUser(user)

    if (!user || (typedDeck.user_id !== user.id && !access.isAdmin)) {
      redirect(`/decks/${deckId}`)
    }

    try {
      await enrichDeckWithScryfall(deckId, 'refresh')
      await logDeckImportEvent(supabase, {
        deckId,
        actorUserId: user.id,
        sourceType: typedDeck.source_type ?? null,
        eventType: 'manual_enrichment_retry_succeeded',
        severity: 'info',
        message: `${access.isAdmin && typedDeck.user_id !== user.id ? 'Admin' : 'Owner'} re-ran deck enrichment successfully.`,
      })
      redirect(`/decks/${deckId}?enrichRetried=1`)
    } catch (error) {
      console.error('Retry enrichment failed:', error)
      const message =
        error instanceof Error ? error.message.slice(0, 220) : 'Manual enrichment retry failed.'
      await logDeckImportEvent(supabase, {
        deckId,
        actorUserId: user.id,
        sourceType: typedDeck.source_type ?? null,
        eventType: 'manual_enrichment_retry_failed',
        severity: 'warning',
        message,
        details: {
          trigger: 'deck_detail_retry_enrichment',
        },
      })
      redirect(`/decks/${deckId}?enrichRetryFailed=1&retryError=${encodeURIComponent(message)}`)
    }
  }

  async function reprocessDeckStateAction() {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const access = await getAdminAccessForUser(user)

    if (!user || (typedDeck.user_id !== user.id && !access.isAdmin)) {
      redirect(`/decks/${deckId}`)
    }

    try {
      await syncDeckDerivedState(deckId)
      await logDeckImportEvent(supabase, {
        deckId,
        actorUserId: user.id,
        sourceType: typedDeck.source_type ?? null,
        eventType: 'manual_reprocess_succeeded',
        severity: 'info',
        message: `${access.isAdmin && typedDeck.user_id !== user.id ? 'Admin' : 'Owner'} recalculated deck validation and derived state.`,
      })
      redirect(`/decks/${deckId}?reprocessed=1`)
    } catch (error) {
      console.error('Deck reprocess failed:', error)
      await logDeckImportEvent(supabase, {
        deckId,
        actorUserId: user.id,
        sourceType: typedDeck.source_type ?? null,
        eventType: 'manual_reprocess_failed',
        severity: 'warning',
        message: error instanceof Error ? error.message : 'Manual deck reprocess failed.',
        details: {
          trigger: 'deck_detail_reprocess',
        },
      })
      redirect(`/decks/${deckId}?reprocessFailed=1`)
    }
  }

  async function reimportFromSourceAction() {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const access = await getAdminAccessForUser(user)

    if (!user || (typedDeck.user_id !== user.id && !access.isAdmin)) {
      redirect(`/decks/${deckId}`)
    }

    if (typedDeck.source_type !== 'moxfield' || !typedDeck.source_url) {
      redirect(`/decks/${deckId}?reimportFailed=1`)
    }

    try {
      const fetchedDeck = await fetchMoxfieldDeck(typedDeck.source_url)
      const normalizedCards = normalizeImportedCommanderOverlap(fetchedDeck.cards)
      const detectedFormat = normalizeDeckFormat(
        detectDeckFormat(normalizedCards, fetchedDeck.format)
      )
      const validation = validateDeckForFormat(normalizedCards, detectedFormat)
      const commanderNames = normalizedCards
        .filter((card) => card.section === 'commander')
        .map((card) => card.cardName)

      const deckCards = normalizedCards
        .filter((card) => card.section === 'commander' || card.section === 'mainboard')
        .map((card, index) => ({
          deck_id: deckId,
          section: card.section,
          quantity: card.quantity,
          card_name: card.cardName,
          condition: 'near_mint',
          condition_source: 'import_default',
          set_code: card.setCode ?? null,
          set_name: card.setName ?? null,
          collector_number: card.collectorNumber ?? null,
          foil: card.foil ?? false,
          sort_order: index,
        }))

      const deckTokens = normalizedCards
        .filter((card) => card.section === 'token')
        .map((card, index) => ({
          deck_id: deckId,
          quantity: card.quantity,
          token_name: card.cardName,
          set_code: card.setCode ?? null,
          set_name: card.setName ?? null,
          collector_number: card.collectorNumber ?? null,
          foil: card.foil ?? false,
          sort_order: index,
        }))

      const { error: deleteCardsError } = await supabase
        .from('deck_cards')
        .delete()
        .eq('deck_id', deckId)

      if (deleteCardsError) {
        throw new Error(deleteCardsError.message)
      }

      const { error: deleteTokensError } = await supabase
        .from('deck_tokens')
        .delete()
        .eq('deck_id', deckId)

      if (deleteTokensError) {
        throw new Error(deleteTokensError.message)
      }

      if (deckCards.length > 0) {
        const { error: insertCardsError } = await supabase.from('deck_cards').insert(deckCards)

        if (insertCardsError) {
          throw new Error(insertCardsError.message)
        }
      }

      if (deckTokens.length > 0) {
        const { error: insertTokensError } = await supabase.from('deck_tokens').insert(deckTokens)

        if (insertTokensError) {
          throw new Error(insertTokensError.message)
        }
      }

      const { error: updateDeckError } = await supabase
        .from('decks')
        .update({
          commander: commanderNames[0] ?? null,
          format: detectedFormat,
          commander_count: validation.commanderCount,
          mainboard_count: validation.mainboardCount,
          token_count: validation.tokenCount,
          commander_mode: validation.commanderMode,
          commander_names: commanderNames,
          is_valid: validation.isValid,
          validation_errors: validation.errors,
        })
        .eq('id', deckId)

      if (updateDeckError) {
        throw new Error(updateDeckError.message)
      }

      await enrichDeckWithScryfall(deckId, 'refresh')
      await logDeckImportEvent(supabase, {
        deckId,
        actorUserId: user.id,
        sourceType: typedDeck.source_type ?? null,
        eventType: 'source_reimport_succeeded',
        severity: 'info',
        message: `${access.isAdmin && typedDeck.user_id !== user.id ? 'Admin' : 'Owner'} re-imported the deck from its saved source.`,
        details: {
          sourceUrl: typedDeck.source_url,
          detectedFormat,
          deckCards: deckCards.length,
          deckTokens: deckTokens.length,
        },
      })
      redirect(`/decks/${deckId}?reimported=1`)
    } catch (error) {
      console.error('Source re-import failed:', error)
      await logDeckImportEvent(supabase, {
        deckId,
        actorUserId: user?.id ?? null,
        sourceType: typedDeck.source_type ?? null,
        eventType: 'source_reimport_failed',
        severity: 'warning',
        message: error instanceof Error ? error.message : 'Source re-import failed.',
        details: {
          sourceUrl: typedDeck.source_url,
          trigger: 'deck_detail_source_reimport',
        },
      })
      redirect(`/decks/${deckId}?reimportFailed=1`)
    }
  }

  async function repairDeckStructureAction() {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const access = await getAdminAccessForUser(user)

    if (!user || (typedDeck.user_id !== user.id && !access.isAdmin)) {
      redirect(`/decks/${deckId}`)
    }

    try {
      const { data: currentCards, error: currentCardsError } = await supabase
        .from('deck_cards')
        .select(
          'section, quantity, card_name, set_code, set_name, collector_number, foil, sort_order, image_url, price_usd, price_usd_foil, is_legendary, is_background, can_be_commander, keywords, partner_with_name, color_identity, condition, finishes, oracle_text, type_line, rarity, mana_cost, cmc, power, toughness, oracle_id, scryfall_id, price_usd_etched, price_eur, price_eur_foil, price_tix'
        )
        .eq('deck_id', deckId)
        .order('sort_order', { ascending: true })

      const { data: currentTokens, error: currentTokensError } = await supabase
        .from('deck_tokens')
        .select(
          'quantity, token_name, set_code, set_name, collector_number, foil, sort_order, image_url'
        )
        .eq('deck_id', deckId)
        .order('sort_order', { ascending: true })

      if (currentCardsError) {
        throw new Error(currentCardsError.message)
      }

      if (currentTokensError) {
        throw new Error(currentTokensError.message)
      }

      const rebuiltDeck = rebuildDeckStructureFromSavedRows(
        (currentCards ?? []) as Parameters<typeof rebuildDeckStructureFromSavedRows>[0],
        (currentTokens ?? []) as Parameters<typeof rebuildDeckStructureFromSavedRows>[1],
        typedDeck.format
      )

      const { error: deleteCardsError } = await supabase
        .from('deck_cards')
        .delete()
        .eq('deck_id', deckId)

      if (deleteCardsError) {
        throw new Error(deleteCardsError.message)
      }

      const { error: deleteTokensError } = await supabase
        .from('deck_tokens')
        .delete()
        .eq('deck_id', deckId)

      if (deleteTokensError) {
        throw new Error(deleteTokensError.message)
      }

      const rebuiltCardRows = [
        ...rebuiltDeck.commanders.map((row, index) => ({
          deck_id: deckId,
          section: 'commander' as const,
          quantity: row.quantity,
          card_name: row.card_name,
          condition: row.condition ?? 'near_mint',
          set_code: row.set_code ?? null,
          set_name: row.set_name ?? null,
          collector_number: row.collector_number ?? null,
          foil: row.foil ?? false,
          sort_order: index,
        })),
        ...rebuiltDeck.mainboard.map((row, index) => ({
          deck_id: deckId,
          section: 'mainboard' as const,
          quantity: row.quantity,
          card_name: row.card_name,
          condition: row.condition ?? 'near_mint',
          set_code: row.set_code ?? null,
          set_name: row.set_name ?? null,
          collector_number: row.collector_number ?? null,
          foil: row.foil ?? false,
          sort_order: rebuiltDeck.commanders.length + index,
        })),
      ]

      if (rebuiltCardRows.length > 0) {
        const { error: insertCardsError } = await supabase
          .from('deck_cards')
          .insert(rebuiltCardRows)

        if (insertCardsError) {
          throw new Error(insertCardsError.message)
        }
      }

      if (rebuiltDeck.tokens.length > 0) {
        const { error: insertTokensError } = await supabase.from('deck_tokens').insert(
          rebuiltDeck.tokens.map((row, index) => ({
            deck_id: deckId,
            quantity: row.quantity,
            token_name: row.token_name,
            set_code: row.set_code ?? null,
            set_name: row.set_name ?? null,
            collector_number: row.collector_number ?? null,
            foil: row.foil ?? false,
            image_url: row.image_url ?? null,
            sort_order: index,
          }))
        )

        if (insertTokensError) {
          throw new Error(insertTokensError.message)
        }
      }

      const normalizedRebuiltCards = normalizeImportedCommanderOverlap(
        [...rebuiltDeck.commanders, ...rebuiltDeck.mainboard].map((row) => ({
          section: row.section,
          quantity: row.quantity,
          cardName: row.card_name,
          foil: row.foil ?? false,
          setCode: row.set_code ?? undefined,
          setName: row.set_name ?? undefined,
          collectorNumber: row.collector_number ?? undefined,
          isLegendary: row.is_legendary ?? undefined,
          isBackground: row.is_background ?? undefined,
          canBeCommander: row.can_be_commander ?? undefined,
          keywords: row.keywords ?? undefined,
          partnerWithName: row.partner_with_name ?? undefined,
          colorIdentity: row.color_identity ?? undefined,
        }))
      )
      const validation = validateDeckForFormat(normalizedRebuiltCards, typedDeck.format)
      const commanderNames = normalizedRebuiltCards
        .filter((card) => card.section === 'commander')
        .map((card) => card.cardName)
      const leadCommander = rebuiltDeck.commanders[0]
      const tokenCount = rebuiltDeck.tokens.reduce(
        (sum, token) => sum + Number(token.quantity ?? 0),
        0
      )

      const { error: updateDeckError } = await supabase
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
          image_url: leadCommander?.image_url ?? typedDeck.image_url ?? null,
        })
        .eq('id', deckId)

      if (updateDeckError) {
        throw new Error(updateDeckError.message)
      }

      await logDeckImportEvent(supabase, {
        deckId,
        actorUserId: user.id,
        sourceType: typedDeck.source_type ?? null,
        eventType: 'deck_structure_repair_succeeded',
        severity: 'info',
        message: `${access.isAdmin && typedDeck.user_id !== user.id ? 'Admin' : 'Owner'} repaired saved rows across commander, mainboard, and tokens.`,
        details: {
          commanderRows: rebuiltDeck.commanders.length,
          mainboardRows: rebuiltDeck.mainboard.length,
          tokenRows: rebuiltDeck.tokens.length,
        },
      })

      redirect(`/decks/${deckId}?deckRepaired=1`)
    } catch (error) {
      if (isRedirectError(error)) {
        throw error
      }
      console.error('Deck structure repair failed:', error)
      const message =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : 'Deck structure repair failed.'
      await logDeckImportEvent(supabase, {
        deckId,
        actorUserId: user?.id ?? null,
        sourceType: typedDeck.source_type ?? null,
        eventType: 'deck_structure_repair_failed',
        severity: 'warning',
        message,
        details: {
          trigger: 'deck_detail_repair_structure',
        },
      })
      redirect(
        `/decks/${deckId}?deckRepairFailed=1&retryError=${encodeURIComponent(message)}`
      )
    }
  }

  const commanders = typedCards.filter((card) => card.section === 'commander')
  const mainboard = typedCards.filter((card) => card.section === 'mainboard')
  const sideboard = typedCards.filter((card) => card.section === 'sideboard')
  const commanderCandidates = getCommanderCandidates(typedCards)
  const bracketSummary = getCommanderBracketSummary(typedCards)
  const showImportedWarning =
    resolvedSearchParams?.imported === '1' || typedDeck.is_valid === false
  const showCommanderUpdated = resolvedSearchParams?.commanderUpdated === '1'
  const showGuestSaved = resolvedSearchParams?.[GUEST_IMPORT_SAVED_QUERY_KEY] === '1'
  const showCommentAdded = resolvedSearchParams?.commentAdded === '1'
  const showCommentError = resolvedSearchParams?.commentError === '1'
  const showImportEnrichFailed = resolvedSearchParams?.enrich === 'failed'
  const showEnrichRetried = resolvedSearchParams?.enrichRetried === '1'
  const showEnrichRetryFailed = resolvedSearchParams?.enrichRetryFailed === '1'
  const retryErrorMessage =
    typeof resolvedSearchParams?.retryError === 'string' ? resolvedSearchParams.retryError : null
  const showReprocessed = resolvedSearchParams?.reprocessed === '1'
  const showReprocessFailed = resolvedSearchParams?.reprocessFailed === '1'
  const showReimported = resolvedSearchParams?.reimported === '1'
  const showReimportFailed = resolvedSearchParams?.reimportFailed === '1'
  const showDeckRepaired = resolvedSearchParams?.deckRepaired === '1'
  const showDeckRepairFailed = resolvedSearchParams?.deckRepairFailed === '1'
  const showDuplicateCardsFixed = resolvedSearchParams?.duplicateCardsFixed === '1'
  const canRunImportRecovery = !!user && (isOwner || isAdmin)
  const canReimportFromSource =
    canRunImportRecovery &&
    typedDeck.source_type === 'moxfield' &&
    !!typedDeck.source_url
  const importSourceLabel =
    typedDeck.source_type === 'moxfield'
      ? 'Moxfield'
      : typedDeck.source_type === 'archidekt'
      ? 'Archidekt'
      : 'Text or file'
  const likelyNeedsEnrichment =
    Number(typedDeck.price_total_usd_foil ?? 0) === 0 ||
    !typedDeck.image_url?.trim()
  const duplicateValidationErrors = (typedDeck.validation_errors ?? []).filter((error) =>
    error.toLowerCase().includes('duplicate card detected')
  )

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
  const importEventsSchemaMissing = isDeckImportEventsSchemaMissing(importEventsError?.message)
  const importEvents = (importEventsData ?? []) as DeckImportEventRow[]
  const latestImportIssue = importEvents.find(
    (event) => event.severity === 'error' || event.severity === 'warning'
  )
  const unreadNotifications = user ? await getUnreadNotificationsCount(supabase, user.id) : 0

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader
        current="decks"
        isSignedIn={!!user}
        isAdmin={isAdmin}
        unreadNotifications={unreadNotifications}
      />
      <GuestDraftCleanup shouldClear={showGuestSaved} />
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.18),_transparent_28%),linear-gradient(to_bottom,_rgb(24,24,27),_rgb(9,9,11))]">
        <div className="mx-auto w-full max-w-[104rem] px-6 py-12 2xl:max-w-[116rem]">
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

            {user && !isOwner && typedDeck.is_listed_for_trade && (
              <Link
                href={`/trade-offers/propose?deckId=${deckId}`}
                className="inline-block rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-400/15"
              >
                Propose Trade
              </Link>
            )}

            {isOwner && (
              <Link
                href={`/my-decks/${deckId}?tab=settings`}
                className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Deck Settings
              </Link>
            )}

            {isOwner && (
              <Link
                href={`/auction-prototype?deckId=${deckId}`}
                className="inline-block rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-400/15"
              >
                Auction This Deck
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

          <div className="mt-4 flex flex-wrap gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs ${getInventoryStatusBadgeClass(inventoryStatus)}`}
            >
              {getInventoryStatusLabel(inventoryStatus)}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs ${
                typedDeck.is_listed_for_trade
                  ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                  : 'border-white/10 bg-white/5 text-zinc-300'
              }`}
            >
              {typedDeck.is_listed_for_trade ? 'Listed for Deck Swap' : 'Not currently listed for Deck Swap'}
            </span>
            {hasBuyNow && (
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
                Buy It Now {formatCurrencyAmount(buyNowPrice, buyNowCurrency)}
              </span>
            )}
            {typedDeck.trade_wanted_profile && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                Looking for: {typedDeck.trade_wanted_profile}
              </span>
            )}
          </div>

          {inventoryStatusLocked && (
            <div className="mt-6 rounded-2xl border border-zinc-600/40 bg-zinc-800/70 p-4 text-sm text-zinc-200">
              <div className="font-medium text-white">{getInventoryStatusLabel(inventoryStatus)}</div>
              <p className="mt-2 text-zinc-300">{getInventoryStatusDescription(inventoryStatus)}</p>
              {inventoryStatus === 'holiday_pending_receipt' && (
                <p className="mt-2 text-zinc-400">
                  This deck has been committed to the Mythiverse Exchange Holiday program and is no longer being presented like a live trade or sale listing.
                </p>
              )}
            </div>
          )}

          {isSuperadmin && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/decks/${deckId}`}
                className={`rounded-xl px-4 py-2 text-sm font-medium ${
                  activeInternalTab === 'deck'
                    ? 'bg-white text-zinc-950'
                    : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                Deck View
              </Link>
              <Link
                href={`/decks/${deckId}?view=superadmin`}
                className={`rounded-xl px-4 py-2 text-sm font-medium ${
                  activeInternalTab === 'superadmin'
                    ? 'bg-emerald-400 text-zinc-950'
                    : 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15'
                }`}
              >
                Superadmin
              </Link>
            </div>
          )}

          {showCommanderUpdated && (
            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              Commander updated. The deck validation status has been recalculated.
            </div>
          )}

          {showGuestSaved && (
            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              Your guest preview has been saved to your account and cleared from temporary browser storage.
            </div>
          )}

          {showCommentAdded && (
            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              Comment added to the deck discussion.
            </div>
          )}

          {showCommentError && (
            <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
              Add a little more detail before posting your comment.
            </div>
          )}

          {showEnrichRetried && (
            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              Import enrichment was retried and the deck metadata was refreshed.
            </div>
          )}

          {showReprocessed && (
            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              Deck validation and derived state were recalculated.
            </div>
          )}

          {showReimported && (
            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              Deck re-imported successfully from the saved source.
            </div>
          )}

          {showDeckRepaired && (
            <div className="mt-6 rounded-3xl border border-sky-500/20 bg-sky-500/10 p-5 text-sm text-sky-100 shadow-[0_0_0_1px_rgba(14,165,233,0.08)]">
              <div className="font-medium text-sky-200">Deck repair completed</div>
              <p className="mt-3 text-sky-100/90">
                Saved rows were rebuilt across commander, mainboard, and tokens, then validation was refreshed.
              </p>
            </div>
          )}

          {showDuplicateCardsFixed && (
            <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]">
              <div className="font-medium text-emerald-100">Duplicate overlap cleaned up</div>
              <p className="mt-3 text-emerald-100/90">
                DeckSwap removed the overlapping commander and mainboard copy that was left behind while saving the commander choice.
              </p>
            </div>
          )}

          {showEnrichRetryFailed && (
            <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100 shadow-[0_0_0_1px_rgba(239,68,68,0.08)]">
              <div className="font-medium text-red-200">Enrichment retry failed</div>
              <p className="mt-3 text-red-100/90">
                {latestImportIssue?.message ||
                  retryErrorMessage ||
                  'Re-running enrichment failed. Check source coverage, pricing migrations, or try again from admin maintenance.'}
              </p>
            </div>
          )}

          {showReprocessFailed && (
            <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100 shadow-[0_0_0_1px_rgba(239,68,68,0.08)]">
              <div className="font-medium text-red-200">Deck reprocess failed</div>
              <p className="mt-3 text-red-100/90">
                {latestImportIssue?.message ||
                  'Reprocessing deck state failed. The deck data may still be missing supporting metadata.'}
              </p>
            </div>
          )}

          {showReimportFailed && (
            <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100 shadow-[0_0_0_1px_rgba(239,68,68,0.08)]">
              <div className="font-medium text-red-200">Deck re-import failed</div>
              <p className="mt-3 text-red-100/90">
                {latestImportIssue?.message ||
                  'The saved source could not be re-imported right now. Check that the source is still public and available.'}
              </p>
            </div>
          )}

          {showDeckRepairFailed && (
            <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100 shadow-[0_0_0_1px_rgba(239,68,68,0.08)]">
              <div className="font-medium text-red-200">Deck repair failed</div>
              <p className="mt-3 text-red-100/90">
                {latestImportIssue?.message ||
                  retryErrorMessage ||
                  'Saved rows could not be repaired right now. You can still try a source re-import or standard reprocess.'}
              </p>
            </div>
          )}

          {showImportedWarning &&
            typedDeck.validation_errors &&
            typedDeck.validation_errors.length > 0 && (
              <details open className="mt-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm text-yellow-100 shadow-[0_0_0_1px_rgba(234,179,8,0.06)]">
                <summary className="cursor-pointer list-none font-medium text-yellow-200">
                  Imported, but validation found issues
                </summary>
                <ul className="mt-3 list-disc pl-5 text-yellow-100/90">
                  {typedDeck.validation_errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
                {canRunImportRecovery && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <form action={reprocessDeckStateAction}>
                      <FormActionButton
                        pendingLabel="Reprocessing..."
                        className="rounded-xl border border-yellow-200/20 bg-yellow-100/10 px-4 py-2 text-sm font-medium text-yellow-50 hover:bg-yellow-100/15 disabled:cursor-wait disabled:opacity-70"
                      >
                        Rebuild deck state
                      </FormActionButton>
                    </form>
                    <form action={retryEnrichmentAction}>
                      <FormActionButton
                        pendingLabel="Retrying..."
                        className="rounded-xl border border-yellow-200/20 bg-black/20 px-4 py-2 text-sm font-medium text-yellow-50 hover:bg-black/30 disabled:cursor-wait disabled:opacity-70"
                      >
                        Retry card data
                      </FormActionButton>
                    </form>
                    {canReimportFromSource && (
                      <form action={reimportFromSourceAction}>
                        <FormActionButton
                          pendingLabel="Re-importing..."
                          className="rounded-xl border border-yellow-200/20 bg-black/20 px-4 py-2 text-sm font-medium text-yellow-50 hover:bg-black/30 disabled:cursor-wait disabled:opacity-70"
                        >
                          Re-import from source
                        </FormActionButton>
                      </form>
                    )}
                    <form action={repairDeckStructureAction}>
                      <FormActionButton
                        pendingLabel="Repairing..."
                        className="rounded-xl border border-yellow-200/20 bg-black/20 px-4 py-2 text-sm font-medium text-yellow-50 hover:bg-black/30 disabled:cursor-wait disabled:opacity-70"
                      >
                        Repair saved rows
                      </FormActionButton>
                    </form>
                  </div>
                )}
                {duplicateValidationErrors.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-yellow-200/20 bg-black/20 p-4 text-sm text-yellow-50/90">
                    Duplicate-card errors usually mean an import left overlapping commander, mainboard, or token rows behind. Start with <span className="font-medium text-white">Repair saved rows</span>. If the original source is still public, <span className="font-medium text-white">Re-import from source</span> is the cleanest reset.
                  </div>
                )}
              </details>
            )}

          {showImportEnrichFailed && (
            <div className="mt-6 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-100 shadow-[0_0_0_1px_rgba(245,158,11,0.06)]">
              <div className="font-medium text-amber-200">
                Import completed, but source enrichment did not finish.
              </div>
              <p className="mt-3 text-amber-100/90">
                DeckSwap saved the deck from {importSourceLabel}, but image, pricing, or commander metadata may still be incomplete until enrichment succeeds.
              </p>
              {canRunImportRecovery && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <form action={retryEnrichmentAction}>
                    <FormActionButton
                      pendingLabel="Retrying..."
                      className="rounded-xl border border-amber-200/20 bg-amber-100/10 px-4 py-2 text-sm font-medium text-amber-50 hover:bg-amber-100/15 disabled:cursor-wait disabled:opacity-70"
                    >
                      Retry card data now
                    </FormActionButton>
                  </form>
                  <form action={reprocessDeckStateAction}>
                    <FormActionButton
                      pendingLabel="Reprocessing..."
                      className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-amber-50 hover:bg-black/30 disabled:cursor-wait disabled:opacity-70"
                    >
                      Rebuild deck state
                    </FormActionButton>
                  </form>
                  {canReimportFromSource && (
                    <form action={reimportFromSourceAction}>
                      <FormActionButton
                        pendingLabel="Re-importing..."
                        className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-amber-50 hover:bg-black/30 disabled:cursor-wait disabled:opacity-70"
                      >
                        Re-import from source
                      </FormActionButton>
                    </form>
                  )}
                  <form action={repairDeckStructureAction}>
                    <FormActionButton
                      pendingLabel="Repairing..."
                      className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-amber-50 hover:bg-black/30 disabled:cursor-wait disabled:opacity-70"
                    >
                      Repair saved rows
                    </FormActionButton>
                  </form>
                </div>
              )}
            </div>
          )}

          {likelyNeedsEnrichment && !showImportEnrichFailed && canRunImportRecovery && (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-200">
              <div className="font-medium text-white">Import recovery tools</div>
              <p className="mt-3 text-zinc-400">
                This deck is still missing some enriched metadata, such as pricing or lead imagery. You can retry the source pull or just recalculate deck state from the saved card rows.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <form action={retryEnrichmentAction}>
                  <FormActionButton
                    pendingLabel="Retrying..."
                    className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:cursor-wait disabled:opacity-70"
                  >
                    Retry card data
                  </FormActionButton>
                </form>
                <form action={reprocessDeckStateAction}>
                  <FormActionButton
                    pendingLabel="Reprocessing..."
                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-black/30 disabled:cursor-wait disabled:opacity-70"
                  >
                    Rebuild deck state
                  </FormActionButton>
                </form>
                {canReimportFromSource && (
                  <form action={reimportFromSourceAction}>
                    <FormActionButton
                      pendingLabel="Re-importing..."
                      className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-black/30 disabled:cursor-wait disabled:opacity-70"
                    >
                      Re-import from source
                    </FormActionButton>
                  </form>
                )}
                <form action={repairDeckStructureAction}>
                  <FormActionButton
                    pendingLabel="Repairing..."
                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-black/30 disabled:cursor-wait disabled:opacity-70"
                  >
                    Repair saved rows
                  </FormActionButton>
                </form>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-6">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900/90 shadow-[0_24px_80px_rgba(0,0,0,0.35)] xl:grid xl:grid-cols-[280px_minmax(0,1fr)] xl:items-stretch">
              <div className="p-5 xl:border-r xl:border-white/10 xl:p-6">
                <div className="mx-auto w-full max-w-[13rem] xl:max-w-none">
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
              </div>

              <div className="p-6 xl:flex xl:flex-col xl:justify-between xl:p-8">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-200">
                      {getDeckFormatLabel(deckFormat)}
                    </div>
                    <div
                      className={`inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                        typedDeck.is_valid
                          ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                          : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-100'
                      }`}
                    >
                      {typedDeck.is_valid ? 'Ready to market' : 'Needs review'}
                    </div>
                    <div
                      className={`inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                        typedDeck.is_listed_for_trade
                          ? 'border-sky-400/20 bg-sky-400/10 text-sky-200'
                          : 'border-white/10 bg-white/5 text-zinc-300'
                      }`}
                    >
                      {typedDeck.is_listed_for_trade ? 'Deck Swap live' : 'Not listed'}
                    </div>
                    {hasBuyNow && (
                      <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-200">
                        Buy It Now
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <h1 className="text-3xl font-semibold">{typedDeck.name}</h1>
                      <p className="mt-2 text-zinc-400">
                        {typedDeck.commander || 'Commander pending review'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-400">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          Imported {formatImportedAt(typedDeck.imported_at)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          {mainboard.reduce((sum, card) => sum + card.quantity, 0)} mainboard
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          {sideboard.reduce((sum, card) => sum + card.quantity, 0)} sideboard
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          {tokenCards.reduce((sum, card) => sum + card.quantity, 0)} tokens
                        </span>
                      </div>
                    </div>

                    <div className="grid min-w-[260px] gap-3 sm:grid-cols-2 xl:w-[340px]">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                          Market
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-emerald-300">
                          ${Math.round(tradeValue.deckValue)}
                        </div>
                      </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                      Deck Swap
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-sky-200">
                          ${Math.round(tradeValue.deckSwapValue)}
                        </div>
                      </div>
                      {hasBuyNow && (
                        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 sm:col-span-2">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80">
                            Buy It Now
                          </div>
                          <div className="mt-2 text-2xl font-semibold text-amber-200">
                            {formatCurrencyAmount(buyNowPrice, buyNowCurrency)}
                          </div>
                          <div className="mt-1 text-xs text-amber-50/70">
                            Direct-sale price without running an auction in {buyNowCurrency}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Fastest path to market
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {typedDeck.is_valid ? 'Validation looks good' : 'Fix validation notes'}
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          {typedDeck.is_valid
                            ? 'This deck is structurally ready for listing.'
                            : 'Clean up the import flags before sending offers or listing.'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {marketingChips.length > 0 ? marketingChips.join(' · ') : 'Add deck presentation'}
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          Sleeves, box, sealed status, and precon completeness help buyers trust the listing.
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {inventoryStatusLocked
                            ? getInventoryStatusLabel(inventoryStatus)
                            : hasBuyNow
                            ? `Buy it now is live at ${formatCurrencyAmount(buyNowPrice, buyNowCurrency)}`
                            : typedDeck.is_listed_for_trade
                              ? 'Deck Swap is active'
                              : 'Turn on trade listing'}
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          {inventoryStatusLocked
                            ? getInventoryStatusDescription(inventoryStatus)
                            : hasBuyNow
                            ? 'Seller is offering a direct-sale fallback after trying to preserve more value through Deck Swap.'
                            : 'Add wanted colors and formats so matches can find the right deck faster.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 xl:justify-end">
                    {isOwner ? (
                      <>
                        <Link
                          href={`/my-decks/${deckId}`}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10"
                        >
                          Edit deck
                        </Link>
                        <Link
                          href={`/my-decks/${deckId}?tab=settings`}
                          className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15"
                        >
                          Listing & status
                        </Link>
                      </>
                    ) : inventoryStatusLocked ? (
                      <div className="rounded-2xl border border-zinc-600/40 bg-zinc-800/70 px-4 py-3 text-sm font-medium text-zinc-200">
                        {getInventoryStatusLabel(inventoryStatus)}
                      </div>
                    ) : typedDeck.is_listed_for_trade ? (
                      <Link
                        href={`/trade-offers/propose?deckId=${deckId}`}
                        className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15"
                      >
                        Propose trade
                      </Link>
                    ) : hasBuyNow ? (
                      <Link
                        href={sellerProfile?.username ? `/u/${sellerProfile.username}` : `/decks/${deckId}#seller`}
                        className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-200 hover:bg-amber-400/15"
                      >
                        Buy it now interest
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
              <div className="min-w-0 space-y-4">
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
                        <FormActionButton
                          pendingLabel="Saving commander..."
                          className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
                        >
                          Save Commander
                        </FormActionButton>
                      </form>
                    </div>
                  )}

                <div className="grid gap-4 xl:grid-cols-3">
                {isCommanderDeck ? (
                  <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5">
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
                  <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5">
                    <div className="text-sm text-zinc-400">Deck Format</div>
                    <div className="mt-2 text-3xl font-semibold">
                      {getDeckFormatLabel(deckFormat)}
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">
                      This deck is using the relaxed import flow for broader supported formats.
                    </p>
                  </div>
                )}

                <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5">
                  <div className="text-sm text-zinc-400">Estimated Card Pricing</div>
                  <div className="mt-2 text-3xl font-semibold text-emerald-300">
                    ${tradeValue.deckValue.toFixed(2)}
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    Blended market value across the cards currently stored in this deck.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5">
                  <div className="text-sm text-zinc-400">Deck Swap Value</div>
                  <div className="mt-2 text-3xl font-semibold text-sky-200">
                    ${tradeValue.deckSwapValue.toFixed(2)}
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    Practical trade value after fee, shipping, and insurance.
                  </p>
                  <div className="mt-3 text-sm text-zinc-300">
                    {`Fee $${tradeValue.fee.toFixed(2)} · Ship $${tradeValue.shipping.toFixed(2)} · Ins $${tradeValue.insurance.toFixed(2)}`}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5">
                  <div className="text-sm text-zinc-400">Buylist Comparison</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                        Buylist Estimate
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-amber-200">
                        ${tradeValue.buylistValue.toFixed(2)}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {(tradeValue.buylistRate * 100).toFixed(0)}% of raw deck value
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                        Extra Value Kept
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-emerald-300">
                        +${tradeValue.extraVsBuylist.toFixed(2)}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        Estimated upside versus a conservative buylist path
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
                  <div className="text-sm text-amber-100">Buy It Now Guidance</div>
                  <div className={`mt-3 grid gap-3 ${isAdmin ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                        Buylist Floor
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-amber-200">
                        {formatCurrencyAmount(buyNowSuggestion.floor, buyNowCurrency)}
                      </div>
                    </div>
                    {isAdmin ? (
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                          Guaranteed Offer
                        </div>
                        <div className="mt-1 text-2xl font-semibold text-rose-200">
                          {formatCurrencyAmount(guaranteedBuyNow, buyNowCurrency)}
                        </div>
                      </div>
                    ) : null}
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                        Suggested
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-white">
                        {formatCurrencyAmount(buyNowSuggestion.suggested, buyNowCurrency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                        Deck Swap Ceiling
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-sky-100">
                        {formatCurrencyAmount(buyNowSuggestion.ceiling, buyNowCurrency)}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-amber-50/85">
                    Think in order: maximize value through Deck Swap first, offer Buy It Now second, and save auctions for the fallback path when the deck still needs help moving.
                  </p>
                  <p className="mt-2 text-sm text-amber-50/70">
                    Buy It Now is the direct-sale lane for another user to purchase the deck without an auction.
                  </p>
                  {isAdmin ? (
                    <p className="mt-2 text-sm text-amber-50/70">
                      Guaranteed Offer is a separate internal DeckSwap purchase lane and remains admin-only.
                    </p>
                  ) : null}
                  {hasBuyNow ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white">
                      Seller is currently willing to take <span className="font-semibold text-amber-200">{formatCurrencyAmount(buyNowPrice, buyNowCurrency)}</span> without an auction.
                      {typedDeck.buy_now_listing_notes ? ` ${typedDeck.buy_now_listing_notes}` : ''}
                    </div>
                  ) : isOwner ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-amber-50/85">
                      Add a buy-it-now price in deck settings if you want to offer a direct-sale path without opening an auction.
                    </div>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5">
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

                {isCommanderDeck ? (
                  <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5">
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
                ) : (
                  <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5">
                    <div className="text-sm text-zinc-400">Deck Snapshot</div>
                    <div className="mt-3 text-sm text-zinc-300">
                      Imported {formatImportedAt(typedDeck.imported_at)} and ready for broader format review.
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-3 xl:col-span-3">
                  <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5">
                    <div className="text-sm text-zinc-400">Commanders</div>
                    <div className="mt-2 text-3xl font-semibold text-white">
                      {commanders.reduce((sum, card) => sum + card.quantity, 0)}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5">
                    <div className="text-sm text-zinc-400">Mainboard</div>
                    <div className="mt-2 text-3xl font-semibold text-white">
                      {mainboard.reduce((sum, card) => sum + card.quantity, 0)}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5">
                    <div className="text-sm text-zinc-400">Tokens</div>
                    <div className="mt-2 text-3xl font-semibold text-white">
                      {tokenCards.reduce((sum, card) => sum + card.quantity, 0)}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5 xl:col-span-2">
                  <div className="text-sm text-zinc-400">Deck Snapshot</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">Validation</div>
                      <div className="mt-2 text-sm font-medium text-white">
                        {typedDeck.is_valid ? 'Ready for listing' : 'Needs review'}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">Commander Mode</div>
                      <div className="mt-2 text-sm font-medium capitalize text-white">
                        {(typedDeck.commander_mode ?? 'unknown').replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">Deck Presentation</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {marketingChips.length > 0 ? (
                          marketingChips.map((chip) => (
                            <span
                              key={chip}
                              className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200"
                            >
                              {chip}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-zinc-400">
                            No packaging details added yet.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {isCommanderDeck && (
                  <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5 xl:col-span-3">
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

              <div className="space-y-5">
                <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-zinc-400">Seller / Trader Trust</div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {sellerProfile?.display_name || sellerProfile?.username || 'Mythiverse seller'}
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">
                      {sellerProfile?.marketplace_tagline || 'Profile trust, shipping readiness, and marketplace references live here.'}
                    </p>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      sellerSummary?.banned_status && sellerSummary.banned_status !== 'active'
                        ? 'border border-red-500/20 bg-red-500/10 text-red-200'
                        : 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                    }`}
                  >
                    {sellerSummary?.banned_status && sellerSummary.banned_status !== 'active'
                      ? 'Restricted'
                      : 'Active'}
                  </div>
                </div>

                {profileSchemaMissing ? (
                  <p className="mt-4 text-sm text-zinc-400">
                    Seller trust tables have not been added yet. Run the user profile SQL migration to enable public profiles and verification badges.
                  </p>
                ) : (
                  <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-wide text-zinc-500">Ship From</div>
                        <div className="mt-2 text-sm font-medium text-white">
                          {formatShipFrom(sellerProfile)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-wide text-zinc-500">Completed Trades</div>
                        <div className="mt-2 text-sm font-medium text-white">
                          {sellerSummary?.completed_trades_count ?? 0}
                        </div>
                      </div>
                    </div>

                    {showInternalAdminPanel && (
                      <AdminOnlyCallout
                        className="mt-4"
                        title="Internal validation score"
                        description="This seller trust panel is visible to admins only and hidden from public deck viewers."
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-emerald-100/70">
                              Internal Validation Score
                            </div>
                            <div className="mt-2 text-3xl font-semibold text-emerald-300">
                              {internalValidation.score}
                            </div>
                            <div className="mt-1 text-sm text-emerald-100/80">
                              {internalValidation.tier}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                            <div className="text-xs uppercase tracking-wide text-zinc-500">Activity</div>
                            <div className="mt-1 text-lg font-semibold text-white">
                              {internalValidation.activityScore}/20
                            </div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                            <div className="text-xs uppercase tracking-wide text-zinc-500">Reply Speed</div>
                            <div className="mt-1 text-lg font-semibold text-white">
                              {internalValidation.replyScore}/20
                            </div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                            <div className="text-xs uppercase tracking-wide text-zinc-500">Location</div>
                            <div className="mt-1 text-lg font-semibold text-white">
                              {internalValidation.locationScore}/15
                            </div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                            <div className="text-xs uppercase tracking-wide text-zinc-500">History</div>
                            <div className="mt-1 text-lg font-semibold text-white">
                              {internalValidation.historyScore}/25
                            </div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                            <div className="text-xs uppercase tracking-wide text-zinc-500">Rating</div>
                            <div className="mt-1 text-lg font-semibold text-white">
                              {internalValidation.ratingScore}/20
                            </div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                            <div className="text-xs uppercase tracking-wide text-zinc-500">Modifier</div>
                            <div className="mt-1 text-lg font-semibold text-white">
                              {internalValidation.modifier >= 0 ? '+' : ''}
                              {internalValidation.modifier}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-emerald-50/85">
                          {internalValidation.notes.slice(0, 4).map((note) => (
                            <p key={note}>{note}</p>
                          ))}
                        </div>
                      </AdminOnlyCallout>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {sellerBadges.length > 0 ? (
                        sellerBadges.map((badge) => (
                          <span
                            key={badge}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200"
                          >
                            {badge}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-zinc-400">
                          No trust badges yet.
                        </span>
                      )}
                    </div>

                    {(sellerProfile?.username || sellerLinks.length > 0 || isOwner) && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {sellerProfile?.username && (
                          <Link
                            href={`/u/${sellerProfile.username}`}
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                          >
                            View public profile
                          </Link>
                        )}
                        {isOwner && (
                          <Link
                            href="/settings/profile"
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                          >
                            Edit profile
                          </Link>
                        )}
                        {sellerLinks.map((link) => (
                          <a
                            key={`${link.label}-${link.href}`}
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    )}

                    {sellerSummary?.banned_status && sellerSummary.banned_status !== 'active' && (
                      <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
                        Seller status is currently restricted.
                        {sellerSummary.banned_reason ? ` Reason: ${sellerSummary.banned_reason}` : ''}
                      </div>
                    )}
                  </>
                )}
                </div>

                {showInternalAdminPanel && typedDeck.user_id && (
                  <div className="space-y-5">
                      <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                        <div className="text-sm font-medium text-emerald-200">
                          Import Event Log
                        </div>
                        <p className="mt-2 text-sm text-emerald-50/80">
                          Internal deck-import timeline for failures, enrichment retries, and repair actions.
                        </p>

                        {importEventsSchemaMissing ? (
                          <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                            Run <code>docs/sql/deck-import-events.sql</code> in Supabase to enable per-deck import event logging.
                          </div>
                        ) : importEventsError ? (
                          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
                            Could not load import events: {importEventsError.message}
                          </div>
                        ) : importEvents.length > 0 ? (
                          <div className="mt-4 space-y-3">
                            {importEvents.map((event) => (
                              <div
                                key={event.id}
                                className="rounded-2xl border border-white/10 bg-black/20 p-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${
                                        event.severity === 'error'
                                          ? 'bg-red-500/20 text-red-200'
                                          : event.severity === 'warning'
                                          ? 'bg-amber-500/20 text-amber-200'
                                          : 'bg-emerald-500/20 text-emerald-200'
                                      }`}
                                    >
                                      {event.severity}
                                    </span>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-wide text-zinc-300">
                                      {event.event_type.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  <div className="text-xs text-zinc-400">
                                    {formatDeckImportEventTimestamp(event.created_at)}
                                  </div>
                                </div>
                                <div className="mt-3 text-sm text-white">{event.message}</div>
                                {event.source_type && (
                                  <div className="mt-2 text-xs uppercase tracking-wide text-zinc-500">
                                    Source: {event.source_type}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-emerald-50/80">
                            No import events have been recorded for this deck yet.
                          </div>
                        )}
                      </div>

                      <form action={updateSellerTrustAction} className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                        <div className="text-sm font-medium text-emerald-200">
                          {isSuperadmin ? 'Superadmin Trust Controls' : 'Admin Trust Controls'}
                        </div>
                        <p className="mt-2 text-sm text-emerald-50/80">
                          Manual trust overrides for known users, friends, and restricted accounts.
                        </p>

                        <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-emerald-50/80">
                          Internal access: {isSuperadmin ? 'Superadmin' : 'Admin'}
                        </div>

                        <div className="mt-4 space-y-3 text-sm text-zinc-100">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" name="is_manually_verified" defaultChecked={sellerSummary?.is_manually_verified ?? false} />
                            Manually verified
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" name="is_known_user" defaultChecked={sellerSummary?.is_known_user ?? false} />
                            Known user
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" name="is_friend_of_platform" defaultChecked={sellerSummary?.is_friend_of_platform ?? false} />
                            Friend of DeckSwap
                          </label>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm text-emerald-50/80">Last seen at</label>
                            <input
                              type="datetime-local"
                              name="last_seen_at"
                              defaultValue={sellerSummary?.last_seen_at?.slice(0, 16) ?? ''}
                              className="w-full rounded-xl border border-white/10 bg-zinc-950/70 p-3 text-white"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm text-emerald-50/80">Avg. trade reply hours</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              name="avg_trade_reply_hours"
                              defaultValue={sellerSummary?.avg_trade_reply_hours ?? ''}
                              className="w-full rounded-xl border border-white/10 bg-zinc-950/70 p-3 text-white"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm text-emerald-50/80">Last login IP country</label>
                            <input
                              name="last_login_ip_country"
                              defaultValue={sellerSummary?.last_login_ip_country ?? ''}
                              placeholder="Canada"
                              className="w-full rounded-xl border border-white/10 bg-zinc-950/70 p-3 text-white"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm text-emerald-50/80">Internal user rating</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="5"
                              name="internal_user_rating"
                              defaultValue={sellerSummary?.internal_user_rating ?? ''}
                              className="w-full rounded-xl border border-white/10 bg-zinc-950/70 p-3 text-white"
                            />
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-emerald-50/80">
                          Internal score inputs combine last login recency, trade reply speed, IP country consistency, past transaction history, and user rating. Manual verification and restricted statuses then nudge the score up or down.
                        </div>

                        <div className="mt-4">
                          <label className="mb-2 block text-sm text-emerald-50/80">Banned status</label>
                          <select
                            name="banned_status"
                            defaultValue={sellerSummary?.banned_status ?? 'active'}
                            className="w-full rounded-xl border border-white/10 bg-zinc-950/70 p-3 text-white"
                          >
                            <option value="active">Active</option>
                            <option value="watchlist">Watchlist</option>
                            <option value="restricted">Restricted</option>
                            <option value="banned">Banned</option>
                          </select>
                        </div>

                        <div className="mt-4">
                          <label className="mb-2 block text-sm text-emerald-50/80">Banned / review reason</label>
                          <textarea name="banned_reason" rows={3} defaultValue={sellerSummary?.banned_reason ?? ''} className="w-full rounded-xl border border-white/10 bg-zinc-950/70 p-3 text-white" />
                        </div>

                        <div className="mt-4">
                          <label className="mb-2 block text-sm text-emerald-50/80">Manual review notes</label>
                          <textarea name="manual_review_notes" rows={3} defaultValue={sellerSummary?.manual_review_notes ?? ''} className="w-full rounded-xl border border-white/10 bg-zinc-950/70 p-3 text-white" />
                        </div>

                        <button className="mt-4 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950">
                          Save Trust Controls
                        </button>
                      </form>
                  </div>
                )}
              </div>
                </div>
              </div>
            </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <DeckCardViews
          commanders={commanders}
          mainboard={mainboard}
          sideboard={sideboard}
          tokens={tokenCards}
        />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-zinc-900/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-400">
              Listing Guide
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white">How to check card condition before listing</h2>
            <div className="mt-4 space-y-3 text-sm text-zinc-300">
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Check cards in bright, indirect light and review the front, back, edges, and corners outside of sleeves.
              </p>
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Use the worst visible issue on the card, not the best angle. Whitening, dents, bends, ink wear, and clouding all count.
              </p>
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                If a card is between two grades, list the lower one. Conservative grading reduces escrow disputes and keeps trust high.
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-zinc-900/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
            <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-300">
              Escrow Review
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white">Arbitration during escrow</h2>
            <div className="mt-4 space-y-3 text-sm text-zinc-300">
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                DeckSwap compares received cards against the saved list, declared conditions, and any agreed notes before release.
              </p>
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                If a card arrives materially below the listed condition, release pauses while support reviews photos, timestamps, and the inventory record.
              </p>
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Resolution can include proceed as-is, renegotiate equalization, partial credit, or return shipment depending on the severity of the mismatch.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-[2rem] border border-white/10 bg-zinc-900/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-400">
                Deck Discussion
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-white">Comments and context</h2>
              <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                Use this space to ask about card choices, share matchup context, or leave trading notes on the list.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
              {typedComments.length} comment{typedComments.length === 1 ? '' : 's'}
            </div>
          </div>

          {commentsSchemaMissing ? (
            <div className="mt-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm text-yellow-100">
              Run <code>docs/sql/deck-comments.sql</code> in Supabase to enable deck discussion threads.
            </div>
          ) : commentsError ? (
            <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">
              Could not load comments right now: {commentsError.message}
            </div>
          ) : (
            <>
              <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
                {user ? (
                  <form action={addDeckCommentAction} className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Add a comment</label>
                      <Textarea
                        name="body"
                        rows={4}
                        maxLength={1200}
                        placeholder="Share play experience, trade context, or questions about the list."
                        className="min-h-28 rounded-2xl border-white/10 bg-zinc-950/70 text-white placeholder:text-zinc-500"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-zinc-500">
                        Signed-in users can add public discussion on this deck.
                      </p>
                      <Button className="rounded-xl bg-emerald-400 px-5 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-300">
                        Post Comment
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-2xl text-sm text-zinc-400">
                      Sign in to comment on this deck, ask questions, or add matchup and trade context for other users.
                    </p>
                    <Link
                      href={`/sign-in?next=/decks/${deckId}`}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                    >
                      Sign in to comment
                    </Link>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-4">
                {typedComments.length > 0 ? (
                  typedComments.map((comment) => {
                    const author = commentAuthors.get(comment.user_id)
                    const displayName =
                      author?.display_name ||
                      (author?.username ? `@${author.username}` : 'DeckSwap user')

                    return (
                      <article
                        key={comment.id}
                        className="rounded-3xl border border-white/10 bg-white/5 p-5"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-sm font-medium text-white">{displayName}</div>
                            {author?.username && author.display_name && (
                              <div className="mt-1 text-xs text-zinc-500">@{author.username}</div>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {formatCommentTimestamp(comment.created_at)}
                          </div>
                        </div>
                        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                          {comment.body}
                        </p>
                      </article>
                    )
                  })
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
                    <h3 className="text-xl font-semibold text-white">No comments yet</h3>
                    <p className="mt-2 text-sm text-zinc-400">
                      Be the first to add context, ask a question, or explain what makes this list interesting.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {!commentsSchemaMissing && commentAuthorsError && (
            <p className="mt-4 text-sm text-zinc-500">
              Comment author profiles could not be fully loaded, so some names may fall back to a generic label.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
