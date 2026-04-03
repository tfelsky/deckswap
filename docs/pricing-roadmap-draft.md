# Pricing Roadmap Draft

Status: Product and operations draft for later roadmap work.

## Goal

Define a production pricing and escrow model for DeckSwap that preserves value-for-value trading while letting the platform earn a clear fee and manage shipping, insurance, and operational risk.

## Core Principle

DeckSwap should not require both users to front the full cash value of their decks in escrow.

Instead, DeckSwap should:
- physically hold the decks in escrow
- collect service charges and logistics costs in cash
- collect any value equalization owed when one deck is worth more than the other

That keeps the trade capital-light while still giving DeckSwap control over fulfillment and settlement.

## Recommended Checkout Formula

For each user:

`amount_due = matching_fee + shipping + insurance + equalization_owed`

Where:
- `matching_fee` is DeckSwap's service fee
- `shipping` is the user-specific shipment cost
- `insurance` is based on declared deck value or value band
- `equalization_owed = max(0, counterparty_deck_value - my_deck_value)`

## What DeckSwap Holds

- both decks physically, once received
- both users' shipping and insurance funds
- both users' matching fees
- any equalization cash owed by the lower-value side

## What DeckSwap Releases

- each approved deck to the counterparty after inspection
- equalization cash to the user who traded down in deck value

## Inputs We Already Have

- blended card estimate derived from deck card pricing
- foil-aware card-level pricing
- deck-level rolled up pricing total

## Inputs To Add Later

- shipping cost for Canada-to-Canada orders
- shipping cost for USA-to-USA orders
- insurance cost by order value band
- matching fee charged by DeckSwap
- optional packing or handling fee
- high-value inspection rules
- trade floor and maximum protected value

## Suggested Fee Structure

- low-value trades:
  - very small flat fee or reduced percentage
  - avoid making logistics cost bigger than the value protected

- mid-value trades:
  - percentage fee works well
  - standard shipping and insurance logic

- high-value trades:
  - percentage fee with minimum service floor
  - mandatory insurance
  - stronger verification and inspection workflow

## Recommended Value Tiers

- `$0-$149`
  - optional or reduced escrow
  - only worth doing if shipping stays inexpensive

- `$150-$499`
  - standard escrow lane
  - normal inspection and insurance logic

- `$500+`
  - premium escrow lane
  - mandatory insurance
  - stronger verification and issue resolution rules

## Worked Examples

### Example 1: $1000 deck for $1000 deck

User A value: `$1000`
User B value: `$1000`

No equalization is needed.

If the commercial settings are:
- matching fee: `5%`
- shipping: `$20` each
- insurance: `$10` each

Then:
- User A pays: `$50 + $20 + $10 = $80`
- User B pays: `$50 + $20 + $10 = $80`

DeckSwap holds:
- both decks
- `$160` total in service and logistics funds

### Example 2: $500 deck for $300 deck

User A value: `$500`
User B value: `$300`

User B is receiving `$200` more value, so User B owes the equalization.

If the commercial settings are:
- matching fee: `5%`
- shipping: `$20` each
- insurance: `$8` for A, `$6` for B

Then:
- User A pays: `$25 + $20 + $8 = $53`
- User B pays: `$15 + $20 + $6 + $200 = $241`

After inspection and approval:
- User A receives User B's deck plus the `$200` equalization
- User B receives User A's deck
- DeckSwap retains the fee and logistics charges

### Example 3: $100 deck for $100 deck

User A value: `$100`
User B value: `$100`

No equalization is needed.

If the commercial settings are:
- matching fee: `5%`
- shipping: `$15` each
- insurance: `$3` each

Then:
- User A pays: `$5 + $15 + $3 = $23`
- User B pays: `$5 + $15 + $3 = $23`

This is the danger zone where logistics can eat too much of the trade. That is why DeckSwap likely needs either:
- a minimum protected trade value
- a reduced-fee lane
- or lighter-weight handling for lower-value trades

## Operations Flow

1. Both users agree on deck values and settlement terms.
2. DeckSwap calculates each user's amount due.
3. Both users prepay fee, shipping, insurance, and any equalization owed.
4. Both users send decks to DeckSwap.
5. DeckSwap inspects both decks against the agreed inventory.
6. If both sides pass inspection, DeckSwap forwards each deck to the counterparty.
7. If one side owed equalization, DeckSwap releases that cash to the higher-value side.
8. If there is a dispute, DeckSwap pauses release until support resolution.

## Fulfillment Cases To Model

- Canada to Canada
- USA to USA

## Suggested Outputs

- `blended_card_value_usd`
- `shipping_usd`
- `insurance_usd`
- `matching_fee_usd`
- `equalization_owed_usd`
- `amount_due_usd`
- `escrow_lane`

## Open Questions

- should low-value trades bypass full escrow?
- should shipping be fully baked into the checkout total or itemized separately?
- should insurance be mandatory above a threshold?
- should the matching fee be flat, percentage-based, or hybrid?
- do we want a minimum protected trade value?
- do we want country-specific rate tables or a broader region matrix later?

## Notes

- Keep this draft as a planning and product-spec file for now.
- Do not wire this formula into the live UI until product rules, fee policy, and support workflows are finalized.
