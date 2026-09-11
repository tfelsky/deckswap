// Trade Network Link-Up: bridges members' singles inventory into
// lib/wholesale-turnover so aged high-end stock can be matched into balanced
// owner-to-owner swap proposals. Pure functions only — callers own the
// Supabase queries (memberships + single_inventory_items need the admin
// client because inventory RLS is owner-only).

import {
  generateWholesaleTurnoverProposals,
  type WholesaleInventoryLot,
  type WholesaleTurnoverOptions,
  type WholesaleTurnoverProposal,
} from '@/lib/wholesale-turnover'

export const DEFAULT_MIN_ITEM_VALUE_USD = 50
export const DEFAULT_MINIMUM_AGE_DAYS = 120

export type TradeNetworkMembership = {
  user_id: string
  enabled: boolean
  display_name?: string | null
  country?: string | null
  min_item_value_usd?: number | null
  minimum_age_days?: number | null
  wanted_categories?: string[] | null
  blocked_user_ids?: string[] | null
}

export type TradeNetworkLinkupStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn'

export type TradeNetworkLinkupRow = {
  id: number
  initiated_by_user_id: string
  counterparty_user_id: string
  status: TradeNetworkLinkupStatus
  message?: string | null
  proposal: WholesaleTurnoverProposal
  responded_at?: string | null
  created_at: string
  updated_at: string
}

export type NetworkInventoryItem = {
  id: number
  user_id: string
  card_name: string
  quantity?: number | null
  foil?: boolean | null
  set_name?: string | null
  rarity?: string | null
  type_line?: string | null
  price_usd?: number | null
  price_usd_foil?: number | null
  inventory_status?: string | null
  imported_at?: string | null
}

export function isTradeNetworkSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes('trade_network_memberships') ||
    message.includes('trade_network_linkups')
  )
}

export function itemUnitValueUsd(item: NetworkInventoryItem) {
  const price = item.foil ? item.price_usd_foil ?? item.price_usd : item.price_usd
  return Math.max(0, Number(price ?? 0))
}

// "Legendary Creature — Elder Dragon" -> "creature". Falls back to the whole
// (lowercased) type line when no recognizable primary type is present.
export function primaryCardType(typeLine?: string | null) {
  const face = (typeLine ?? '').split('//')[0]
  const beforeDash = face.split(/[—–-]/)[0].trim().toLowerCase()
  if (!beforeDash) return null

  const knownTypes = [
    'creature',
    'planeswalker',
    'instant',
    'sorcery',
    'artifact',
    'enchantment',
    'land',
    'battle',
  ]
  const words = beforeDash.split(/\s+/)
  for (const type of knownTypes) {
    if (words.includes(type)) return type
  }
  return beforeDash
}

function membershipMinValue(membership?: TradeNetworkMembership) {
  const value = Number(membership?.min_item_value_usd ?? DEFAULT_MIN_ITEM_VALUE_USD)
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_MIN_ITEM_VALUE_USD
}

function membershipMinAgeDays(membership?: TradeNetworkMembership) {
  const value = Number(membership?.minimum_age_days ?? DEFAULT_MINIMUM_AGE_DAYS)
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_MINIMUM_AGE_DAYS
}

function itemAgeDays(item: NetworkInventoryItem, asOf: Date) {
  const imported = item.imported_at ? new Date(item.imported_at) : null
  if (!imported || Number.isNaN(imported.getTime())) return 0
  return Math.max(0, Math.floor((asOf.getTime() - imported.getTime()) / (24 * 60 * 60 * 1000)))
}

const MATCHABLE_STATUSES = new Set(['staged', 'buy_it_now_live'])

/**
 * Turn members' raw singles inventory into wholesale lots. Applies each
 * member's own high-end floor and aging threshold, so the engine only ever
 * sees stock the owner considers stale enough (and expensive enough) to move.
 */
export function buildNetworkLots(
  items: NetworkInventoryItem[],
  membershipsByUser: Map<string, TradeNetworkMembership>,
  asOf: Date = new Date()
): WholesaleInventoryLot[] {
  const lots: WholesaleInventoryLot[] = []

  for (const item of items) {
    const membership = membershipsByUser.get(item.user_id)
    if (!membership || membership.enabled === false) continue
    if (item.inventory_status && !MATCHABLE_STATUSES.has(item.inventory_status)) continue

    const unitValue = itemUnitValueUsd(item)
    if (unitValue < membershipMinValue(membership)) continue
    if (itemAgeDays(item, asOf) < membershipMinAgeDays(membership)) continue

    const quantity = Math.max(1, Math.floor(Number(item.quantity ?? 1)))
    const category = primaryCardType(item.type_line)
    const tags = [item.rarity, item.set_name, item.foil ? 'foil' : null].filter(
      (tag): tag is string => Boolean(tag && tag.trim())
    )

    lots.push({
      id: `single-${item.id}`,
      ownerId: item.user_id,
      ownerName: membership.display_name?.trim() || null,
      title: `${item.card_name}${item.foil ? ' (foil)' : ''} ×${quantity}`,
      category,
      tags,
      quantity,
      estimatedValueUsd: unitValue * quantity,
      acquiredAt: item.imported_at ?? null,
      country: membership.country ?? null,
      wholesaleEnabled: true,
      wantedCategories: membership.wanted_categories ?? null,
      blockedOwnerIds: membership.blocked_user_ids ?? null,
    })
  }

  return lots
}

export function generateNetworkProposals(
  lots: WholesaleInventoryLot[],
  options: Omit<WholesaleTurnoverOptions, 'minimumAgeDays'> = {}
): WholesaleTurnoverProposal[] {
  // Per-member age thresholds were already enforced in buildNetworkLots, so
  // the engine's global age gate is disabled here.
  return generateWholesaleTurnoverProposals(lots, { ...options, minimumAgeDays: 0 })
}

export function proposalsForUser(
  proposals: WholesaleTurnoverProposal[],
  userId: string
): WholesaleTurnoverProposal[] {
  return proposals.filter(
    (proposal) => proposal.ownerAId === userId || proposal.ownerBId === userId
  )
}

/** Re-orient a proposal so `mine`/`theirs` are from the given user's side. */
export function orientProposal(proposal: WholesaleTurnoverProposal, userId: string) {
  const iAmOwnerA = proposal.ownerAId === userId

  return {
    proposal,
    counterpartyId: iAmOwnerA ? proposal.ownerBId : proposal.ownerAId,
    counterpartyName: iAmOwnerA ? proposal.ownerBName : proposal.ownerAName,
    myLots: iAmOwnerA ? proposal.ownerALots : proposal.ownerBLots,
    theirLots: iAmOwnerA ? proposal.ownerBLots : proposal.ownerALots,
    myValueUsd: iAmOwnerA ? proposal.ownerAValueUsd : proposal.ownerBValueUsd,
    theirValueUsd: iAmOwnerA ? proposal.ownerBValueUsd : proposal.ownerAValueUsd,
    iPayCashEqualization:
      proposal.cashPaidByOwnerId != null && proposal.cashPaidByOwnerId === userId,
  }
}
