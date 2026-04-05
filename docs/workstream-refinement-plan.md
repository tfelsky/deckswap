# Workstream Refinement Plan

Status: Execution plan drafted on April 5, 2026.

This file turns the internal workflow roadmap into concrete slices we can ship in order.

## 1. Import Reliability And Onboarding

### Refinement Goals

- make every import path recoverable
- show users exactly what failed and what can be repaired
- reduce silent data loss between guest preview and signed-in save

### Planned Slices

- Slice 1: import failure taxonomy
  - standardize import error shapes across text, file, and URL sources
  - surface source, failure stage, and suggested recovery action

- Slice 2: guest draft durability pass
  - verify guest draft persistence across sign-in and route changes
  - add clearer recovery entry points when local state is missing

- Slice 3: repair and re-enrichment tooling
  - expose common repair actions for commander inference, card counts, and enrichment gaps
  - connect admin diagnostics to broken import states

## 2. Trade, Checkout, And Escrow Follow-Through

### Refinement Goals

- remove ambiguous transaction states
- make checkout math and participant guidance consistent
- keep users informed at every trade milestone

### Planned Slices

- Slice 1: lifecycle communication coverage
  - add missing notifications and emails for admin receipt, inspection, release readiness, and disputes

- Slice 2: checkout policy consolidation
  - centralize fee, shipping, insurance, and equalization calculations
  - align UI copy with the pricing draft

- Slice 3: accepted-trade continuity audit
  - verify accepted offer handoff, draft recovery, and post-payment transitions

## 3. Admin Logistics And Operations

### Refinement Goals

- make the warehouse workflow operational instead of illustrative
- give admins a clear audit trail for manual overrides
- keep logistics state readable from one place

### Planned Slices

- Slice 1: shipping override audit trail
  - capture reasons and actor context consistently
  - expose override history in admin review surfaces

- Slice 2: intake workflow polish
  - tighten receive, inspect, and release progression
  - make queue cards show the next operator action clearly

- Slice 3: source-of-truth metrics
  - replace placeholder counters with derived transaction and shipment records

## 4. Profiles, Trust, And Verification

### Refinement Goals

- convert trust placeholders into reviewable workflows
- improve seller credibility on deck and trade surfaces
- keep sensitive data private while exposing useful signals

### Planned Slices

- Slice 1: verification request completion rules
  - prevent low-context submissions
  - guide users to fill missing private-profile prerequisites before requesting review

- Slice 2: seller trust rendering pass
  - align profile preview, deck seller cards, and admin trust views
  - make badges and review states more legible

- Slice 3: secure ID intake transition
  - move from plain reference fields toward protected-file-backed workflow

## 5. Notifications, Email, And Internal Visibility

### Refinement Goals

- make activity inboxes trustworthy
- keep email sends idempotent and operationally visible
- reduce the amount of manual checking needed by users and admins

### Planned Slices

- Slice 1: escrow milestone coverage
  - cover receipt, inspection, ready-to-release, completion, and dispute communications

- Slice 2: inbox quality pass
  - improve notification grouping, labels, and destination links

- Slice 3: admin communication visibility
  - show recent transactional email and notification outcomes in admin tools

## 6. SEO, Discovery, And Content Systemization

### Refinement Goals

- protect the SEO groundwork already added
- give public marketplace surfaces stable metadata
- make content and reporting recurring instead of one-off

### Planned Slices

- Slice 1: public surface metadata audit
  - review deck, trade, profile, and campaign routes for metadata gaps

- Slice 2: recurring SEO review loop
  - turn the current report into a repeatable checklist

- Slice 3: editorial workflow framing
  - connect Trend Watcher and campaign pages to an actual publishing cadence

## 7. Rules, Compliance, And Launch Readiness

### Refinement Goals

- make product claims match implementation reality
- reduce launch risk in legal and unsupported rules areas

### Planned Slices

- Slice 1: format support disclosure pass
  - align UI language with current validation coverage

- Slice 2: legal placeholder replacement plan
  - mark required review inputs for Privacy and Terms

- Slice 3: launch-readiness checklist
  - capture remaining product disclaimers, partnership, and reporting gaps

## Current Start Point

Begin with:

1. Trade, Checkout, And Escrow Follow-Through
2. Notifications, Email, And Internal Visibility
3. Admin Logistics And Operations

Why:

- these are the most active recent work areas
- they contain the highest number of partially complete end-to-end workflows
- closing these gaps makes the rest of the product feel more real immediately
