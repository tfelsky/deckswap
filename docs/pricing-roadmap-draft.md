# Pricing Roadmap Draft

Status: Draft placeholder for a later roadmap item.

## Goal

Define a production pricing mechanism for DeckSwap that turns blended card value into a marketplace price that includes DeckSwap's profit and fulfillment costs.

## Inputs We Already Have

- Blended card estimate derived from deck card pricing.
- Foil-aware card-level pricing.
- Deck-level rolled up pricing total.

## Inputs To Add Later

- Shipping cost for Canada-to-Canada orders.
- Shipping cost for USA-to-USA orders.
- Insurance cost by order value band.
- Matching fee charged by DeckSwap.
- Target margin or take-rate.
- Optional packing or handling fee.

## Proposed Future Formula

Marketplace Price =
Blended Card Value
+ Shipping
+ Insurance
+ Matching Fee
+ DeckSwap Margin

## Fulfillment Cases To Model

- Canada to Canada
- USA to USA

## Open Questions

- Should shipping be fully baked into the list price or shown separately at checkout?
- Should insurance be mandatory above a price threshold?
- Should the matching fee be flat, percentage-based, or hybrid?
- Should margin scale by deck value tier?
- Do we want one domestic pricing formula per country or a region matrix later?

## Suggested Outputs

- `blended_card_value_usd`
- `shipping_usd`
- `insurance_usd`
- `matching_fee_usd`
- `platform_margin_usd`
- `recommended_listing_price_usd`

## Notes

- Keep this draft as a reserved planning file only for now.
- Do not wire this formula into the live UI until product rules are finalized.
