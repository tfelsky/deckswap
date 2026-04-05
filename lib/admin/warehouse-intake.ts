import {
  CARD_CONDITION_DETAILS,
  normalizeCardCondition,
  type CardCondition,
} from '@/lib/decks/conditions'

export type WarehouseDeckCard = {
  id: number
  quantity: number
  card_name: string
  set_name?: string | null
  set_code?: string | null
  collector_number?: string | null
  condition?: string | null
  price_usd?: number | null
  price_usd_foil?: number | null
  price_usd_etched?: number | null
  foil?: boolean | null
}

export type AuthenticityResult = 'authentic' | 'needs_review' | 'suspect'

export type WarehouseInspectionCardInput = {
  cardId: number
  inspectedCondition: CardCondition
  authenticityResult: AuthenticityResult
  issueNote?: string | null
}

export type WarehouseChecklistInput = {
  sealIntact: boolean
  sleeveConditionOk: boolean
  boxConditionOk: boolean
  contentsVerified: boolean
  intakeNotes?: string | null
  cardInputs: WarehouseInspectionCardInput[]
}

export type WarehouseInspectionCardResult = {
  cardId: number
  cardName: string
  quantity: number
  expectedCondition: CardCondition
  inspectedCondition: CardCondition
  authenticityResult: AuthenticityResult
  marketValueUsd: number
  expectedValueUsd: number
  adjustedValueUsd: number
  discrepancyUsd: number
  issueNote?: string | null
  needsReview: boolean
  severeFlag: boolean
}

export type WarehouseInspectionSummary = {
  status: 'passed' | 'failed'
  totalExpectedValueUsd: number
  totalAdjustedValueUsd: number
  discrepancyUsd: number
  highValueAuthenticityFlags: number
  checklistComplete: boolean
  deckLevelFlags: string[]
  cardResults: WarehouseInspectionCardResult[]
}

const CONDITION_FACTORS: Record<CardCondition, number> = {
  near_mint: 1,
  light_play: 0.92,
  moderate_play: 0.8,
  heavy_play: 0.65,
  damaged: 0.4,
}

export const WAREHOUSE_CONDITION_THRESHOLD_USD = 5
export const HIGH_VALUE_AUTHENTICITY_THRESHOLD_USD = 100

export function cardMarketValueUsd(
  card: Pick<
    WarehouseDeckCard,
    'price_usd' | 'price_usd_foil' | 'price_usd_etched' | 'foil'
  >
) {
  if (card.foil) {
    return Number(card.price_usd_etched ?? card.price_usd_foil ?? card.price_usd ?? 0)
  }

  return Number(card.price_usd ?? card.price_usd_foil ?? card.price_usd_etched ?? 0)
}

export function cardsRequiringWarehouseConditionReview(cards: WarehouseDeckCard[]) {
  return cards
    .map((card) => ({
      ...card,
      marketValueUsd: cardMarketValueUsd(card),
    }))
    .filter((card) => card.marketValueUsd >= WAREHOUSE_CONDITION_THRESHOLD_USD)
    .sort(
      (left, right) =>
        right.marketValueUsd - left.marketValueUsd ||
        left.card_name.localeCompare(right.card_name)
    )
}

function roundedUsd(value: number) {
  return Math.round(value * 100) / 100
}

export function summarizeWarehouseInspection(
  cards: WarehouseDeckCard[],
  input: WarehouseChecklistInput
): WarehouseInspectionSummary {
  const cardById = new Map<number, WarehouseDeckCard>(cards.map((card) => [card.id, card]))
  const cardResults: WarehouseInspectionCardResult[] = []
  const deckLevelFlags: string[] = []

  let totalExpectedValueUsd = 0
  let totalAdjustedValueUsd = 0
  let highValueAuthenticityFlags = 0

  for (const cardInput of input.cardInputs) {
    const card = cardById.get(cardInput.cardId)
    if (!card) continue

    const marketValueUsd = cardMarketValueUsd(card)
    const quantity = Math.max(1, Number(card.quantity ?? 1))
    const expectedCondition = normalizeCardCondition(card.condition)
    const inspectedCondition = normalizeCardCondition(cardInput.inspectedCondition)
    const expectedValueUsd = roundedUsd(marketValueUsd * quantity)
    const adjustedValueUsd = roundedUsd(
      marketValueUsd * quantity * CONDITION_FACTORS[inspectedCondition]
    )
    const discrepancyUsd = roundedUsd(Math.max(0, expectedValueUsd - adjustedValueUsd))
    const severeFlag =
      marketValueUsd >= HIGH_VALUE_AUTHENTICITY_THRESHOLD_USD &&
      cardInput.authenticityResult !== 'authentic'
    const needsReview =
      discrepancyUsd > 0 ||
      cardInput.authenticityResult !== 'authentic' ||
      Boolean(cardInput.issueNote?.trim())

    if (severeFlag) {
      highValueAuthenticityFlags += 1
    }

    totalExpectedValueUsd += expectedValueUsd
    totalAdjustedValueUsd += adjustedValueUsd

    cardResults.push({
      cardId: card.id,
      cardName: card.card_name,
      quantity,
      expectedCondition,
      inspectedCondition,
      authenticityResult: cardInput.authenticityResult,
      marketValueUsd,
      expectedValueUsd,
      adjustedValueUsd,
      discrepancyUsd,
      issueNote: cardInput.issueNote?.trim() || null,
      needsReview,
      severeFlag,
    })
  }

  if (!input.sealIntact) {
    deckLevelFlags.push('Arrival seal was not intact.')
  }
  if (!input.sleeveConditionOk) {
    deckLevelFlags.push('Sleeves need replacement or cleanup.')
  }
  if (!input.boxConditionOk) {
    deckLevelFlags.push('Deck box or packaging arrived damaged or incomplete.')
  }
  if (!input.contentsVerified) {
    deckLevelFlags.push('Card contents were not fully verified against the saved list.')
  }

  const discrepancyUsd = roundedUsd(
    Math.max(0, totalExpectedValueUsd - totalAdjustedValueUsd)
  )
  const checklistComplete =
    input.contentsVerified && cardResults.length === input.cardInputs.length

  if (highValueAuthenticityFlags > 0) {
    deckLevelFlags.push(
      `${highValueAuthenticityFlags} higher-value cards need authenticity escalation.`
    )
  }

  const status =
    highValueAuthenticityFlags > 0 ||
    !input.contentsVerified ||
    cardResults.some((card) => card.severeFlag)
      ? 'failed'
      : 'passed'

  return {
    status,
    totalExpectedValueUsd: roundedUsd(totalExpectedValueUsd),
    totalAdjustedValueUsd: roundedUsd(totalAdjustedValueUsd),
    discrepancyUsd,
    highValueAuthenticityFlags,
    checklistComplete,
    deckLevelFlags,
    cardResults,
  }
}

export function formatConditionLabel(value: string | null | undefined) {
  return CARD_CONDITION_DETAILS[normalizeCardCondition(value)].label
}
