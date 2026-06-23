-- NOTE: Folded into supabase/migrations/20260622150600_deck_cards_add_combat_stats.sql (run by `supabase db push`).
-- Kept for reference only — do not hand-apply.

alter table public.deck_cards
  add column if not exists cmc numeric,
  add column if not exists power text,
  add column if not exists toughness text;
