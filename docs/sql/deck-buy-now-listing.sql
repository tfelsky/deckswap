alter table public.decks
  add column if not exists buy_now_price_usd numeric,
  add column if not exists buy_now_listing_notes text;
