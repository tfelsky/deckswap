import { isLikelyTokenCard } from '@/lib/commander/parse'
import { normalizeDeckFormat } from '@/lib/decks/formats'

export type RepairDeckCardRow = {
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
  condition?: string | null
  condition_source?: string | null
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

export type RepairDeckTokenRow = {
  quantity: number
  token_name: string
  set_code?: string | null
  set_name?: string | null
  collector_number?: string | null
  foil?: boolean | null
  sort_order?: number | null
  image_url?: string | null
  scryfall_id?: string | null
  oracle_id?: string | null
  finishes?: string[] | null
  type_line?: string | null
}

type MainboardAccumulator = RepairDeckCardRow
type CommanderAccumulator = RepairDeckCardRow
type TokenAccumulator = RepairDeckTokenRow

function repairKey(input: {
  name: string
  setCode?: string | null
  collectorNumber?: string | null
  foil?: boolean | null
}) {
  return [
    input.name.trim().toLowerCase(),
    input.setCode?.trim().toLowerCase() ?? '',
    input.collectorNumber?.trim().toLowerCase() ?? '',
    input.foil ? 'foil' : 'nonfoil',
  ].join('::')
}

function repairNameKey(name: string) {
  return name.trim().toLowerCase()
}

function addCommanderRow(
  map: Map<string, CommanderAccumulator>,
  row: RepairDeckCardRow
) {
  const key = repairKey({
    name: row.card_name,
    setCode: row.set_code,
    collectorNumber: row.collector_number,
    foil: row.foil,
  })
  const existing = map.get(key)
  if (existing) {
    existing.quantity = Math.max(existing.quantity, row.quantity, 1)
    return
  }

  map.set(key, {
    ...row,
    section: 'commander',
    quantity: Math.max(row.quantity, 1),
  })
}

function addMainboardRow(
  map: Map<string, MainboardAccumulator>,
  row: RepairDeckCardRow,
  mode: 'merge' | 'fill' | 'singleton_repair'
) {
  const key = repairKey({
    name: row.card_name,
    setCode: row.set_code,
    collectorNumber: row.collector_number,
    foil: row.foil,
  })
  const existing = map.get(key)

  if (existing) {
    if (mode === 'merge') {
      existing.quantity += row.quantity
    } else if (mode === 'singleton_repair') {
      existing.quantity = Math.max(existing.quantity, row.quantity)
    }
    return
  }

  map.set(key, {
    ...row,
    section: 'mainboard',
  })
}

function addTokenRow(
  map: Map<string, TokenAccumulator>,
  row: RepairDeckTokenRow,
  mode: 'merge' | 'fill'
) {
  const key = repairKey({
    name: row.token_name,
    setCode: row.set_code,
    collectorNumber: row.collector_number,
    foil: row.foil,
  })
  const existing = map.get(key)

  if (existing) {
    if (mode === 'merge') {
      existing.quantity += row.quantity
    }
    return
  }

  map.set(key, { ...row })
}

export function rebuildDeckStructureFromSavedRows(
  cards: RepairDeckCardRow[],
  tokens: RepairDeckTokenRow[],
  format?: string | null
) {
  const normalizedFormat = normalizeDeckFormat(format)
  const singletonRepairMode =
    normalizedFormat === 'commander' || normalizedFormat === 'canlander'
  const commanderMap = new Map<string, CommanderAccumulator>()
  const mainboardMap = new Map<string, MainboardAccumulator>()
  const tokenMap = new Map<string, TokenAccumulator>()

  for (const card of cards) {
    if (card.section === 'commander') {
      addCommanderRow(commanderMap, card)
    }
  }

  const commanderKeys = new Set(commanderMap.keys())
  const nonTokenNameKeys = new Set<string>()

  for (const card of cards) {
    if (card.section !== 'mainboard') continue

    const key = repairKey({
      name: card.card_name,
      setCode: card.set_code,
      collectorNumber: card.collector_number,
      foil: card.foil,
    })

    if (commanderKeys.has(key)) {
      continue
    }

    nonTokenNameKeys.add(repairNameKey(card.card_name))

    if (isLikelyTokenCard(card.card_name, card.set_code)) {
      addTokenRow(
        tokenMap,
        {
          quantity: card.quantity,
          token_name: card.card_name,
          set_code: card.set_code,
          set_name: card.set_name,
          collector_number: card.collector_number,
          foil: card.foil,
          sort_order: card.sort_order,
          image_url: card.image_url,
          scryfall_id: card.scryfall_id,
          oracle_id: card.oracle_id,
          finishes: card.finishes,
          type_line: card.type_line,
        },
        'fill'
      )
      continue
    }

    addMainboardRow(
      mainboardMap,
      card,
      singletonRepairMode && !isBasicLikeCard(card.card_name) ? 'singleton_repair' : 'merge'
    )
  }

  for (const token of tokens) {
    const key = repairKey({
      name: token.token_name,
      setCode: token.set_code,
      collectorNumber: token.collector_number,
      foil: token.foil,
    })

    if (commanderKeys.has(key)) {
      continue
    }

    const tokenNameKey = repairNameKey(token.token_name)

    if (isLikelyTokenCard(token.token_name, token.set_code)) {
      addTokenRow(tokenMap, token, 'merge')
      continue
    }

    // Some broken imports mirror real deck cards into deck_tokens as well.
    // If the card already exists in commander/mainboard by name, do not
    // re-promote that duplicate token row back into the maindeck.
    if (nonTokenNameKeys.has(tokenNameKey)) {
      continue
    }

    addMainboardRow(
      mainboardMap,
      {
        section: 'mainboard',
        quantity: token.quantity,
        card_name: token.token_name,
        set_code: token.set_code,
        set_name: token.set_name,
        collector_number: token.collector_number,
        foil: token.foil,
        sort_order: token.sort_order,
        image_url: token.image_url,
        scryfall_id: token.scryfall_id,
        oracle_id: token.oracle_id,
        finishes: token.finishes,
        type_line: token.type_line,
        condition: 'near_mint',
        condition_source: 'import_default',
      },
      singletonRepairMode && !isBasicLikeCard(token.token_name) ? 'singleton_repair' : 'fill'
    )
  }

  return {
    commanders: Array.from(commanderMap.values()).sort(
      (left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0)
    ),
    mainboard: Array.from(mainboardMap.values()).sort(
      (left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0)
    ),
    tokens: Array.from(tokenMap.values()).sort(
      (left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0)
    ),
  }
}

function isBasicLikeCard(cardName: string) {
  const normalized = cardName.trim().toLowerCase()
  return (
    normalized === 'plains' ||
    normalized === 'island' ||
    normalized === 'swamp' ||
    normalized === 'mountain' ||
    normalized === 'forest' ||
    normalized === 'wastes'
  )
}
