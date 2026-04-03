# Format Rules Roadmap

Status: Planned follow-up.

## Goal

Move non-Commander formats from light ingest support into real rules-aware validation and legality checks.

## Current State

- Commander has the richest support today, including validation, bracket estimation, and commander repair flows.
- Other formats can be imported and labeled, but are not yet fully rules-complete.
- The importer currently accepts broader deck inventory without enforcing the full official deckbuilding rules for each supported format.

## Formats To Fully Implement

- Standard
- Modern
- Legacy
- Pauper
- Canadian Highlander
- Premodern

## Rules Work Still Needed

- Standard:
  - live legality by currently legal Standard sets
  - sideboard rules
  - four-of enforcement outside basic lands
  - rotation-aware messaging

- Modern:
  - banned list enforcement
  - sideboard rules
  - four-of enforcement outside basic lands

- Legacy:
  - banned list enforcement
  - sideboard rules
  - four-of enforcement outside basic lands

- Pauper:
  - common-print legality checks
  - banned list enforcement
  - sideboard rules
  - four-of enforcement outside basic lands

- Canadian Highlander:
  - 100-card singleton enforcement
  - no-sideboard enforcement
  - official points-list enforcement
  - companion / outside-the-game handling

- Premodern:
  - legal-set enforcement
  - banned list enforcement
  - sideboard rules
  - four-of enforcement outside basic lands

## Data Model Work

- Add sideboard support to import and storage
- Store legality snapshots separately from imported source rows
- Track validation warnings versus hard legality failures
- Support scheduled refreshes for legality changes when banned lists or rotations update

## UX Work

- Show official legality status on deck pages
- Show format-specific validation messages in deck settings
- Explain when a deck is imported successfully but still has legality issues
- Add admin visibility for decks that become illegal after format updates

## Notes

- Keep the import page honest until these validations are implemented.
- Treat format ingest support and full format legality support as separate roadmap stages.
