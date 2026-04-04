import { normalizeImportedCommanderOverlap } from '@/lib/commander/normalize'
import { validateDeckForFormat } from '@/lib/commander/validate'
import type { ImportedDeckCard } from '@/lib/commander/types'
import { detectDeckFormat, normalizeDeckFormat } from '@/lib/decks/formats'
import { enrichDeckWithScryfall } from '@/app/import-deck/enrich'
import {
  isGuestImportSchemaMissing,
} from '@/lib/guest-import'
import { logDeckImportEvent } from '@/lib/import-events'

type SupabaseLike = any

type ImportNormalizedDeckArgs = {
  supabase: SupabaseLike
  userId: string
  deckName: string
  sourceType: string
  sourceUrl?: string | null
  parsedCards: ImportedDeckCard[]
  sourceFormatHint?: string | null
  manualFormatOverride?: string | null
  actorUserId?: string | null
  guestDraftPresent?: boolean
  guestDraftToken?: string
}

export function toFriendlyImportError(message?: string) {
  if (!message) return 'Failed to create deck.'

  if (
    message.includes('revalidate') ||
    message.includes('REVALIDATE') ||
    message.includes('ReadonlyRequestCookiesError')
  ) {
    return 'The import finished, but the page refresh got out of sync. Refresh once and try again if the deck does not appear in your inventory.'
  }

  if (message.includes("Could not find the 'imported_at' column of 'decks'")) {
    return 'Your database is missing the new decks.imported_at column. Run the latest Supabase migration for deck format and price history, then try the import again.'
  }

  if (message.includes("Could not find the 'format' column of 'decks'")) {
    return 'Your database is missing the new decks.format column. Run the latest Supabase migration for deck format and price history, then try the import again.'
  }

  if (message.includes("Could not find the 'sideboard_count' column of 'decks'")) {
    return 'Your database is missing the new decks.sideboard_count column. Run the Standard sideboard migration, then try the import again.'
  }

  if (message.includes("Could not find the relation 'public.deck_price_history'")) {
    return 'Your database is missing the deck_price_history table. Run the latest Supabase migration for deck format and price history, then try again.'
  }

  if (isGuestImportSchemaMissing(message)) {
    return 'Guest draft persistence is not set up in Supabase yet. Run the guest import draft migration, then try again.'
  }

  if (message.includes('deck_tokens')) {
    return 'The main deck imported, but token rows could not be saved cleanly. Check your token section formatting and try again.'
  }

  if (message.includes('deck_cards')) {
    return 'The deck record was created, but card rows could not be saved. Double-check the list formatting and try again.'
  }

  if (message.includes('claim_guest_import_draft')) {
    return 'The deck imported, but the saved guest draft could not be linked cleanly to your account. Your imported deck should still be available.'
  }

  if (message.includes('Moxfield import failed with status 404')) {
    return 'That Moxfield deck could not be found. Check the URL and make sure the deck is still public.'
  }

  if (message.includes('Moxfield import failed with status 429')) {
    return 'Moxfield is rate-limiting requests right now. Wait a moment and try the import again.'
  }

  if (message.includes('Moxfield import failed with status 5')) {
    return 'Moxfield is having trouble responding right now. Try the import again in a moment.'
  }

  if (message.includes('Moxfield URL could not be understood')) {
    return 'That Moxfield link does not look valid yet. Paste the full public deck URL and try again.'
  }

  if (message.includes('deck shell but no readable cards')) {
    return 'The source deck loaded, but no readable cards came through. Make sure the list is public and fully populated, including commanders and tokens.'
  }

  return message
}

export async function importNormalizedDeckToCollection({
  supabase,
  userId,
  deckName,
  sourceType,
  sourceUrl,
  parsedCards,
  sourceFormatHint,
  manualFormatOverride,
  actorUserId,
  guestDraftPresent = false,
  guestDraftToken = '',
}: ImportNormalizedDeckArgs) {
  const normalizedCards = normalizeImportedCommanderOverlap(parsedCards)
  const detectedFormat = normalizeDeckFormat(
    manualFormatOverride || detectDeckFormat(normalizedCards, sourceFormatHint)
  )
  const validation = validateDeckForFormat(normalizedCards, detectedFormat)
  const commanderNames = normalizedCards
    .filter((card) => card.section === 'commander')
    .map((card) => card.cardName)

  const primaryCommanderName = commanderNames[0] ?? null

  const { data: deckRow, error: deckError } = await supabase
    .from('decks')
    .insert([
      {
        user_id: userId,
        name: deckName,
        commander: primaryCommanderName,
        format: detectedFormat,
        imported_at: new Date().toISOString(),
        commander_count: validation.commanderCount,
        mainboard_count: validation.mainboardCount,
        sideboard_count: validation.sideboardCount ?? 0,
        token_count: validation.tokenCount,
        commander_mode: validation.commanderMode,
        commander_names: commanderNames,
        is_valid: validation.isValid,
        validation_errors: validation.errors,
        source_type: sourceType || 'text',
        source_url: sourceUrl || null,
        color_identity: [],
        is_listed_for_trade: false,
        trade_listing_notes: null,
        trade_wanted_profile: null,
        wanted_color_identities: [],
        wanted_formats: [],
        is_sleeved: false,
        is_boxed: false,
        is_sealed: false,
        is_complete_precon: false,
        box_type: null,
      },
    ])
    .select('id')
    .single()

  if (deckError || !deckRow) {
    throw new Error(toFriendlyImportError(deckError?.message ?? undefined))
  }

  const deckId = deckRow.id

  await logDeckImportEvent(supabase as any, {
    deckId,
    actorUserId: actorUserId ?? userId,
    sourceType,
    eventType: 'import_created',
    severity: 'info',
    message: `Deck import created from ${sourceType || 'text'} source.`,
    details: {
      detectedFormat,
      commanderCount: validation.commanderCount,
      mainboardCount: validation.mainboardCount,
      tokenCount: validation.tokenCount,
      isValid: validation.isValid,
    },
  })

  const deckCards = normalizedCards
    .filter(
      (card) =>
        card.section === 'commander' ||
        card.section === 'mainboard' ||
        card.section === 'sideboard'
    )
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

  if (deckCards.length > 0) {
    const { error: cardError } = await supabase.from('deck_cards').insert(deckCards)

    if (cardError) {
      await logDeckImportEvent(supabase as any, {
        deckId,
        actorUserId: actorUserId ?? userId,
        sourceType,
        eventType: 'deck_cards_insert_failed',
        severity: 'error',
        message: cardError.message ?? 'Failed to insert imported deck cards.',
        details: {
          stage: 'deck_cards_insert',
          attemptedRows: deckCards.length,
        },
      })

      throw new Error(toFriendlyImportError(cardError?.message ?? undefined))
    }
  }

  if (deckTokens.length > 0) {
    const { error: tokenError } = await supabase.from('deck_tokens').insert(deckTokens)

    if (tokenError) {
      await logDeckImportEvent(supabase as any, {
        deckId,
        actorUserId: actorUserId ?? userId,
        sourceType,
        eventType: 'deck_tokens_insert_failed',
        severity: 'error',
        message: tokenError.message ?? 'Failed to insert imported deck tokens.',
        details: {
          stage: 'deck_tokens_insert',
          attemptedRows: deckTokens.length,
        },
      })

      throw new Error(toFriendlyImportError(tokenError?.message ?? undefined))
    }
  }

  await logDeckImportEvent(supabase as any, {
    deckId,
    actorUserId: actorUserId ?? userId,
    sourceType,
    eventType: 'parsed_cards_saved',
    severity: 'info',
    message: 'Parsed cards and tokens were saved to the deck.',
    details: {
      deckCards: deckCards.length,
      deckTokens: deckTokens.length,
    },
  })

  let enrichFailed = false

  try {
    await enrichDeckWithScryfall(deckId, 'import')
    await logDeckImportEvent(supabase as any, {
      deckId,
      actorUserId: actorUserId ?? userId,
      sourceType,
      eventType: 'import_enrichment_succeeded',
      severity: 'info',
      message: 'Initial Scryfall enrichment completed successfully.',
    })
  } catch (error) {
    enrichFailed = true
    await logDeckImportEvent(supabase as any, {
      deckId,
      actorUserId: actorUserId ?? userId,
      sourceType,
      eventType: 'import_enrichment_failed',
      severity: 'warning',
      message: error instanceof Error ? error.message : 'Initial Scryfall enrichment failed.',
      details: {
        stage: 'initial_enrichment',
      },
    })
  }

  if (guestDraftToken) {
    const claimResult = await supabase.rpc('claim_guest_import_draft', {
      p_resume_token: guestDraftToken,
      p_user_id: userId,
    })

    if (claimResult.error && !isGuestImportSchemaMissing(claimResult.error.message)) {
      await logDeckImportEvent(supabase as any, {
        deckId,
        actorUserId: actorUserId ?? userId,
        sourceType,
        eventType: 'guest_draft_claim_failed',
        severity: 'warning',
        message: claimResult.error.message ?? 'Failed to claim guest draft after import.',
      })
    } else if (!claimResult.error) {
      await logDeckImportEvent(supabase as any, {
        deckId,
        actorUserId: actorUserId ?? userId,
        sourceType,
        eventType: 'guest_draft_claimed',
        severity: 'info',
        message: 'Guest preview draft was claimed into the authenticated deck import.',
      })
    }
  }

  return {
    deckId,
    detectedFormat,
    validation,
    enrichFailed,
    guestDraftPresent,
  }
}
