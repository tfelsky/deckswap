# Internal Workflow Roadmap

Status: Internal planning draft created on April 5, 2026.

## Reconstructed AI Thread Audit

Direct access to prior Codex desktop chat threads is not available from the workspace, so this roadmap reconstructs our active conversation backlog from:

- recent git history
- current roadmap docs
- partially built product and admin surfaces in the repo

Recent work themes inferred from commits:

- trade drafts, accepted trade recovery, and guaranteed-offer checkout
- shipping override, warehouse intake, and trader trust admin tooling
- trade email notifications
- profile settings polish and trust display work
- newsletter generation and Resend admin workflows
- SEO metadata, sitemap, robots, and reporting
- deck presentation upgrades in trade flows

Current conclusion:

- the main loose ends are not isolated bug tickets
- they are follow-through gaps where a foundation now exists but the workflow is not yet fully operational end to end

## Goal

Turn the current DeckSwap codebase from a collection of promising product foundations into a more disciplined operating workflow:

- one clear intake path for new loose ends
- one prioritized execution order for product work
- one lightweight review loop so prototypes do not linger without owners or next steps

## What Counts As A Loose End

Treat any of the following as roadmap intake items:

- prototype pages without a live data model or operational workflow
- admin views with placeholder metrics or manual review steps
- database drafts that exist in `docs/sql` but are not fully reflected in product flows
- roadmap notes that have no current phase, owner, or decision record
- trust, legal, or payment areas that are represented in UI but not yet production-ready

## Internal Workflow

### 1. Intake

Capture work from four sources:

- Vercel toolbar threads when they exist
- direct product observations during build or QA
- roadmap and spec docs in `docs/`
- admin/manual operations pain points seen in internal use

For each item, record:

- summary
- product area
- user impact
- operational risk
- dependency blockers
- next concrete action

### 2. Triage

Classify each item into one of these lanes:

- `P0 Launch Risk`
  - legal blockers
  - broken imports
  - trust or payment issues that could damage users

- `P1 Core Conversion`
  - onboarding
  - import reliability
  - profile trust signals
  - notifications that unblock trading

- `P2 Transaction Operations`
  - escrow workflow
  - logistics
  - inspections
  - settlement reporting

- `P3 Expansion`
  - broader format rules
  - campaigns
  - content programs
  - partner tooling

### 3. Execution

Run work in vertical slices instead of isolated feature fragments. Each slice should include:

- data model or SQL change
- server action or API support
- UI surface
- admin or observability surface if operations are involved
- launch note in docs if the feature is still partial

### 4. Review

At the end of each slice:

- resolve or archive any related thread
- update the relevant roadmap doc
- note what is still intentionally deferred
- move new follow-up items back into intake instead of leaving them implicit

## Recommended Workstreams

### Workstream 1: Import Reliability And Onboarding

Reason:

- this is still the clearest top-of-funnel value in the product
- import quality affects trust, conversion, and support load at the same time

Open loose ends:

- guest preview still stops short of full enrichment and pricing before account creation
- source-specific import failures need clearer diagnostics
- commander inference and deck repair still need more real-world hardening
- inventory and collection-scale import support is still incomplete

Definition of done:

- guest-to-account handoff is durable
- failed imports produce actionable diagnostics
- repair flows can recover common import issues without full re-import

### Workstream 2: Trade, Checkout, And Escrow Follow-Through

Reason:

- recent AI work has heavily focused on trade drafts, guaranteed offers, checkout framing, and accepted-trade recovery
- this is one of the clearest areas where the product has strong scaffolding but still needs operational completion

Open loose ends:

- guaranteed-offer checkout needs a final production rules pass
- accepted trade recovery and draft continuity need validation across edge cases
- pricing, fees, equalization, and shipping logic still need a single authoritative implementation path
- trade flows still need tighter handoff into inspection, intake, and settlement

Definition of done:

- users can move from offer to transaction without ambiguous intermediate states
- checkout totals match the intended pricing policy
- accepted trades do not get stranded between user actions and admin operations

### Workstream 3: Admin Logistics And Operations

Reason:

- recent commits show active work around warehouse intake, shipping overrides, and admin trust details
- this is where the operational model either becomes real or stays a prototype forever

Open loose ends:

- shipping override rules need a clear policy and audit trail
- warehouse intake needs consistent status progression and operator guidance
- admin counters and queue states still need more live data backing
- logistics, inspection, and release workflows are modeled but not fully unified

Definition of done:

- admins can intake, inspect, adjust, and release trades from one coherent workflow
- operational status changes are traceable
- placeholder metrics are replaced by source-of-truth records

### Workstream 4: Profiles, Trust, And Verification

Reason:

- the repo already has the first pass of profiles and internal trust scoring
- real trading cannot feel safe until verification becomes operational

Open loose ends:

- reputation remains lighter than the internal trust model
- ID collection is still placeholder-level
- verification queues need secure file handling and clearer reviewer workflow
- preferences and personalization are still missing

Definition of done:

- public and private profile layers are clearly separated
- verification statuses are real and reviewable
- seller trust signals render consistently on deck and profile surfaces

### Workstream 5: Notifications, Email, And Internal Visibility

Reason:

- recent work added trade emails plus Resend and newsletter admin tooling
- the foundation is there, but the communication system still needs to become a reliable operating layer

Open loose ends:

- trade offer and counteroffer notifications are still thin
- escrow milestone notifications are not fully wired
- import diagnostics are not centrally visible in admin
- newsletter and nurture tooling need governance, segmentation, and send-state discipline
- editorial and campaign workflows have no operating calendar

Definition of done:

- users receive timely state changes for key marketplace actions
- admins can inspect failures and pending queues without reproducing issues manually

### Workstream 6: SEO, Discovery, And Content Systemization

Reason:

- recent AI work shipped metadata, sitemap, robots, and an SEO report
- this created discoverability foundations, but not yet an ongoing content or measurement workflow

Open loose ends:

- SEO improvements need recurring measurement instead of one-off setup
- deck, trade, and profile surfaces need continued metadata refinement as features stabilize
- campaign pages still lack operational backends and publishing cadence
- Trend Watcher and content-adjacent admin tools are not yet part of a repeatable editorial loop

Definition of done:

- key public surfaces have stable metadata and crawl behavior
- internal reporting shows what content and marketplace pages are gaining traction
- campaign and editorial surfaces have an ownerable publishing rhythm

### Workstream 7: Rules, Compliance, And Launch Readiness

Reason:

- format claims, legal pages, and launch disclosures need to match reality before broader rollout

Open loose ends:

- non-Commander legality remains incomplete
- sideboards are not modeled
- Privacy and Terms are placeholders
- affiliate and partner reporting is not implemented

Definition of done:

- product messaging is accurate for supported formats
- compliance pages are reviewed
- launch-state caveats are explicit where prototypes remain

## Sequencing

### Phase A: Next 2 Weeks

- stabilize trade, checkout, and admin logistics follow-through
- close the biggest trust and notification gaps around those flows
- add explicit intake tracking for loose ends found during import, trust, escrow, and email work
- connect roadmap items to concrete slices instead of broad theme buckets

### Phase B: Next 2 To 6 Weeks

- operationalize profile verification and trust rendering
- implement the first dependable milestone notification layer
- replace placeholder admin metrics with live transactional sources where possible
- formalize SEO and content review into a recurring process

### Phase C: After Core Loops Are Stable

- return to import expansion and broader onboarding improvements
- expand rules-aware format support
- formalize campaign programs like Holiday Giveback and Paper Power 9
- complete legal and partner infrastructure before broader public scaling

## Weekly Operating Cadence

Use one short internal review each week with this agenda:

1. Confirm whether any new Vercel threads or QA notes need intake.
2. Review active workstream status by blocker, not by optimism.
3. Close or rewrite stale roadmap items so they stay actionable.
4. Pick one vertical slice per active workstream.
5. Record what is intentionally deferred.

## Immediate Next Actions

1. Use this file as the single internal workflow index.
2. Keep `docs/product-roadmap.md` as the outward-looking product roadmap.
3. When a new loose end appears, add it here first by workstream before spinning up a new standalone draft doc.
4. Prioritize trade flow completion, admin operations, trust, and notifications before campaigns or expansion work.

## Source Docs Reviewed

- `docs/product-roadmap.md`
- `docs/pricing-roadmap-draft.md`
- `docs/user-profile-roadmap.md`
- `docs/format-rules-roadmap.md`
- `docs/commander-brackets-notes.md`
