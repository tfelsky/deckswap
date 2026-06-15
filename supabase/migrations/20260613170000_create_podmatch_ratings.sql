-- PodMatch ratings & handicaps (Milestone 4).
--
-- Three separately-tracked Elo ratings per league: player, deck, and
-- commander/archetype. podmatch_ratings holds the current value (and games
-- played, which drives the K-factor); podmatch_rating_history is the append-
-- only audit log so ratings can always be reconstructed from finalized games.
-- subject_id is text so it can hold a player uuid, a deck id, or a normalized
-- commander name under one schema.
--
-- Handicap configuration lives in podmatch_leagues.settings (jsonb), so no
-- schema change is needed to enable/disable or tune soft handicaps.

create table if not exists public.podmatch_ratings (
  league_id uuid not null references public.podmatch_leagues(id) on delete cascade,
  rating_type text not null,            -- 'player' | 'deck' | 'commander'
  subject_id text not null,
  rating numeric not null default 1500,
  games int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (league_id, rating_type, subject_id)
);

alter table public.podmatch_ratings enable row level security;

create policy "podmatch_ratings_rw_admin"
  on public.podmatch_ratings
  for all
  using (
    exists (
      select 1 from public.podmatch_leagues l
      where l.id = podmatch_ratings.league_id and l.admin_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.podmatch_leagues l
      where l.id = podmatch_ratings.league_id and l.admin_user_id = auth.uid()
    )
  );

create table if not exists public.podmatch_rating_history (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.podmatch_leagues(id) on delete cascade,
  game_id uuid references public.podmatch_games(id) on delete cascade,
  rating_type text not null,
  subject_id text not null,
  old_rating numeric,
  new_rating numeric,
  created_at timestamptz not null default now()
);

alter table public.podmatch_rating_history enable row level security;

create policy "podmatch_rating_history_rw_admin"
  on public.podmatch_rating_history
  for all
  using (
    exists (
      select 1 from public.podmatch_leagues l
      where l.id = podmatch_rating_history.league_id and l.admin_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.podmatch_leagues l
      where l.id = podmatch_rating_history.league_id and l.admin_user_id = auth.uid()
    )
  );

create index if not exists podmatch_rating_history_game_idx
  on public.podmatch_rating_history(game_id);

create index if not exists podmatch_rating_history_subject_idx
  on public.podmatch_rating_history(league_id, rating_type, subject_id);
