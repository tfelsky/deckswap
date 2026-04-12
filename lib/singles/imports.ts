import { fetchScryfallCollection, scryfallToDeckCardUpdate } from '@/lib/scryfall/enrich'
import { isSingleImportSchemaMissing, logSingleImportEvent } from '@/lib/singles/import-events'

type SupabaseLike = any

export type ImportedSingleCondition =
  | 'near_mint'
  | 'light_play'
  | 'moderate_play'
  | 'heavy_play'
  | 'damaged'

export type ImportedSingleRow = {
  sourceItemKey: string
  cardName: string
  quantity: number
  foil?: boolean
  condition?: ImportedSingleCondition
  language?: string
  setCode?: string
  setName?: string
  collectorNumber?: string
}

type ImportSinglesArgs = {
  supabase: SupabaseLike
  userId: string
  actorUserId?: string | null
  provider: string
  sourceScope?: 'singles' | 'full_collection'
  sourceAccount: string
  sourceKey: string
  sourceName: string
  sourceUrl: string
  items: ImportedSingleRow[]
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

function toFriendlySingleImportError(message?: string) {
  if (!message) return 'Failed to import singles.'

  if (isSingleImportSchemaMissing(message)) {
    return 'Singles inventory tables are not set up yet. Run the singles inventory SQL, then try the import again.'
  }

  if (message.includes('Scryfall collection lookup failed')) {
    return 'Card enrichment could not be completed from Scryfall right now. The singles import can still be retried in a moment.'
  }

  return message
}

function makeIdentityKey(item: Pick<ImportedSingleRow, 'cardName' | 'setCode' | 'collectorNumber'>) {
  return [
    item.cardName.trim().toLowerCase(),
    String(item.setCode ?? '').trim().toLowerCase(),
    String(item.collectorNumber ?? '').trim().toLowerCase(),
  ].join('::')
}

export async function importSinglesToCollection({
  supabase,
  userId,
  actorUserId,
  provider,
  sourceScope = 'singles',
  sourceAccount,
  sourceKey,
  sourceName,
  sourceUrl,
  items,
}: ImportSinglesArgs) {
  const normalized = new Map<string, ImportedSingleRow>()
  let skippedCount = 0

  for (const item of items) {
    const sourceItemKey = String(item.sourceItemKey ?? '').trim()
    const cardName = String(item.cardName ?? '').trim()
    const quantity = Math.max(0, Number(item.quantity ?? 0))

    if (!sourceItemKey || !cardName || quantity <= 0) {
      skippedCount += 1
      continue
    }

    const existing = normalized.get(sourceItemKey)

    if (existing) {
      existing.quantity += quantity
      skippedCount += 1
      continue
    }

    normalized.set(sourceItemKey, {
      ...item,
      sourceItemKey,
      cardName,
      quantity,
      foil: item.foil ?? false,
      condition: item.condition ?? 'near_mint',
      language: String(item.language ?? 'en').trim().toLowerCase() || 'en',
      setCode: String(item.setCode ?? '').trim().toLowerCase() || undefined,
      setName: String(item.setName ?? '').trim() || undefined,
      collectorNumber: String(item.collectorNumber ?? '').trim() || undefined,
    })
  }

  const preparedItems = Array.from(normalized.values())

  if (preparedItems.length === 0) {
    return {
      importedCount: 0,
      warningCount: 0,
      skippedCount,
      failedCount: 0,
      sourceName,
    }
  }

  await logSingleImportEvent(supabase as any, {
    actorUserId: actorUserId ?? userId,
    provider,
    sourceScope,
    eventType: 'single_import_started',
    message: `Singles import started for ${sourceName}.`,
    details: {
      sourceKey,
      requestedItems: items.length,
      normalizedItems: preparedItems.length,
    },
  })

  const identifierRows = preparedItems.map((item) =>
    item.setCode && item.collectorNumber
      ? {
          set: item.setCode,
          collector_number: item.collectorNumber,
        }
      : {
          name: item.cardName,
        }
  )

  const enrichmentBatches = chunkArray(identifierRows, 75)
  const enrichedCards: Awaited<ReturnType<typeof fetchScryfallCollection>> = []
  let enrichmentFailureCount = 0
  let enrichmentFailureMessage: string | null = null

  for (const [batchIndex, batch] of enrichmentBatches.entries()) {
    try {
      const batchCards = await fetchScryfallCollection(batch)
      enrichedCards.push(...batchCards)
    } catch (error) {
      enrichmentFailureCount += 1
      enrichmentFailureMessage =
        enrichmentFailureMessage ??
        toFriendlySingleImportError(error instanceof Error ? error.message : undefined)

      await logSingleImportEvent(supabase as any, {
        actorUserId: actorUserId ?? userId,
        provider,
        sourceScope,
        eventType: 'single_import_enrichment_batch_failed',
        severity: 'warning',
        message: enrichmentFailureMessage,
        details: {
          sourceKey,
          batchIndex,
          batchSize: batch.length,
          totalBatches: enrichmentBatches.length,
        },
      })
    }
  }

  if (enrichmentFailureCount > 0) {
    await logSingleImportEvent(supabase as any, {
      actorUserId: actorUserId ?? userId,
      provider,
      sourceScope,
      eventType: 'single_import_enrichment_partially_failed',
      severity: 'warning',
      message:
        enrichmentFailureCount === enrichmentBatches.length
          ? enrichmentFailureMessage ??
            'Card enrichment could not be completed from Scryfall right now.'
          : `${enrichmentFailureMessage ?? 'Some card enrichment batches failed.'} Imported rows were still saved.`,
      details: {
        sourceKey,
        attemptedIdentifiers: identifierRows.length,
        successfulBatches: enrichmentBatches.length - enrichmentFailureCount,
        failedBatches: enrichmentFailureCount,
        totalBatches: enrichmentBatches.length,
      },
    })
  }

  const cardsByIdentity = new Map<string, ReturnType<typeof scryfallToDeckCardUpdate>>()

  for (const card of enrichedCards) {
    const update = scryfallToDeckCardUpdate(card)
    cardsByIdentity.set(
      makeIdentityKey({
        cardName: update.card_name,
        setCode: update.set_code,
        collectorNumber: update.collector_number,
      }),
      update
    )
  }

  const now = new Date().toISOString()
  let warningCount = 0

  const rows = preparedItems.map((item) => {
    const enriched =
      cardsByIdentity.get(makeIdentityKey(item)) ??
      Array.from(cardsByIdentity.values()).find(
        (candidate) => candidate.card_name.trim().toLowerCase() === item.cardName.trim().toLowerCase()
      ) ??
      null

    const importWarning = enriched
      ? enrichmentFailureMessage
        ? `${enrichmentFailureMessage} Imported without complete live card metadata, so pricing and enrichment fields may be incomplete.`
        : null
      : enrichmentFailureMessage
      ? `${enrichmentFailureMessage} Imported without complete live card metadata, so pricing and enrichment fields may be incomplete.`
      : 'Imported without a Scryfall enrichment match. Pricing and metadata may be incomplete.'

    if (importWarning) {
      warningCount += 1
    }

    return {
      user_id: userId,
      provider,
      source_scope: sourceScope,
      source_account: sourceAccount,
      source_collection_key: sourceKey,
      source_collection_name: sourceName,
      source_collection_url: sourceUrl,
      source_item_key: item.sourceItemKey,
      inventory_status: 'staged',
      card_name: enriched?.card_name ?? item.cardName,
      quantity: item.quantity,
      condition: item.condition ?? 'near_mint',
      condition_source: 'import_default',
      language: item.language ?? 'en',
      foil: item.foil ?? false,
      set_code: enriched?.set_code ?? item.setCode,
      set_name: enriched?.set_name ?? item.setName,
      collector_number: enriched?.collector_number ?? item.collectorNumber,
      scryfall_id: enriched?.scryfall_id ?? null,
      oracle_id: enriched?.oracle_id ?? null,
      artist_name: enriched?.artist_name ?? null,
      released_at: enriched?.released_at ?? null,
      finishes: enriched?.finishes ?? [],
      oracle_text: enriched?.oracle_text ?? null,
      type_line: enriched?.type_line ?? null,
      rarity: enriched?.rarity ?? null,
      mana_cost: enriched?.mana_cost ?? null,
      cmc: enriched?.cmc ?? null,
      power: enriched?.power ?? null,
      toughness: enriched?.toughness ?? null,
      color_identity: enriched?.color_identity ?? [],
      keywords: enriched?.keywords ?? [],
      image_url: enriched?.image_url ?? null,
      price_usd: enriched?.price_usd ?? null,
      price_usd_foil: enriched?.price_usd_foil ?? null,
      price_usd_etched: enriched?.price_usd_etched ?? null,
      price_eur: enriched?.price_eur ?? null,
      price_eur_foil: enriched?.price_eur_foil ?? null,
      price_tix: enriched?.price_tix ?? null,
      buy_now_price_usd: null,
      buy_now_currency: 'USD',
      import_warning: importWarning,
      imported_at: now,
      last_enriched_at: enriched ? now : null,
      updated_at: now,
    }
  })

  const itemResult = await supabase.from('single_inventory_items').upsert(rows, {
    onConflict: 'user_id,provider,source_collection_key,source_item_key',
  })

  if (itemResult.error) {
    throw new Error(toFriendlySingleImportError(itemResult.error.message ?? undefined))
  }

  await logSingleImportEvent(supabase as any, {
    actorUserId: actorUserId ?? userId,
    provider,
    sourceScope,
    eventType: warningCount > 0 ? 'single_import_completed_with_warnings' : 'single_import_completed',
    severity: warningCount > 0 ? 'warning' : 'info',
    message:
      warningCount > 0
        ? `Singles import completed for ${sourceName} with ${warningCount} warnings.`
        : `Singles import completed for ${sourceName}.`,
    details: {
      sourceKey,
      importedCount: preparedItems.length,
      warningCount,
      skippedCount,
      enrichmentFailed: enrichmentFailureCount > 0,
      enrichmentFailedBatches: enrichmentFailureCount,
      enrichmentTotalBatches: enrichmentBatches.length,
    },
  })

  return {
    importedCount: preparedItems.length,
    warningCount,
    skippedCount,
    failedCount: 0,
    sourceName,
    enrichmentFailed: enrichmentFailureCount > 0,
  }
}
