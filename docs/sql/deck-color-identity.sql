alter table public.decks
  add column if not exists color_identity text[] not null default '{}';
