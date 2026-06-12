-- Per-card Scryfall legalities map captured during enrichment, e.g.
-- {"standard":"not_legal","modern":"banned","legacy":"legal",...}.
-- Used by format validation to flag banned / not-legal / restricted cards
-- without maintaining hand-curated banned lists.

alter table public.deck_cards
  add column if not exists format_legalities jsonb;
