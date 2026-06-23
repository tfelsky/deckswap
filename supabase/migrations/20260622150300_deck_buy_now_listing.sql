-- Folded from docs/sql/deck-buy-now-listing.sql into a migration so `supabase db push`
-- keeps every project in sync. Idempotent: create-if-not-exists / add-column-
-- if-not-exists / drop-policy-if-exists guards make it safe to re-run.

alter table public.decks
  add column if not exists buy_now_price_usd numeric,
  add column if not exists buy_now_currency text not null default 'USD',
  add column if not exists buy_now_listing_notes text;
