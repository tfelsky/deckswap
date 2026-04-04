'use server'

import { parseDeckText } from '@/lib/commander/parse'
import { extractMoxfieldPublicId, fetchMoxfieldDeck } from '@/lib/deck-sources/moxfield'
import { importNormalizedDeckToCollection, toFriendlyImportError } from '@/lib/deck-imports'
import {
  GUEST_IMPORT_DRAFT_QUERY_KEY,
  GUEST_IMPORT_SAVED_QUERY_KEY,
  isGuestImportSchemaMissing,
} from '@/lib/guest-import'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type ImportDeckActionState = {
  error?: string
  fields?: {
    deckName: string
    sourceType: string
    sourceUrl: string
    rawList: string
  }
}

function buildActionFields(
  deckName: string,
  sourceType: string,
  sourceUrl: string,
  rawList: string
) {
  return {
    deckName,
    sourceType,
    sourceUrl,
    rawList,
  }
}

function getNoCardsParsedError(args: {
  sourceType: string
  usedFileInput: boolean
  hasRawList: boolean
  hasSourceUrl: boolean
}) {
  const normalizedSourceType = args.sourceType.toLowerCase()

  if (normalizedSourceType === 'moxfield') {
    return 'That Moxfield link did not return any readable cards. Make sure the deck is public and not an empty shell.'
  }

  if (normalizedSourceType === 'archidekt') {
    return args.usedFileInput
      ? 'We could not read any cards from that Archidekt file. Export a plain text, CSV, or TSV list with quantity and card-name columns, then try again.'
      : 'We could not read any cards from that Archidekt paste. Try an Archidekt export with quantity and card-name columns, or paste a plain text list with lines like "1 Sol Ring".'
  }

  if (args.usedFileInput) {
    return 'The uploaded file did not contain any recognizable deck lines. Try a plain .txt export or a CSV/TSV with quantity and card-name columns.'
  }

  if (args.hasRawList) {
    return 'No cards could be parsed from that text. Try lines like "1 Sol Ring" or add Commander/Mainboard/Tokens headers before retrying.'
  }

  if (args.hasSourceUrl) {
    return 'That source URL did not produce a readable deck list.'
  }

  return 'Paste a deck list, upload a .txt file, or provide a supported deck URL.'
}

export async function importDeckAction(
  _prevState: ImportDeckActionState,
  formData: FormData
): Promise<ImportDeckActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to import a deck.' }
  }

  const deckName = String(formData.get('deck_name') || '').trim()
  const sourceType = String(formData.get('source_type') || 'text').trim()
  const sourceUrl = String(formData.get('source_url') || '').trim()
  const rawList = String(formData.get('raw_list') || '').trim()
  const guestDraftPresent = String(formData.get('guest_draft_present') || '').trim() === '1'
  const guestDraftToken = String(formData.get('guest_draft_token') || '').trim()
  const deckFile = formData.get('deck_file')
  const hasUploadedFile = deckFile instanceof File && deckFile.size > 0
  const fields = buildActionFields(deckName, sourceType, sourceUrl, rawList)

  let resolvedDeckName = deckName
  let resolvedRawList = rawList
  let sourceFormatHint: string | null = null
  let parsedCards =
    sourceType.toLowerCase() === 'moxfield' ? [] : parseDeckText(resolvedRawList, sourceType)

  if (
    deckFile instanceof File &&
    deckFile.size > 0 &&
    !resolvedRawList
  ) {
    resolvedRawList = (await deckFile.text()).trim()

    if (!resolvedDeckName) {
      resolvedDeckName = deckFile.name.replace(/\.[^.]+$/, '').trim()
    }

    parsedCards = parseDeckText(resolvedRawList, sourceType)
  }

  if (sourceType.toLowerCase() === 'moxfield') {
    if (!sourceUrl) {
      return {
        error: 'Add a Moxfield deck URL to import from a link.',
        fields: buildActionFields(resolvedDeckName, sourceType, sourceUrl, resolvedRawList),
      }
    }

    try {
      const deck = await fetchMoxfieldDeck(sourceUrl)
      parsedCards = deck.cards
      sourceFormatHint = deck.format

      if (!resolvedDeckName) {
        resolvedDeckName = deck.deckName ?? ''
      }

      if (!resolvedDeckName) {
        const publicId = extractMoxfieldPublicId(sourceUrl)
        resolvedDeckName = publicId
          ? `Moxfield Import ${publicId}`
          : 'Imported Moxfield Deck'
      }
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to import that Moxfield deck.',
        fields: buildActionFields(resolvedDeckName, sourceType, sourceUrl, resolvedRawList),
      }
    }
  }

  if (!resolvedDeckName) {
    return {
      error: 'Deck name is required unless the source provides one.',
      fields: buildActionFields(resolvedDeckName, sourceType, sourceUrl, resolvedRawList),
    }
  }

    if (parsedCards.length === 0) {
      return {
        error: getNoCardsParsedError({
          sourceType,
          usedFileInput: hasUploadedFile,
          hasRawList: !!resolvedRawList,
          hasSourceUrl: !!sourceUrl,
        }),
        fields: buildActionFields(resolvedDeckName, sourceType, sourceUrl, resolvedRawList),
      }
    }

  let importResult

  try {
    importResult = await importNormalizedDeckToCollection({
      supabase,
      userId: user.id,
      actorUserId: user.id,
      deckName: resolvedDeckName,
      sourceType,
      sourceUrl,
      parsedCards,
      sourceFormatHint,
      guestDraftPresent,
      guestDraftToken,
    })
  } catch (error) {
    return {
      error: toFriendlyImportError(error instanceof Error ? error.message : undefined),
      fields: buildActionFields(resolvedDeckName, sourceType, sourceUrl, resolvedRawList),
    }
  }

  const params = new URLSearchParams()
  if (!importResult.validation.isValid) {
    params.set('imported', '1')
  }
  if (guestDraftPresent) {
    params.set(GUEST_IMPORT_SAVED_QUERY_KEY, '1')
  }
  if (guestDraftToken) {
    params.set(GUEST_IMPORT_DRAFT_QUERY_KEY, guestDraftToken)
  }
  if (importResult.enrichFailed) {
    params.set('enrich', 'failed')
  }

  redirect(`/decks/${importResult.deckId}${params.size > 0 ? `?${params.toString()}` : ''}`)
}
