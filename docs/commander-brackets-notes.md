# Commander Brackets Notes

## Current official source set

- Commander format page on Magic
- "Introducing Commander Brackets Beta"
- "Commander Brackets Beta Update - April 22, 2025"
- "Commander Brackets Beta Update - February 9, 2026"

## Brackets in app

The app uses the official five-bracket beta framework:

1. Exhibition
2. Core
3. Upgraded
4. Optimized
5. cEDH

## Important implementation note

Bracket 5 is not fully automatable from a deck list alone.

Official guidance says cEDH is partly about intent, metagame awareness, and tournament-minded play. The app therefore uses heuristics for very strong competitive-looking decks, but any Bracket 5 estimate should be treated as best-effort.

## Game Changers data in app

The current in-repo Game Changers list is based on:

- the official October 2025 updated list
- the official February 9, 2026 additions of `Farewell` and `Biorhythm`

If Wizards updates the list again, update:

- `lib/commander/brackets.ts`

## Current UX behavior

- imported decks are bracket-estimated automatically
- marketplace cards display bracket labels instead of numeric power levels
- deck detail pages show bracket summary, Game Changer count, and bracket notes
- manual deck creation no longer asks for a numeric power level
