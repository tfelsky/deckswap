# Product Roadmap

Status: Consolidated roadmap after the current import, pricing, admin, legal, and campaign work.

## Goal

Turn the current DeckSwap prototype into a tighter marketplace product by prioritizing the highest-value and most obvious next steps first, while keeping longer-term campaign and content ideas visible but clearly secondary.

## Current Snapshot

DeckSwap already has:

- authenticated deck creation and import
- guest import preview
- Commander validation and bracket estimation
- broader format ingest with partial support
- per-card and deck-level blended pricing
- admin tools for maintenance, trends, and marketplace metrics
- legal placeholder pages
- escrow checkout prototype
- campaign and community concept pages

## Loose Ends To Resolve

### Import and onboarding loose ends

- Guest import preview is browser-session only and does not persist draft decks server-side.
- Guest preview does not run the full authenticated enrichment/save path.
- Moxfield and file imports need continued hardening around edge-case deck metadata.
- Commander inference for unlabeled imports still needs more real-world testing and fallback handling.

### Marketplace and profile loose ends

- User profiles, shipping data, reputation, and trust signals are still roadmap-only.
- Deck detail pages do not yet show a full seller trust panel.
- Filtering and personalization based on user deck interests and preferred archetypes are still missing.

### Commerce and escrow loose ends

- Checkout is a prototype only, with no persistence, no real payment intent flow, and no order ledger.
- Admin ecommerce counters still include placeholder values for sales, trades, and escrow balances.
- Shipping, insurance, equalization, and escrow operations are modeled conceptually but not operationalized.

### Format support loose ends

- Non-Commander formats are accepted but not yet fully legality-aware.
- Sideboards are not modeled.
- Standard rotation, Pauper common-print legality, and Canadian Highlander points enforcement are still missing.

### Campaign and content loose ends

- Holiday Giveback is a concept page with no live intake workflow or partner operations.
- Paper Power 9 is a concept page with no real submission storage or YouTube/content pipeline.
- Trend Watcher exists, but there is no editorial workflow or content calendar automation yet.

### Legal and partnership loose ends

- Privacy and Terms are placeholder pages and need legal review before public launch.
- Referral disclosure is present, but there is no actual affiliate-link management or reporting yet.

## Priority Order

## Priority 1: Make import-to-save rock solid

Why this is first:

- importing decks is the clearest value prop in the product today
- it directly affects conversion, retention, and trust
- fixing this strengthens both guest onboarding and signed-in usage

Scope:

- make guest import drafts resumable and more durable
- harden Moxfield, Archidekt, file, and text import reliability
- improve commander inference and post-import repair paths
- surface better import diagnostics when parsing or schema issues occur

Expected outcome:

- more users reach a useful deck page successfully
- fewer failed or confusing import sessions
- stronger first-run conversion from guest preview to account creation

## Priority 2: Ship basic profiles and seller trust

Why this is next:

- users need identity, shipping, and trust before real trading can work
- profiles unlock better deck pages, reputation, and filtering
- this is a cleaner foundation than jumping straight into live escrow

Scope:

- implement `profiles` and `profile_private`
- add `/settings/profile`
- show seller display name and ship-from region on deck pages
- prepare the structure for verification badges and marketplace links

Expected outcome:

- listings feel more human and credible
- support and shipping data have a proper home
- future escrow and reputation work has a clean base

## Priority 3: Turn escrow prototype into a real transaction foundation

Why this is high value:

- commerce logic is now one of the strongest differentiators in the product
- the prototype is good enough to shape the real implementation
- this unlocks the future admin dashboard metrics people care about

Scope:

- create order / trade / escrow ledger tables
- persist checkout sessions and user-side obligations
- replace dummy payment method flow with real payment-intent placeholders
- connect admin dashboard counters to real transactional records

Expected outcome:

- the admin dashboard becomes operational instead of partly illustrative
- checkout prototype evolves into a real MVP lane
- the business model starts to become testable

## Priority 4: Add real format rules beyond Commander

Why this matters:

- the product now claims broader format support
- the import page messaging is honest, but users will expect legality checks over time
- this is important, but less urgent than getting import, profiles, and transaction foundations right

Scope:

- sideboard modeling
- four-of enforcement for constructed formats
- Standard rotation legality
- Modern / Legacy / Pauper banned-list logic
- Pauper common-print checks
- Canadian Highlander points enforcement

Expected outcome:

- broader deck support becomes real, not just tolerated
- deck settings and validation become much more trustworthy outside Commander

## Priority 5: Convert community and campaign pages into real programs

Why this is valuable but later:

- these pages are promising brand and community builders
- they should follow after core product loops are reliable

Scope:

- Holiday Giveback:
  - donor intake
  - pledge tracking
  - partner workflow
  - recipient/distribution operations

- Paper Power 9:
  - submission storage
  - admin review queue
  - monthly winner flow
  - content pipeline to YouTube/social

Expected outcome:

- brand/community initiatives become actionable instead of aspirational
- content and goodwill campaigns start feeding back into growth

## Priority 6: Replace placeholder legal and partner infrastructure

Why this is later but necessary:

- the current legal pages are good placeholders, but not final
- this should be completed before serious public scaling or monetized partnerships

Scope:

- legal review of Privacy and Terms
- affiliate/referral program implementation and reporting
- more explicit launch-state disclosures where prototypes still exist

Expected outcome:

- stronger launch readiness
- cleaner compliance posture
- fewer mismatches between product concept and legal framing

## Most Obvious Next Tasks

If we only pick the clearest near-term wins, they are:

1. Persist guest import drafts and tighten import reliability.
2. Build basic profiles and show seller trust on deck pages.
3. Create real trade / escrow / order tables so checkout and admin metrics stop being prototypes.

## What Can Wait

- full campaign automation
- YouTube submission backend
- complete affiliate reporting
- advanced format legality beyond the first pass

Those are all worthwhile, but they are less immediately valuable than fixing import reliability, profile trust, and transaction foundations.

## Related Docs

- `format-rules-roadmap.md`
- `pricing-roadmap-draft.md`
- `user-profile-roadmap.md`
