# Product Roadmap

Status: Consolidated roadmap after the current import, pricing, admin, legal, and campaign work.

## Goal

Turn the current DeckSwap prototype into a tighter marketplace product by prioritizing the highest-value and most obvious next steps first, while keeping longer-term campaign and content ideas visible but clearly secondary.

## Current Snapshot

DeckSwap already has:

- authenticated deck creation and import
- guest import preview
- guest preview handoff into authenticated save flow
- Commander validation and bracket estimation
- broader format ingest with partial support
- per-card and deck-level blended pricing
- admin tools for maintenance, trends, and marketplace metrics
- basic public profiles, private shipping profiles, and seller trust controls
- legal placeholder pages
- escrow transaction foundation with persisted draft trades
- campaign and community concept pages

## Loose Ends To Resolve

### Import and onboarding loose ends

- Guest import preview is still browser-session only and does not persist draft decks server-side.
- Guest preview still stops short of full pricing/enrichment before account creation.
- Moxfield and file imports need continued hardening around edge-case deck metadata.
- Commander inference for unlabeled imports still needs more real-world testing and fallback handling.

### Marketplace and profile loose ends

- Profile tables now have a first pass, but real verification workflows and richer reputation math are still missing.
- Internal validation scoring now has a first pass, but last-login telemetry, live offer-response timing, and automated IP-based checks are still partly manual.
- ID upload is still represented as a reserved placeholder, not a live collection flow.
- Filtering and personalization based on user deck interests and preferred archetypes are still missing.

### Commerce and escrow loose ends

- Draft trade records and event history now exist, but there are no real payment intents yet.
- Admin ecommerce counters still include placeholder values for sales, paid escrows, and completed settlements.
- Shipping, insurance, intake, inspection, and release operations are modeled but not yet operationalized.

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

## Priority 1: Finish import reliability and guest onboarding

Why this is first:

- importing decks is the clearest value prop in the product today
- it directly affects conversion, retention, and trust
- fixing this strengthens both guest onboarding and signed-in usage

Scope:

- make guest import drafts resumable and more durable
- harden Moxfield, Archidekt, file, and text import reliability
- improve commander inference and post-import repair paths
- surface better import diagnostics when parsing or schema issues occur
- decide whether guest preview should gain server-side persistence or stay intentionally lightweight

Expected outcome:

- more users reach a useful deck page successfully
- fewer failed or confusing import sessions
- stronger first-run conversion from guest preview to account creation

## Priority 2: Deepen profiles, trust, and reputation

Why this is next:

- users need identity, shipping, and trust before real trading can work
- profiles unlock better deck pages, reputation, and filtering
- this is a cleaner foundation than jumping straight into live escrow

Scope:

- turn reserved trust fields into real workflows
- automate more of the internal validation score from real login, messaging, and transaction events
- add marketplace link verification and moderation
- add ID collection and protected file storage
- expose better seller/trader summaries across listing pages

Expected outcome:

- listings feel more human and credible
- support and shipping data have a proper home
- future escrow and reputation work has a clean base

## Priority 3: Turn the transaction foundation into live escrow operations

Why this is high value:

- commerce logic is now one of the strongest differentiators in the product
- the prototype is good enough to shape the real implementation
- this unlocks the future admin dashboard metrics people care about

Scope:

- attach deck IDs and counterparties to transaction drafts
- replace dummy payment method flow with real payment-intent placeholders
- add shipment intake, inspection, dispute, and release states
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
2. Turn basic profile data into real trust workflows and verification.
3. Turn draft trade records into live transaction operations.

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
