-- Folded from docs/sql/deck-color-identity.sql into a migration so `supabase db push`
-- keeps every project in sync. Idempotent: create-if-not-exists / add-column-
-- if-not-exists / drop-policy-if-exists guards make it safe to re-run.

alter table public.decks
  add column if not exists color_identity text[] not null default '{}';
