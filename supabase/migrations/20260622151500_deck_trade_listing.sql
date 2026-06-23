-- Folded from docs/sql/deck-trade-listing.sql into a migration so `supabase db push`
-- keeps every project in sync. Idempotent: create-if-not-exists / add-column-
-- if-not-exists / drop-policy-if-exists guards make it safe to re-run.

alter table public.decks
  add column if not exists is_listed_for_trade boolean not null default false,
  add column if not exists trade_listing_notes text,
  add column if not exists trade_wanted_profile text,
  add column if not exists wanted_color_identities text[] not null default '{}',
  add column if not exists wanted_formats text[] not null default '{}';
