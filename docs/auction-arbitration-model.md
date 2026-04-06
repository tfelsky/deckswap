# Auction Arbitration Model

Status: drafted on April 5, 2026.

This model covers auctions that settle directly between seller and winning bidder without inventory, payment, or payout flowing through DeckSwap.

## When To Use Self-Cleared Auctions

- Use `settlement_mode = 'self_cleared'` when the auction is discovery and matching only.
- Use managed auctions when DeckSwap is expected to mediate payment release or fulfillment milestones itself.

## Lifecycle Model

Self-cleared auctions should move through these checkpoints:

1. `active`
2. `pending_confirmation`
3. `awaiting_settlement`
4. `completed`

If either side reports a problem after winner confirmation, move the auction to `under_arbitration` until an admin resolves the case.

## Required Settlement Checkpoints

For self-cleared auctions, the product should capture these attestations:

- `winner_acknowledged_at`
  The winning buyer has seen the result and accepted the direct-settlement path.

- `seller_acknowledged_at`
  The seller has accepted the winning buyer and is moving into offline coordination.

- `buyer_payment_marked_at`
  The buyer states payment was sent by the agreed rail.

- `seller_fulfillment_marked_at`
  The seller states the deck was handed off, shipped, or otherwise fulfilled.

- `buyer_received_marked_at`
  The buyer states the deck was received and the case can close.

- `settled_at`
  Final self-cleared completion timestamp.

## Arbitration Intake

Create an `auction_arbitration_cases` row when either participant reports:

- non-payment
- non-delivery
- item not as described
- damage
- communication breakdown
- another settlement blocker

Each case should capture:

- who opened it
- who the counterparty is
- the last checkpoint reached
- what outcome the claimant is asking for
- a concise statement and evidence summary

## Admin Process

1. Review the latest auction state and event timeline.
2. Confirm the last mutually acknowledged checkpoint.
3. Read claimant statement and evidence summary.
4. Request or record respondent statement.
5. Decide whether the auction should:
   - return to `awaiting_settlement`
   - close as `completed`
   - close as `cancelled`
6. Record the outcome and internal notes on the arbitration case.
7. Stamp `dispute_resolved_at` on the listing when the case is resolved.

## Operating Rules

- Arbitration is evidence-led, not chat-led. The timeline and checkpoint records should carry most of the case.
- Self-cleared arbitration should not imply DeckSwap custody of funds or inventory.
- If the seller and buyer reconcile off-platform, admins can resolve the case and return the listing to `awaiting_settlement`.
- If trust or fraud risk expands beyond a single transaction, route the account into the broader trust review workflow separately.
