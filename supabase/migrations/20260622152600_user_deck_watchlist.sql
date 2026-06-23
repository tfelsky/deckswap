-- Folded from docs/sql/user-deck-watchlist.sql into a migration so `supabase db push`
-- keeps every project in sync. Idempotent: create-if-not-exists / add-column-
-- if-not-exists / drop-policy-if-exists guards make it safe to re-run.

create table if not exists public.user_deck_watchlist (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id bigint not null references public.decks(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, deck_id)
);

alter table public.user_deck_watchlist enable row level security;

drop policy if exists "users can view their own watched decks" on public.user_deck_watchlist;
create policy "users can view their own watched decks"
on public.user_deck_watchlist
for select
using (auth.uid() = user_id);

drop policy if exists "users can insert their own watched decks" on public.user_deck_watchlist;
create policy "users can insert their own watched decks"
on public.user_deck_watchlist
for insert
with check (auth.uid() = user_id);

drop policy if exists "users can delete their own watched decks" on public.user_deck_watchlist;
create policy "users can delete their own watched decks"
on public.user_deck_watchlist
for delete
using (auth.uid() = user_id);
