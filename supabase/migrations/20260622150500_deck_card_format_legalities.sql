-- Folded from docs/sql/deck-card-format-legalities.sql into a migration so `supabase db push`
-- keeps every project in sync. Idempotent: create-if-not-exists / add-column-
-- if-not-exists / drop-policy-if-exists guards make it safe to re-run.

-- Per-card Scryfall legalities map captured during enrichment, e.g.
-- {"standard":"not_legal","modern":"banned","legacy":"legal",...}.
-- Used by format validation to flag banned / not-legal / restricted cards
-- without maintaining hand-curated banned lists.

alter table public.deck_cards
  add column if not exists format_legalities jsonb;
