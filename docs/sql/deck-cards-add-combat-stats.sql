alter table public.deck_cards
  add column if not exists cmc numeric,
  add column if not exists power text,
  add column if not exists toughness text;
