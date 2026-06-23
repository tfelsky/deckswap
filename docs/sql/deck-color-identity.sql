-- NOTE: Folded into supabase/migrations/20260622150700_deck_color_identity.sql (run by `supabase db push`).
-- Kept for reference only — do not hand-apply.

alter table public.decks
  add column if not exists color_identity text[] not null default '{}';
