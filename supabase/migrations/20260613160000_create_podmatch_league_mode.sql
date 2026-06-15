-- PodMatch League Mode (Milestone 3).
--
-- Admin/host model: every league is owned by the auth user who created it
-- (admin_user_id). Players are lightweight roster entries the admin manages —
-- optionally linked to a real auth user via players.user_id — so a single
-- store organizer can run a whole league from one account. Decks registered to
-- a league are the admin's existing public.decks rows (bigint ids).
--
-- All RLS is anchored to the owning league's admin_user_id; child tables reach
-- the league through their parent. Ratings/handicaps (Milestone 4) are not
-- created here.

-- Leagues -------------------------------------------------------------------
create table if not exists public.podmatch_leagues (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  format text not null default 'commander',
  pod_size int not null default 4,
  season_start date,
  season_end date,
  scoring_model text not null default 'casual_balanced',
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.podmatch_leagues enable row level security;

create policy "podmatch_leagues_rw_own"
  on public.podmatch_leagues
  for all
  using (admin_user_id = auth.uid())
  with check (admin_user_id = auth.uid());

-- Players (roster entries) --------------------------------------------------
create table if not exists public.podmatch_players (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.podmatch_players enable row level security;

create policy "podmatch_players_rw_own"
  on public.podmatch_players
  for all
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- League membership ---------------------------------------------------------
create table if not exists public.podmatch_league_players (
  league_id uuid not null references public.podmatch_leagues(id) on delete cascade,
  player_id uuid not null references public.podmatch_players(id) on delete cascade,
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  primary key (league_id, player_id)
);

alter table public.podmatch_league_players enable row level security;

create policy "podmatch_league_players_rw_admin"
  on public.podmatch_league_players
  for all
  using (
    exists (
      select 1 from public.podmatch_leagues l
      where l.id = podmatch_league_players.league_id and l.admin_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.podmatch_leagues l
      where l.id = podmatch_league_players.league_id and l.admin_user_id = auth.uid()
    )
  );

-- Registered decks ----------------------------------------------------------
create table if not exists public.podmatch_league_decks (
  league_id uuid not null references public.podmatch_leagues(id) on delete cascade,
  deck_id bigint not null references public.decks(id) on delete cascade,
  player_id uuid references public.podmatch_players(id) on delete set null,
  approved boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  primary key (league_id, deck_id)
);

alter table public.podmatch_league_decks enable row level security;

create policy "podmatch_league_decks_rw_admin"
  on public.podmatch_league_decks
  for all
  using (
    exists (
      select 1 from public.podmatch_leagues l
      where l.id = podmatch_league_decks.league_id and l.admin_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.podmatch_leagues l
      where l.id = podmatch_league_decks.league_id and l.admin_user_id = auth.uid()
    )
  );

-- Pods ----------------------------------------------------------------------
create table if not exists public.podmatch_pods (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.podmatch_leagues(id) on delete cascade,
  round_number int not null default 1,
  table_number int not null,
  fit_score numeric,
  average_power numeric,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.podmatch_pods enable row level security;

create policy "podmatch_pods_rw_admin"
  on public.podmatch_pods
  for all
  using (
    exists (
      select 1 from public.podmatch_leagues l
      where l.id = podmatch_pods.league_id and l.admin_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.podmatch_leagues l
      where l.id = podmatch_pods.league_id and l.admin_user_id = auth.uid()
    )
  );

create index if not exists podmatch_pods_league_round_idx
  on public.podmatch_pods(league_id, round_number);

-- Pod seats -----------------------------------------------------------------
create table if not exists public.podmatch_pod_players (
  pod_id uuid not null references public.podmatch_pods(id) on delete cascade,
  player_id uuid not null references public.podmatch_players(id) on delete cascade,
  deck_id bigint references public.decks(id) on delete set null,
  primary key (pod_id, player_id)
);

alter table public.podmatch_pod_players enable row level security;

create policy "podmatch_pod_players_rw_admin"
  on public.podmatch_pod_players
  for all
  using (
    exists (
      select 1
      from public.podmatch_pods p
      join public.podmatch_leagues l on l.id = p.league_id
      where p.id = podmatch_pod_players.pod_id and l.admin_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.podmatch_pods p
      join public.podmatch_leagues l on l.id = p.league_id
      where p.id = podmatch_pod_players.pod_id and l.admin_user_id = auth.uid()
    )
  );

-- Games ---------------------------------------------------------------------
create table if not exists public.podmatch_games (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.podmatch_leagues(id) on delete cascade,
  pod_id uuid references public.podmatch_pods(id) on delete set null,
  round_number int not null default 1,
  reported_by uuid references auth.users(id) on delete set null,
  status text not null default 'provisional',
  turn_count int,
  notes text,
  played_at timestamptz not null default now(),
  finalized_at timestamptz
);

alter table public.podmatch_games enable row level security;

create policy "podmatch_games_rw_admin"
  on public.podmatch_games
  for all
  using (
    exists (
      select 1 from public.podmatch_leagues l
      where l.id = podmatch_games.league_id and l.admin_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.podmatch_leagues l
      where l.id = podmatch_games.league_id and l.admin_user_id = auth.uid()
    )
  );

create index if not exists podmatch_games_league_idx
  on public.podmatch_games(league_id, status);

-- Per-player results --------------------------------------------------------
create table if not exists public.podmatch_game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.podmatch_games(id) on delete cascade,
  player_id uuid not null references public.podmatch_players(id) on delete cascade,
  deck_id bigint references public.decks(id) on delete set null,
  placement int,
  eliminations int not null default 0,
  combo_win boolean not null default false,
  commander_damage_win boolean not null default false,
  no_show boolean not null default false,
  sportsmanship boolean not null default false,
  points_awarded numeric not null default 0
);

alter table public.podmatch_game_players enable row level security;

create policy "podmatch_game_players_rw_admin"
  on public.podmatch_game_players
  for all
  using (
    exists (
      select 1
      from public.podmatch_games g
      join public.podmatch_leagues l on l.id = g.league_id
      where g.id = podmatch_game_players.game_id and l.admin_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.podmatch_games g
      join public.podmatch_leagues l on l.id = g.league_id
      where g.id = podmatch_game_players.game_id and l.admin_user_id = auth.uid()
    )
  );

create index if not exists podmatch_game_players_game_idx
  on public.podmatch_game_players(game_id);

-- Result confirmations ------------------------------------------------------
create table if not exists public.podmatch_game_confirmations (
  game_id uuid not null references public.podmatch_games(id) on delete cascade,
  player_id uuid not null references public.podmatch_players(id) on delete cascade,
  confirmed boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  primary key (game_id, player_id)
);

alter table public.podmatch_game_confirmations enable row level security;

create policy "podmatch_game_confirmations_rw_admin"
  on public.podmatch_game_confirmations
  for all
  using (
    exists (
      select 1
      from public.podmatch_games g
      join public.podmatch_leagues l on l.id = g.league_id
      where g.id = podmatch_game_confirmations.game_id and l.admin_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.podmatch_games g
      join public.podmatch_leagues l on l.id = g.league_id
      where g.id = podmatch_game_confirmations.game_id and l.admin_user_id = auth.uid()
    )
  );
