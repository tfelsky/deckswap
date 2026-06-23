-- Folded from docs/sql/deck-marketing.sql into a migration so `supabase db push`
-- keeps every project in sync. Idempotent: create-if-not-exists / add-column-
-- if-not-exists / drop-policy-if-exists guards make it safe to re-run.

alter table public.decks
  add column if not exists is_sleeved boolean not null default false,
  add column if not exists is_boxed boolean not null default false,
  add column if not exists is_sealed boolean not null default false,
  add column if not exists is_complete_precon boolean not null default false,
  add column if not exists box_type text;
