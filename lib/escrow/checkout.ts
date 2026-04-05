import type { EscrowCheckoutSide, EscrowPrototypeResult } from '@/lib/escrow/prototype'
import type { TradeParticipantRow } from '@/lib/escrow/foundation'

export type CheckoutBreakdownItem = {
  label: string
  value: number
}

export type CheckoutBreakdown = {
  deckValue: number
  totalDue: number
  lineItems: CheckoutBreakdownItem[]
  packagingMessage: string
}

function coalesceMoney(value?: number | null) {
  return Number(value ?? 0)
}

function buildPackagingMessage(packagingValue: number) {
  return packagingValue > 0
    ? 'The next-day flat folded box with prepaid label is already included in this total.'
    : 'No box and prepaid label add-on is included in this total.'
}

export function buildCheckoutBreakdownFromSide(side: EscrowCheckoutSide): CheckoutBreakdown {
  return {
    deckValue: side.deckValue,
    totalDue: side.amountDue,
    lineItems: [
      { label: 'Matching fee', value: side.matchingFee },
      { label: 'Shipping', value: side.shipping },
      { label: 'Insurance', value: side.insurance },
      { label: 'Box + prepaid label', value: side.packaging },
      { label: 'Equalization', value: side.equalizationOwed },
    ],
    packagingMessage: buildPackagingMessage(side.packaging),
  }
}

export function buildCheckoutBreakdownFromParticipant(
  participant: Pick<
    TradeParticipantRow,
    | 'deck_value_usd'
    | 'matching_fee_usd'
    | 'shipping_usd'
    | 'insurance_usd'
    | 'packaging_addon_usd'
    | 'equalization_owed_usd'
    | 'amount_due_usd'
  >
): CheckoutBreakdown {
  const packaging = coalesceMoney(participant.packaging_addon_usd)

  return {
    deckValue: coalesceMoney(participant.deck_value_usd),
    totalDue: coalesceMoney(participant.amount_due_usd),
    lineItems: [
      { label: 'Matching fee', value: coalesceMoney(participant.matching_fee_usd) },
      { label: 'Shipping', value: coalesceMoney(participant.shipping_usd) },
      { label: 'Insurance', value: coalesceMoney(participant.insurance_usd) },
      { label: 'Box + prepaid label', value: packaging },
      { label: 'Equalization', value: coalesceMoney(participant.equalization_owed_usd) },
    ],
    packagingMessage: buildPackagingMessage(packaging),
  }
}

export function buildPrototypeCheckoutBreakdowns(result: EscrowPrototypeResult) {
  return {
    deckA: buildCheckoutBreakdownFromSide(result.deckA),
    deckB: buildCheckoutBreakdownFromSide(result.deckB),
  }
}
