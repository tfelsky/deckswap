create table if not exists public.user_deck_watchlist (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id bigint not null references public.decks(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, deck_id)
);

alter table public.user_deck_watchlist enable row level security;

create policy "users can view their own watched decks"
on public.user_deck_watchlist
for select
using (auth.uid() = user_id);

create policy "users can insert their own watched decks"
on public.user_deck_watchlist
for insert
with check (auth.uid() = user_id);

create policy "users can delete their own watched decks"
on public.user_deck_watchlist
for delete
using (auth.uid() = user_id);
