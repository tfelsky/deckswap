-- NOTE: Folded into supabase/migrations/20260622151400_deck_sideboard_and_standard.sql (run by `supabase db push`).
-- Kept for reference only — do not hand-apply.

alter table public.decks
  add column if not exists sideboard_count integer not null default 0;

alter table public.deck_cards
  drop constraint if exists deck_cards_section_check;

alter table public.deck_cards
  add constraint deck_cards_section_check
  check (section in ('commander', 'mainboard', 'sideboard'));
