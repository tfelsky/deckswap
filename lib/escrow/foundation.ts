import {
  calculateEscrowPrototype,
  type EscrowPrototypeInput,
  type SupportedCountry,
} from '@/lib/escrow/prototype'

export type TradeStatus =
  | 'draft'
  | 'awaiting_payment'
  | 'awaiting_shipments'
  | 'in_inspection'
  | 'ready_to_release'
  | 'completed'
  | 'disputed'
  | 'cancelled'

export type PaymentStatus = 'unpaid' | 'authorized' | 'paid' | 'refunded'

export type TradeTransactionRow = {
  id: number
  created_by?: string | null
  status: TradeStatus
  lane_type: string
  supported: boolean
  equalization_recipient?: 'a' | 'b' | null
  equalization_amount_usd?: number | null
  platform_gross_usd?: number | null
  notes?: string[] | null
  created_at?: string | null
  updated_at?: string | null
}

export type TradeParticipantRow = {
  id?: number
  transaction_id: number
  side: 'a' | 'b'
  user_id?: string | null
  deck_id?: number | null
  deck_value_usd: number
  country_code: SupportedCountry
  shipping_usd: number
  insurance_usd: number
  matching_fee_usd: number
  equalization_owed_usd: number
  amount_due_usd: number
  payment_status?: PaymentStatus | null
}

export type EscrowEventRow = {
  id?: number
  transaction_id: number
  actor_user_id?: string | null
  event_type: string
  event_data?: Record<string, unknown> | null
  created_at?: string | null
}

export function isEscrowSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.trade_transactions'") ||
    message.includes('relation "public.trade_transactions"') ||
    message.includes("relation 'public.trade_transaction_participants'") ||
    message.includes('relation "public.trade_transaction_participants"') ||
    message.includes("relation 'public.escrow_events'") ||
    message.includes('relation "public.escrow_events"') ||
    message.includes("Could not find the relation 'public.trade_transactions'") ||
    message.includes("Could not find the relation 'public.trade_transaction_participants'") ||
    message.includes("Could not find the relation 'public.escrow_events'")
  )
}

export function buildTradeDraftRows(
  input: EscrowPrototypeInput,
  createdBy: string
): {
  transaction: Omit<TradeTransactionRow, 'id'>
  participants: Array<Omit<TradeParticipantRow, 'id' | 'transaction_id'>>
  initialEvent: Omit<EscrowEventRow, 'id' | 'transaction_id'>
} {
  const result = calculateEscrowPrototype(input)

  return {
    transaction: {
      created_by: createdBy,
      status: 'draft',
      lane_type: result.lane,
      supported: result.supported,
      equalization_recipient: result.equalizationRecipient,
      equalization_amount_usd: result.equalizationAmount,
      platform_gross_usd: result.platformGross,
      notes: result.notes,
    },
    participants: [
      {
        side: 'a',
        user_id: createdBy,
        deck_value_usd: result.deckA.deckValue,
        country_code: input.countryA,
        shipping_usd: result.deckA.shipping,
        insurance_usd: result.deckA.insurance,
        matching_fee_usd: result.deckA.matchingFee,
        equalization_owed_usd: result.deckA.equalizationOwed,
        amount_due_usd: result.deckA.amountDue,
        payment_status: 'unpaid',
      },
      {
        side: 'b',
        user_id: null,
        deck_value_usd: result.deckB.deckValue,
        country_code: input.countryB,
        shipping_usd: result.deckB.shipping,
        insurance_usd: result.deckB.insurance,
        matching_fee_usd: result.deckB.matchingFee,
        equalization_owed_usd: result.deckB.equalizationOwed,
        amount_due_usd: result.deckB.amountDue,
        payment_status: 'unpaid',
      },
    ],
    initialEvent: {
      actor_user_id: createdBy,
      event_type: 'draft_created',
      event_data: {
        input,
        result,
      },
    },
  }
}

export function formatTradeStatus(status: TradeStatus | string | null | undefined) {
  const normalized = (status ?? 'draft').replace(/_/g, ' ')
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function formatPaymentStatus(status: PaymentStatus | string | null | undefined) {
  const normalized = (status ?? 'unpaid').replace(/_/g, ' ')
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}
