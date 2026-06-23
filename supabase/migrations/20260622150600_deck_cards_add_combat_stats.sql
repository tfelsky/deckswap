-- Folded from docs/sql/deck-cards-add-combat-stats.sql into a migration so `supabase db push`
-- keeps every project in sync. Idempotent: create-if-not-exists / add-column-
-- if-not-exists / drop-policy-if-exists guards make it safe to re-run.

alter table public.deck_cards
  add column if not exists cmc numeric,
  add column if not exists power text,
  add column if not exists toughness text;
