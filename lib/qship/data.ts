// QShip — loads real members and sourceable copies from Supabase and runs the
// pure engine over them. Server-only (service role): inventory, EDHREC cache,
// signals, and price snapshots are RLS-locked to the service role.
//
// Every read degrades gracefully: missing tables (migration not applied yet),
// no service role, or an empty hub fall back to bundled sample data with a
// note, the same pattern Arb'r uses for eBay.

import type { CardCondition } from '@/lib/decks/conditions'
import { CARD_CONDITIONS } from '@/lib/decks/conditions'
import { createAdminClientOrNull, type createAdminClient } from '@/lib/supabase/admin'
import { computeBoxEconomics, type QshipBoxEconomics } from './economics'
import { buildBundles, findAlternates } from './optimizer'
import { DEFAULT_SHIPPING_LEVEL, QSHIP_PLANS, getQshipPlan } from './pricing'
import { fetchScryfallPrintings, loadPriceHistory, priceForFinish } from './providers/scryfall'
import { SAMPLE_QSHIP_INVENTORY, SAMPLE_QSHIP_MEMBER } from './sample-data'
import { scoreCandidates } from './scoring'
import type {
  MarketSignal,
  QshipBillingInterval,
  QshipBundle,
  QshipExcludedCandidate,
  QshipExclusionReason,
  QshipFinishPreference,
  QshipFocusDeck,
  QshipFulfillmentMode,
  QshipShippingLevel,
  QshipInventoryCandidate,
  QshipMemberProfile,
  QshipPlan,
  QshipPlanKey,
  QshipRiskProfile,
  QshipScoredCandidate,
} from './types'

type SupabaseAdmin = ReturnType<typeof createAdminClient>

/** Supply copies without a seller-set QShip price are costed at this share of market. */
const DEFAULT_SUPPLY_COST_RATIO = 0.82
const PAGE_SIZE = 1000
const MAX_ROWS = 20_000

type PostgrestLikeError = { code?: string; message?: string } | null

function isMissingTable(error: PostgrestLikeError) {
  if (!error) return false
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /does not exist|could not find the table/i.test(error.message ?? '')
  )
}

function normalize(value?: string | null) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function toCondition(value?: string | null): CardCondition {
  const normalized = normalize(value)
  return (CARD_CONDITIONS as readonly string[]).includes(normalized)
    ? (normalized as CardCondition)
    : 'near_mint'
}

function num(value: unknown): number | null {
  if (value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Page through a query past PostgREST's 1,000-row default. */
async function selectAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: PostgrestLikeError }>
): Promise<{ rows: T[]; error: PostgrestLikeError }> {
  const rows: T[] = []
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1)
    if (error) return { rows, error }
    const page = (data ?? []) as T[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return { rows, error: null }
}

// ---------- candidates ----------

type PoolRow = {
  id: number
  scryfall_id: string
  oracle_id: string
  card_name: string
  set_code: string | null
  set_name: string | null
  condition: string | null
  foil: boolean | null
  finish: string | null
  language: string | null
  acquisition_cost_usd: number | string
}

type SupplyRow = {
  id: number
  user_id: string
  card_name: string
  oracle_id: string | null
  scryfall_id: string | null
  set_code: string | null
  set_name: string | null
  released_at: string | null
  rarity: string | null
  foil: boolean | null
  finishes: string[] | null
  oracle_text: string | null
  type_line: string | null
  keywords: string[] | null
  cmc: number | string | null
  color_identity: string[] | null
  artist_name: string | null
  price_usd: number | string | null
  price_usd_foil: number | string | null
  condition: string | null
  language: string | null
  qship_supply_price_usd: number | string | null
}

async function loadPoolCandidates(admin: SupabaseAdmin, notes: string[]) {
  const { rows, error } = await selectAll<PoolRow>((from, to) =>
    admin
      .from('qship_inventory')
      .select('id, scryfall_id, oracle_id, card_name, set_code, set_name, condition, foil, finish, language, acquisition_cost_usd')
      .eq('status', 'available')
      .order('id')
      .range(from, to)
  )
  if (error) {
    notes.push(
      isMissingTable(error)
        ? 'QShip tables are missing. Apply migration 20260910130000_qship_foundation.sql.'
        : `Pool inventory failed to load: ${error.message}`
    )
    return []
  }
  if (rows.length === 0) return []

  let printings = new Map<string, Awaited<ReturnType<typeof fetchScryfallPrintings>>[number]>()
  try {
    printings = new Map((await fetchScryfallPrintings(rows.map((row) => row.scryfall_id))).map((card) => [card.id, card]))
  } catch (err) {
    notes.push(`Scryfall lookup failed, pool cards are unpriced: ${err instanceof Error ? err.message : 'unknown error'}`)
  }

  return rows.map<QshipInventoryCandidate>((row) => {
    const card = printings.get(row.scryfall_id)
    const finish = (row.finish === 'etched' || row.finish === 'foil' ? row.finish : row.foil ? 'foil' : 'nonfoil') as
      | 'nonfoil'
      | 'foil'
      | 'etched'
    return {
      inventoryId: `pool-${row.id}`,
      channel: 'pool',
      costBasisUsd: num(row.acquisition_cost_usd) ?? 0,
      condition: toCondition(row.condition),
      language: row.language ?? 'en',
      card: {
        scryfallId: row.scryfall_id,
        oracleId: row.oracle_id,
        cardName: card?.name ?? row.card_name,
        setCode: card?.set ?? row.set_code,
        setName: card?.set_name ?? row.set_name,
        releasedAt: card?.released_at ?? null,
        rarity: card?.rarity ?? null,
        foil: finish !== 'nonfoil',
        finishes: card?.finishes ?? null,
        oracleText: card?.oracle_text ?? null,
        typeLine: card?.type_line ?? null,
        keywords: card?.keywords ?? null,
        cmc: card?.cmc ?? null,
        colorIdentity: card?.color_identity ?? [],
        artistName: card?.artist ?? null,
        frameEffects: card?.frame_effects ?? null,
        fullArt: card?.full_art ?? null,
        borderColor: card?.border_color ?? null,
        reserved: card?.reserved ?? null,
        priceUsd: card ? priceForFinish(card.prices, finish) : null,
      },
    }
  })
}

async function loadSupplyCandidates(admin: SupabaseAdmin, memberUserId: string | null, notes: string[]) {
  const { rows, error } = await selectAll<SupplyRow>((from, to) =>
    admin
      .from('single_inventory_items')
      .select(
        'id, user_id, card_name, oracle_id, scryfall_id, set_code, set_name, released_at, rarity, foil, finishes, oracle_text, type_line, keywords, cmc, color_identity, artist_name, price_usd, price_usd_foil, condition, language, qship_supply_price_usd'
      )
      .eq('qship_supply_opt_in', true)
      .eq('marketplace_status', 'active')
      .gt('marketplace_quantity_available', 0)
      .order('id')
      .range(from, to)
  )
  if (error) {
    if (!isMissingTable(error) && !/qship_supply/.test(error.message ?? '')) {
      notes.push(`QShip Supply listings failed to load: ${error.message}`)
    }
    return []
  }

  return rows
    .filter((row) => row.oracle_id && row.scryfall_id && row.user_id !== memberUserId)
    .map<QshipInventoryCandidate>((row) => {
      const foil = Boolean(row.foil)
      const price = foil ? num(row.price_usd_foil) ?? num(row.price_usd) : num(row.price_usd)
      const supplyPrice = num(row.qship_supply_price_usd)
      return {
        inventoryId: `supply-${row.id}`,
        channel: 'supply',
        costBasisUsd: supplyPrice ?? Number(((price ?? 0) * DEFAULT_SUPPLY_COST_RATIO).toFixed(2)),
        condition: toCondition(row.condition),
        language: row.language ?? 'en',
        card: {
          scryfallId: row.scryfall_id as string,
          oracleId: row.oracle_id as string,
          cardName: row.card_name,
          setCode: row.set_code,
          setName: row.set_name,
          releasedAt: row.released_at,
          rarity: row.rarity,
          foil,
          finishes: row.finishes,
          oracleText: row.oracle_text,
          typeLine: row.type_line,
          keywords: row.keywords,
          cmc: num(row.cmc),
          colorIdentity: row.color_identity ?? [],
          artistName: row.artist_name,
          priceUsd: price,
        },
      }
    })
}

type EdhrecRow = {
  card_key: string
  commander_name: string | null
  normalized_commander_name: string | null
  inclusion_percent: number | null
  card_deck_count: number | null
  edhrec_rank: number | null
}

async function loadEdhrecRows(admin: SupabaseAdmin, oracleIds: string[]) {
  const rows: EdhrecRow[] = []
  const ids = Array.from(new Set(oracleIds.filter(Boolean)))
  for (let index = 0; index < ids.length; index += 200) {
    const { data, error } = await admin
      .from('edhrec_card_commander_recs')
      .select('card_key, commander_name, normalized_commander_name, inclusion_percent, card_deck_count, edhrec_rank')
      .eq('card_key_type', 'oracle_id')
      .eq('fetch_status', 'ok')
      .in('card_key', ids.slice(index, index + 200))
    if (error) break
    rows.push(...((data ?? []) as EdhrecRow[]))
  }
  return rows
}

type SignalRow = {
  scryfall_id: string | null
  oracle_id: string | null
  kind: MarketSignal['kind']
  strength: number | string
  detail: string
  source_url: string | null
  expires_at: string | null
}

async function loadSignals(admin: SupabaseAdmin, oracleIds: string[], now: Date) {
  const byOracle = new Map<string, MarketSignal[]>()
  const ids = Array.from(new Set(oracleIds.filter(Boolean)))
  for (let index = 0; index < ids.length; index += 200) {
    const { data, error } = await admin
      .from('market_signals')
      .select('scryfall_id, oracle_id, kind, strength, detail, source_url, expires_at')
      .in('oracle_id', ids.slice(index, index + 200))
    if (error) return byOracle
    for (const row of (data ?? []) as SignalRow[]) {
      if (!row.oracle_id) continue
      if (row.expires_at && Date.parse(row.expires_at) < now.getTime()) continue
      const list = byOracle.get(row.oracle_id) ?? []
      list.push({ kind: row.kind, strength: Number(row.strength) || 0, detail: row.detail, sourceUrl: row.source_url })
      byOracle.set(row.oracle_id, list)
    }
  }
  return byOracle
}

/** Attach price history, EDHREC demand, and market signals to each copy. */
async function enrichCandidates(
  admin: SupabaseAdmin,
  candidates: QshipInventoryCandidate[],
  edhrecRows: EdhrecRow[],
  now: Date
) {
  const history = await loadPriceHistory(
    admin,
    candidates.map((c) => ({ scryfallId: c.card.scryfallId, finish: c.card.foil ? 'foil' : 'nonfoil' })),
    now
  )
  const signals = await loadSignals(admin, candidates.map((c) => c.card.oracleId), now)

  const bestEdhrec = new Map<string, EdhrecRow>()
  for (const row of edhrecRows) {
    const current = bestEdhrec.get(row.card_key)
    if (!current || (row.inclusion_percent ?? 0) > (current.inclusion_percent ?? 0)) bestEdhrec.set(row.card_key, row)
  }

  for (const candidate of candidates) {
    const card = candidate.card
    card.priceHistory = history.get(`${card.scryfallId}:${card.foil ? 'foil' : 'nonfoil'}`) ?? null
    card.signals = signals.get(card.oracleId) ?? []
    const edhrec = bestEdhrec.get(card.oracleId)
    card.edhrec = edhrec
      ? {
          commanderName: edhrec.commander_name,
          inclusionPercent: edhrec.inclusion_percent,
          deckCount: edhrec.card_deck_count,
          rank: edhrec.edhrec_rank,
        }
      : null
  }
}

// ---------- member ----------

type DeckRow = { id: number; name: string | null; commander: string | null; color_identity: string[] | null; format: string | null }

function commanderKeys(commander?: string | null) {
  return normalize(commander)
    .split(/\s*(?:\/\/|\+|&)\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
}

async function loadMemberProfile(
  admin: SupabaseAdmin,
  userId: string,
  edhrecRows: EdhrecRow[],
  notes: string[]
): Promise<{ profile: QshipMemberProfile; label: string } | null> {
  const [{ data: subscription }, { data: preferences, error: preferencesError }, { data: userData }] = await Promise.all([
    admin.from('qship_subscriptions').select('plan_key, risk_profile').eq('user_id', userId).maybeSingle(),
    admin
      .from('qship_preferences')
      .select('focus_deck_ids, finish_pref, frame_prefs, favorite_artists, blocked_oracle_ids, blocked_set_codes, blocked_artists, min_condition, language')
      .eq('user_id', userId)
      .maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ])
  if (preferencesError && !isMissingTable(preferencesError)) {
    notes.push(`Preferences failed to load: ${preferencesError.message}`)
  }

  const { data: deckData, error: deckError } = await admin
    .from('decks')
    .select('id, name, commander, color_identity, format')
    .eq('user_id', userId)
  if (deckError) {
    notes.push(`Decks failed to load: ${deckError.message}`)
    return null
  }
  const decks = (deckData ?? []) as DeckRow[]
  const focusIds = new Set(((preferences?.focus_deck_ids as number[] | null) ?? []).map(Number))
  const focus = decks.filter((deck) =>
    focusIds.size > 0 ? focusIds.has(Number(deck.id)) : Boolean(deck.commander) || normalize(deck.format) === 'commander'
  )

  const deckIds = decks.map((deck) => Number(deck.id))
  const { rows: deckCards } = deckIds.length
    ? await selectAll<{ deck_id: number; oracle_id: string | null }>((from, to) =>
        admin.from('deck_cards').select('deck_id, oracle_id').in('deck_id', deckIds).order('id').range(from, to)
      )
    : { rows: [] as Array<{ deck_id: number; oracle_id: string | null }> }
  const { rows: collection } = await selectAll<{ oracle_id: string | null }>((from, to) =>
    admin.from('single_inventory_items').select('oracle_id').eq('user_id', userId).order('id').range(from, to)
  )
  const { rows: vault } = await selectAll<{ oracle_id: string | null }>((from, to) =>
    admin.from('qship_inventory').select('oracle_id').eq('owner_user_id', userId).order('id').range(from, to)
  )

  const cardsByDeck = new Map<number, string[]>()
  for (const row of deckCards) {
    if (!row.oracle_id) continue
    const list = cardsByDeck.get(Number(row.deck_id)) ?? []
    list.push(row.oracle_id)
    cardsByDeck.set(Number(row.deck_id), list)
  }

  const focusDecks: QshipFocusDeck[] = focus.map((deck) => {
    const keys = new Set(commanderKeys(deck.commander))
    const gapInclusion: Record<string, number> = {}
    for (const row of edhrecRows) {
      if (!keys.has(normalize(row.normalized_commander_name ?? row.commander_name))) continue
      if (row.inclusion_percent == null) continue
      gapInclusion[row.card_key] = Math.max(gapInclusion[row.card_key] ?? 0, row.inclusion_percent)
    }
    return {
      deckId: Number(deck.id),
      name: deck.name ?? `Deck ${deck.id}`,
      commanderName: deck.commander,
      colorIdentity: deck.color_identity ?? [],
      cardOracleIds: cardsByDeck.get(Number(deck.id)) ?? [],
      gapInclusion,
    }
  })

  const owned = new Set<string>()
  for (const row of [...deckCards, ...collection, ...vault]) if (row.oracle_id) owned.add(row.oracle_id)

  const planKey = (getQshipPlan(subscription?.plan_key as string | undefined)?.key ?? 'standard') as QshipPlanKey
  const riskProfile = (['player', 'balanced', 'speculator'].includes(String(subscription?.risk_profile))
    ? subscription?.risk_profile
    : 'balanced') as QshipRiskProfile

  return {
    label: userData?.user?.email ?? userId,
    profile: {
      userId,
      planKey,
      riskProfile,
      focusDecks,
      ownedOracleIds: Array.from(owned),
      preferences: {
        finishPref: ((preferences?.finish_pref as QshipFinishPreference | undefined) ?? 'any'),
        framePrefs: (preferences?.frame_prefs as string[] | undefined) ?? [],
        favoriteArtists: (preferences?.favorite_artists as string[] | undefined) ?? [],
        blockedOracleIds: (preferences?.blocked_oracle_ids as string[] | undefined) ?? [],
        blockedSetCodes: (preferences?.blocked_set_codes as string[] | undefined) ?? [],
        blockedArtists: (preferences?.blocked_artists as string[] | undefined) ?? [],
        minCondition: toCondition((preferences?.min_condition as string | undefined) ?? 'light_play'),
        language: (preferences?.language as string | undefined) ?? 'en',
      },
    },
  }
}

// ---------- dry run ----------

export type QshipDryRunInput = {
  userId: string | null
  useSampleMember?: boolean
  planKey?: QshipPlanKey
  riskProfile?: QshipRiskProfile
  interval?: QshipBillingInterval
  mode?: QshipFulfillmentMode
  shippingLevel?: QshipShippingLevel
  now?: Date
}

export type QshipDryRunBundle = {
  bundle: QshipBundle
  economics: QshipBoxEconomics
  alternates: Record<string, QshipScoredCandidate[]>
}

export type QshipDryRunResult = {
  plan: QshipPlan
  interval: QshipBillingInterval
  mode: QshipFulfillmentMode
  shippingLevel: QshipShippingLevel
  riskProfile: QshipRiskProfile
  member: QshipMemberProfile
  memberLabel: string
  usingSampleInventory: boolean
  usingSampleMember: boolean
  candidateCount: number
  poolCount: number
  supplyCount: number
  scored: QshipScoredCandidate[]
  excluded: QshipExcludedCandidate[]
  exclusionCounts: Partial<Record<QshipExclusionReason, number>>
  bundles: QshipDryRunBundle[]
  notes: string[]
}

/** "What would QShip pick for this member?" — no reservations, no charges. */
export async function runQshipDryRun(input: QshipDryRunInput): Promise<QshipDryRunResult> {
  const now = input.now ?? new Date()
  const notes: string[] = []
  const admin = createAdminClientOrNull()

  let candidates: QshipInventoryCandidate[] = []
  let edhrecRows: EdhrecRow[] = []
  if (!admin) {
    notes.push('SUPABASE_SERVICE_ROLE_KEY is not set, so the dry run uses sample data.')
  } else {
    const [pool, supply] = await Promise.all([
      loadPoolCandidates(admin, notes),
      loadSupplyCandidates(admin, input.useSampleMember ? null : input.userId, notes),
    ])
    candidates = [...pool, ...supply]
    if (candidates.length > 0) {
      edhrecRows = await loadEdhrecRows(admin, candidates.map((c) => c.card.oracleId))
      await enrichCandidates(admin, candidates, edhrecRows, now)
    }
  }

  const usingSampleInventory = candidates.length === 0
  if (usingSampleInventory) {
    if (admin) notes.push('The hub has no available stock or Supply listings yet, so the dry run uses sample inventory.')
    candidates = SAMPLE_QSHIP_INVENTORY.map((candidate) => ({ ...candidate, card: { ...candidate.card } }))
  }

  let member: QshipMemberProfile = SAMPLE_QSHIP_MEMBER
  let memberLabel = 'Sample member (Meren + Atraxa)'
  let usingSampleMember = true
  if (!usingSampleInventory && admin && input.userId && !input.useSampleMember) {
    const loaded = await loadMemberProfile(admin, input.userId, edhrecRows, notes)
    if (loaded && loaded.profile.focusDecks.length > 0) {
      member = loaded.profile
      memberLabel = loaded.label
      usingSampleMember = false
    } else if (loaded) {
      notes.push(`${loaded.label} has no Commander decks, so the dry run uses the sample member.`)
    }
  } else if (usingSampleInventory && !input.useSampleMember && input.userId) {
    notes.push('Sample inventory only matches the sample member, so real members are skipped for now.')
  }

  const plan = QSHIP_PLANS[input.planKey ?? member.planKey]
  const riskProfile = input.riskProfile ?? member.riskProfile
  const interval = input.interval ?? 'monthly'
  const mode = input.mode ?? 'vault_quarterly'
  const shippingLevel = input.shippingLevel ?? DEFAULT_SHIPPING_LEVEL
  member = { ...member, planKey: plan.key, riskProfile }

  const { scored, excluded } = scoreCandidates(candidates, member)
  const exclusionCounts: Partial<Record<QshipExclusionReason, number>> = {}
  for (const entry of excluded) {
    for (const reason of entry.reasons) exclusionCounts[reason] = (exclusionCounts[reason] ?? 0) + 1
  }

  const options = { plan, interval, riskProfile }
  const bundles = buildBundles(scored, options).map<QshipDryRunBundle>((bundle) => ({
    bundle,
    economics: computeBoxEconomics({
      plan,
      interval,
      mode,
      shippingLevel,
      marketValueUsd: bundle.marketValueUsd,
      costBasisUsd: bundle.costBasisUsd,
      itemCount: bundle.cardCount,
    }),
    alternates: Object.fromEntries(
      bundle.items.map((item) => [
        item.candidate.inventoryId,
        findAlternates(bundle, scored, item.candidate.inventoryId, options),
      ])
    ),
  }))

  return {
    plan,
    interval,
    mode,
    shippingLevel,
    riskProfile,
    member,
    memberLabel,
    usingSampleInventory,
    usingSampleMember,
    candidateCount: candidates.length,
    poolCount: candidates.filter((c) => c.channel === 'pool').length,
    supplyCount: candidates.filter((c) => c.channel === 'supply').length,
    scored,
    excluded,
    exclusionCounts,
    bundles,
    notes,
  }
}

// ---------- price tracking ----------

/** Printings whose prices QShip snapshots daily: hub stock, Supply, members' decks. */
export async function collectTrackedScryfallIds(admin: SupabaseAdmin, limit = 7500) {
  const ids = new Set<string>()
  const add = (rows: Array<{ scryfall_id: string | null }>) => {
    for (const row of rows) if (row.scryfall_id && ids.size < limit) ids.add(row.scryfall_id)
  }

  const inventory = await selectAll<{ scryfall_id: string | null }>((from, to) =>
    admin
      .from('qship_inventory')
      .select('scryfall_id')
      .in('status', ['inbound', 'receiving', 'available', 'reserved', 'vaulted'])
      .order('id')
      .range(from, to)
  )
  add(inventory.rows)

  const supply = await selectAll<{ scryfall_id: string | null }>((from, to) =>
    admin.from('single_inventory_items').select('scryfall_id').eq('qship_supply_opt_in', true).order('id').range(from, to)
  )
  add(supply.rows)

  const { rows: members } = await selectAll<{ user_id: string }>((from, to) =>
    admin.from('qship_subscriptions').select('user_id').neq('status', 'cancelled').order('user_id').range(from, to)
  )
  const memberIds = members.map((row) => row.user_id)
  if (memberIds.length > 0 && ids.size < limit) {
    const { data: decks } = await admin.from('decks').select('id').in('user_id', memberIds)
    const deckIds = ((decks ?? []) as Array<{ id: number }>).map((deck) => deck.id)
    if (deckIds.length > 0) {
      const cards = await selectAll<{ scryfall_id: string | null }>((from, to) =>
        admin.from('deck_cards').select('scryfall_id').in('deck_id', deckIds).order('id').range(from, to)
      )
      add(cards.rows)
    }
  }

  return Array.from(ids)
}
