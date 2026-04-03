alter table public.decks
  add column if not exists is_sleeved boolean not null default false,
  add column if not exists is_boxed boolean not null default false,
  add column if not exists box_type text;
