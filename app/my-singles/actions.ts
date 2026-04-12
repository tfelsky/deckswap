'use server'

import { fetchScryfallCollection, scryfallToDeckCardUpdate } from '@/lib/scryfall/enrich'
import { isSingleImportSchemaMissing } from '@/lib/singles/import-events'
import { createClient } from '@/lib/supabase/server'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { redirect } from 'next/navigation'

type EnrichmentCandidate = {
  id: number
  provider: string
  source_scope: string
  card_name: string
  set_code?: string | null
  collector_number?: string | null
  import_warning?: string | null
}

type PublishCandidate = {
  id: number
  quantity?: number | null
  foil?: boolean | null
  price_usd?: number | null
  price_usd_foil?: number | null
  buy_now_price_usd?: number | null
  buy_now_currency?: string | null
}

const SINGLES_RETURN_PATH = '/my-singles'
const ACTION_QUERY_KEYS = [
  'backfillUpdated',
  'backfillUnmatched',
  'backfillFailed',
  'publishCount',
  'publishSkipped',
  'actionError',
] as const

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

function makeIdentityKey(args: {
  cardName?: string | null
  setCode?: string | null
  collectorNumber?: string | null
}) {
  return [
    String(args.cardName ?? '').trim().toLowerCase(),
    String(args.setCode ?? '').trim().toLowerCase(),
    String(args.collectorNumber ?? '').trim().toLowerCase(),
  ].join('::')
}

function buildRedirectUrl(returnTo: string, params: Record<string, string | number>) {
  const normalizedReturnTo = returnTo.startsWith(SINGLES_RETURN_PATH)
    ? returnTo
    : SINGLES_RETURN_PATH
  const [pathname, rawSearch = ''] = normalizedReturnTo.split('?')
  const search = new URLSearchParams(rawSearch)

  for (const key of ACTION_QUERY_KEYS) {
    search.delete(key)
  }

  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value))
  }

  const nextSearch = search.toString()
  return nextSearch ? `${pathname}?${nextSearch}` : pathname
}

function isSinglesMarketplaceSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("Could not find the 'marketplace_visible' column of 'single_inventory_items'") ||
    message.includes("Could not find the 'marketplace_status' column of 'single_inventory_items'") ||
    message.includes("Could not find the 'marketplace_quantity_available' column of 'single_inventory_items'") ||
    message.includes("Could not find the 'marketplace_price_usd' column of 'single_inventory_items'")
  )
}

async function requireSignedInUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  return { supabase, user }
}

async function fetchScryfallBatchWithRetry(
  identifiers: Array<{ name?: string; set?: string; collector_number?: string }>,
  maxAttempts = 3
) {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetchScryfallCollection(identifiers)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Scryfall backfill failed.')
      if (attempt < maxAttempts) {
        await wait(250 * attempt)
      }
    }
  }

  throw lastError ?? new Error('Scryfall backfill failed.')
}

async function fetchAllEnrichmentCandidates(supabase: any, userId: string) {
  const rows: EnrichmentCandidate[] = []

  for (let start = 0; ; start += 1000) {
    const end = start + 999
    const { data, error } = await supabase
      .from('single_inventory_items')
      .select('id, provider, source_scope, card_name, set_code, collector_number, import_warning, scryfall_id')
      .eq('user_id', userId)
      .or('scryfall_id.is.null,import_warning.not.is.null')
      .order('id', { ascending: true })
      .range(start, end)

    if (error) {
      throw new Error(error.message)
    }

    const batch = (data ?? []) as Array<EnrichmentCandidate & { scryfall_id?: string | null }>
    if (batch.length === 0) break
    rows.push(...batch)
    if (batch.length < 1000) break
  }

  return rows
}

async function fetchAllPublishCandidates(supabase: any, userId: string) {
  const rows: PublishCandidate[] = []

  for (let start = 0; ; start += 1000) {
    const end = start + 999
    const { data, error } = await supabase
      .from('single_inventory_items')
      .select('id, quantity, foil, price_usd, price_usd_foil, buy_now_price_usd, buy_now_currency')
      .eq('user_id', userId)
      .eq('inventory_status', 'staged')
      .order('id', { ascending: true })
      .range(start, end)

    if (error) {
      throw new Error(error.message)
    }

    const batch = (data ?? []) as PublishCandidate[]
    if (batch.length === 0) break
    rows.push(...batch)
    if (batch.length < 1000) break
  }

  return rows
}

function normalizeUsdAmount(value: number) {
  return Number(value.toFixed(2))
}

export async function backfillSinglesEnrichmentAction(formData: FormData) {
  const { supabase, user } = await requireSignedInUser()
  const returnTo = String(formData.get('return_to') || '/my-singles').trim() || '/my-singles'

  try {
    const rows = await fetchAllEnrichmentCandidates(supabase, user.id)

    if (rows.length === 0) {
      redirect(
        buildRedirectUrl(returnTo, {
          backfillUpdated: 0,
          backfillUnmatched: 0,
          backfillFailed: 0,
        })
      )
    }

    let updatedCount = 0
    let unmatchedCount = 0
    let failedCount = 0

    for (const batch of chunkArray(rows, 75)) {
      try {
        const enrichedCards = await fetchScryfallBatchWithRetry(
          batch.map((row) =>
            row.set_code && row.collector_number
              ? { set: row.set_code, collector_number: row.collector_number }
              : { name: row.card_name }
          )
        )

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

        const updates = batch.map((row) => {
          const enriched =
            cardsByIdentity.get(
              makeIdentityKey({
                cardName: row.card_name,
                setCode: row.set_code,
                collectorNumber: row.collector_number,
              })
            ) ??
            Array.from(cardsByIdentity.values()).find(
              (candidate) =>
                candidate.card_name.trim().toLowerCase() === row.card_name.trim().toLowerCase()
            ) ??
            null

          if (!enriched) {
            unmatchedCount += 1
            return {
              id: row.id,
              payload: {
                import_warning: 'Imported without a Scryfall enrichment match. Pricing and metadata may be incomplete.',
                updated_at: new Date().toISOString(),
              },
            }
          }

          updatedCount += 1
          return {
            id: row.id,
            payload: {
              card_name: enriched.card_name,
              set_code: enriched.set_code ?? row.set_code ?? null,
              set_name: enriched.set_name ?? null,
              collector_number: enriched.collector_number ?? row.collector_number ?? null,
              scryfall_id: enriched.scryfall_id ?? null,
              oracle_id: enriched.oracle_id ?? null,
              artist_name: enriched.artist_name ?? null,
              released_at: enriched.released_at ?? null,
              finishes: enriched.finishes ?? [],
              oracle_text: enriched.oracle_text ?? null,
              type_line: enriched.type_line ?? null,
              rarity: enriched.rarity ?? null,
              mana_cost: enriched.mana_cost ?? null,
              cmc: enriched.cmc ?? null,
              power: enriched.power ?? null,
              toughness: enriched.toughness ?? null,
              color_identity: enriched.color_identity ?? [],
              keywords: enriched.keywords ?? [],
              image_url: enriched.image_url ?? null,
              price_usd: enriched.price_usd ?? null,
              price_usd_foil: enriched.price_usd_foil ?? null,
              price_usd_etched: enriched.price_usd_etched ?? null,
              price_eur: enriched.price_eur ?? null,
              price_eur_foil: enriched.price_eur_foil ?? null,
              price_tix: enriched.price_tix ?? null,
              import_warning: null,
              last_enriched_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          }
        })

        for (const updateBatch of chunkArray(updates, 25)) {
          const results = await Promise.allSettled(
            updateBatch.map((entry) =>
              supabase
                .from('single_inventory_items')
                .update(entry.payload)
                .eq('id', entry.id)
                .eq('user_id', user.id)
            )
          )

          for (const result of results) {
            if (result.status === 'fulfilled') {
              const error = result.value.error
              if (error) {
                throw new Error(error.message)
              }
            } else {
              throw result.reason
            }
          }
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Scryfall backfill could not complete for one of the enrichment batches.'

        failedCount += batch.length

        for (const updateBatch of chunkArray(batch, 25)) {
          const results = await Promise.allSettled(
            updateBatch.map((row) =>
              supabase
                .from('single_inventory_items')
                .update({
                  import_warning: `${message} Pricing and metadata may still be incomplete.`,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', row.id)
                .eq('user_id', user.id)
            )
          )

          for (const result of results) {
            if (result.status === 'fulfilled' && result.value.error) {
              throw new Error(result.value.error.message)
            }
          }
        }
      }
    }

    redirect(
      buildRedirectUrl(returnTo, {
        backfillUpdated: updatedCount,
        backfillUnmatched: unmatchedCount,
        backfillFailed: failedCount,
      })
    )
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }

    const message = error instanceof Error ? error.message : 'Singles enrichment retry failed.'
    const friendlyMessage = isSingleImportSchemaMissing(message)
      ? 'Singles inventory tables are not set up in Supabase yet.'
      : message.slice(0, 180)

    redirect(buildRedirectUrl(returnTo, { actionError: friendlyMessage }))
  }
}

export async function publishAllStagedSinglesAction(formData: FormData) {
  const { supabase, user } = await requireSignedInUser()
  const returnTo = String(formData.get('return_to') || '/my-singles').trim() || '/my-singles'

  try {
    const rows = await fetchAllPublishCandidates(supabase, user.id)
    let publishCount = 0
    let publishSkipped = 0

    for (const batch of chunkArray(rows, 25)) {
      for (const row of batch) {
        const quantity = Math.max(0, Math.floor(Number(row.quantity ?? 0)))
        const rawDerivedPrice = row.buy_now_price_usd
          ? Number(row.buy_now_price_usd)
          : row.foil
            ? Number(row.price_usd_foil ?? row.price_usd ?? 0)
            : Number(row.price_usd ?? row.price_usd_foil ?? 0)
        const derivedPrice = Number.isFinite(rawDerivedPrice)
          ? normalizeUsdAmount(rawDerivedPrice)
          : 0

        if (quantity <= 0 || derivedPrice <= 0) {
          publishSkipped += 1
          continue
        }

        const result = await supabase
          .from('single_inventory_items')
          .update({
            inventory_status: 'buy_it_now_live',
            buy_now_price_usd: normalizeUsdAmount(Number(row.buy_now_price_usd ?? derivedPrice)),
            buy_now_currency: row.buy_now_currency ?? 'USD',
            marketplace_visible: true,
            marketplace_status: 'active',
            marketplace_quantity_available: quantity,
            marketplace_price_usd: derivedPrice,
            marketplace_currency: row.buy_now_currency ?? 'USD',
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id)
          .eq('user_id', user.id)
          .eq('inventory_status', 'staged')
          .select('id')
          .maybeSingle()

        if (result.error) {
          throw new Error(result.error.message)
        }

        if (result.data) {
          publishCount += 1
        } else {
          publishSkipped += 1
        }
      }
    }

    redirect(
      buildRedirectUrl(returnTo, {
        publishCount,
        publishSkipped,
      })
    )
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }

    const message = error instanceof Error ? error.message : 'Publishing staged singles failed.'
    const friendlyMessage = isSinglesMarketplaceSchemaMissing(message)
      ? 'Run docs/sql/singles-marketplace-orders.sql before publishing singles to the marketplace.'
      : isSingleImportSchemaMissing(message)
        ? 'Singles inventory tables are not set up in Supabase yet.'
        : message.slice(0, 180)

    redirect(buildRedirectUrl(returnTo, { actionError: friendlyMessage }))
  }
}
