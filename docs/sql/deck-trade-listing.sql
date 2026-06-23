-- NOTE: Folded into supabase/migrations/20260622151500_deck_trade_listing.sql (run by `supabase db push`).
-- Kept for reference only — do not hand-apply.

alter table public.decks
  add column if not exists is_listed_for_trade boolean not null default false,
  add column if not exists trade_listing_notes text,
  add column if not exists trade_wanted_profile text,
  add column if not exists wanted_color_identities text[] not null default '{}',
  add column if not exists wanted_formats text[] not null default '{}';
