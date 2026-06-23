-- Folded from docs/sql/deck-card-conditions.sql into a migration so `supabase db push`
-- keeps every project in sync. Idempotent: create-if-not-exists / add-column-
-- if-not-exists / drop-policy-if-exists guards make it safe to re-run.

alter table public.deck_cards
  add column if not exists condition text not null default 'near_mint';

alter table public.deck_cards
  add column if not exists condition_source text not null default 'import_default';

alter table public.deck_cards
  drop constraint if exists deck_cards_condition_check;

alter table public.deck_cards
  add constraint deck_cards_condition_check
  check (condition in ('damaged', 'heavy_play', 'moderate_play', 'light_play', 'near_mint'));

alter table public.deck_cards
  drop constraint if exists deck_cards_condition_source_check;

alter table public.deck_cards
  add constraint deck_cards_condition_source_check
  check (condition_source in ('import_default', 'manual'));
