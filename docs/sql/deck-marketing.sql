-- NOTE: Folded into supabase/migrations/20260622151200_deck_marketing.sql (run by `supabase db push`).
-- Kept for reference only — do not hand-apply.

alter table public.decks
  add column if not exists is_sleeved boolean not null default false,
  add column if not exists is_boxed boolean not null default false,
  add column if not exists is_sealed boolean not null default false,
  add column if not exists is_complete_precon boolean not null default false,
  add column if not exists box_type text;
