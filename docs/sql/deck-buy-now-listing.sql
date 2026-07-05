-- NOTE: Folded into supabase/migrations/20260622150300_deck_buy_now_listing.sql (run by `supabase db push`).
-- Kept for reference only — do not hand-apply.

alter table public.decks
  add column if not exists buy_now_price_usd numeric,
  add column if not exists buy_now_currency text not null default 'USD',
  add column if not exists buy_now_listing_notes text;
