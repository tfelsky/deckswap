// QShip — Scryfall lookups by printing id, plus the daily price snapshot
// that turns Scryfall's single current price into history (7/30/90-day
// momentum). Scryfall asks for 50–100 ms between requests; we space chunks.

import type { ScryfallCard } from '@/lib/scryfall/enrich'
import type { createAdminClient } from '@/lib/supabase/admin'
import type { PriceHistory } from '../types'

type SupabaseAdmin = ReturnType<typeof createAdminClient>

/** The extra Scryfall fields QShip reads beyond the shared ScryfallCard. */
export type ScryfallPrinting = ScryfallCard & {
  flavor_text?: string
  artist_ids?: string[]
  frame_effects?: string[]
  full_art?: boolean
  border_color?: string
  reserved?: boolean
}

const COLLECTION_CHUNK = 75
const REQUEST_SPACING_MS = 100
const HISTORY_WINDOW_DAYS = 95
const DAY_MS = 24 * 60 * 60 * 1000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchScryfallPrintings(scryfallIds: string[]): Promise<ScryfallPrinting[]> {
  const ids = Array.from(new Set(scryfallIds.filter(Boolean)))
  const out: ScryfallPrinting[] = []

  for (let index = 0; index < ids.length; index += COLLECTION_CHUNK) {
    if (index > 0) await sleep(REQUEST_SPACING_MS)
    const chunk = ids.slice(index, index + COLLECTION_CHUNK)
    const res = await fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ identifiers: chunk.map((id) => ({ id })) }),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Scryfall collection lookup failed: ${res.status}`)
    const json = await res.json()
    if (Array.isArray(json.data)) out.push(...(json.data as ScryfallPrinting[]))
  }

  return out
}

function toNumber(value?: string | null) {
  if (value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function priceForFinish(
  prices: ScryfallCard['prices'] | null | undefined,
  finish: 'nonfoil' | 'foil' | 'etched'
) {
  const usd = toNumber(prices?.usd)
  const foil = toNumber(prices?.usd_foil)
  const etched = toNumber(prices?.usd_etched)
  if (finish === 'etched') return etched ?? foil ?? usd
  if (finish === 'foil') return foil ?? usd
  return usd ?? foil
}

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

/** Write today's price for each printing. Returns how many rows were upserted. */
export async function snapshotPrices(
  admin: SupabaseAdmin,
  scryfallIds: string[],
  capturedOn: Date = new Date()
) {
  const printings = await fetchScryfallPrintings(scryfallIds)
  const day = isoDate(capturedOn)
  const rows = printings.map((card) => ({
    scryfall_id: card.id,
    captured_on: day,
    usd: toNumber(card.prices?.usd),
    usd_foil: toNumber(card.prices?.usd_foil),
    usd_etched: toNumber(card.prices?.usd_etched),
    eur: toNumber(card.prices?.eur),
    source: 'scryfall',
  }))

  for (let index = 0; index < rows.length; index += 500) {
    const { error } = await admin
      .from('card_price_snapshots')
      .upsert(rows.slice(index, index + 500), { onConflict: 'scryfall_id,captured_on' })
    if (error) throw new Error(error.message)
  }

  return { requested: new Set(scryfallIds).size, stored: rows.length }
}

type SnapshotRow = {
  scryfall_id: string
  captured_on: string
  usd: number | null
  usd_foil: number | null
  usd_etched: number | null
}

function nearestOnOrBefore(rows: SnapshotRow[], targetMs: number) {
  let best: SnapshotRow | null = null
  for (const row of rows) {
    const ms = Date.parse(row.captured_on)
    if (!Number.isFinite(ms) || ms > targetMs) continue
    if (!best || ms > Date.parse(best.captured_on)) best = row
  }
  return best
}

function pick(row: SnapshotRow | null, finish: 'nonfoil' | 'foil' | 'etched') {
  if (!row) return null
  const usd = row.usd == null ? null : Number(row.usd)
  const foil = row.usd_foil == null ? null : Number(row.usd_foil)
  const etched = row.usd_etched == null ? null : Number(row.usd_etched)
  if (finish === 'etched') return etched ?? foil ?? usd
  if (finish === 'foil') return foil ?? usd
  return usd ?? foil
}

/**
 * Price 7, 30, and 90 days ago per printing and finish, from our snapshots.
 * Missing history (new printings, a fresh install) comes back as nulls, which
 * the scoring model treats as "no momentum signal".
 */
export async function loadPriceHistory(
  admin: SupabaseAdmin,
  requests: Array<{ scryfallId: string; finish: 'nonfoil' | 'foil' | 'etched' }>,
  now: Date = new Date()
): Promise<Map<string, PriceHistory>> {
  const history = new Map<string, PriceHistory>()
  const ids = Array.from(new Set(requests.map((request) => request.scryfallId).filter(Boolean)))
  if (ids.length === 0) return history

  const since = isoDate(new Date(now.getTime() - HISTORY_WINDOW_DAYS * DAY_MS))
  const rows: SnapshotRow[] = []
  for (let index = 0; index < ids.length; index += 200) {
    const { data, error } = await admin
      .from('card_price_snapshots')
      .select('scryfall_id, captured_on, usd, usd_foil, usd_etched')
      .in('scryfall_id', ids.slice(index, index + 200))
      .gte('captured_on', since)
    if (error) return history
    rows.push(...((data ?? []) as SnapshotRow[]))
  }

  const byId = new Map<string, SnapshotRow[]>()
  for (const row of rows) {
    const list = byId.get(row.scryfall_id) ?? []
    list.push(row)
    byId.set(row.scryfall_id, list)
  }

  const nowMs = now.getTime()
  for (const request of requests) {
    const list = byId.get(request.scryfallId) ?? []
    history.set(`${request.scryfallId}:${request.finish}`, {
      d7: pick(nearestOnOrBefore(list, nowMs - 7 * DAY_MS), request.finish),
      d30: pick(nearestOnOrBefore(list, nowMs - 30 * DAY_MS), request.finish),
      d90: pick(nearestOnOrBefore(list, nowMs - 90 * DAY_MS), request.finish),
    })
  }
  return history
}
