-- PodMatch multiplayer: real users join leagues, bring their own decks, report
-- games, and confirm their own results.
--
-- Design:
--   * A user is the league ADMIN when podmatch_leagues.admin_user_id = auth.uid().
--   * A user is a MEMBER when a podmatch_players row with user_id = auth.uid() is
--     linked to the league via podmatch_league_players.
--   * Membership is resolved by the SECURITY DEFINER helper podmatch_is_member(),
--     which bypasses RLS internally so member policies can't recurse.
--   * Registered decks carry a denormalized score SNAPSHOT, so pod generation
--     never has to read another user's owner-only deck_scores row.
--   * Joining and confirming go through SECURITY DEFINER RPCs (the same pattern
--     the app already uses for claim_guest_import_draft / create_singles_checkout).

-- 1. Invite codes -----------------------------------------------------------
alter table public.podmatch_leagues
  add column if not exists invite_code text;

update public.podmatch_leagues
  set invite_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
  where invite_code is null;

alter table public.podmatch_leagues
  alter column invite_code set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

create unique index if not exists podmatch_leagues_invite_code_idx
  on public.podmatch_leagues(invite_code);

-- 2. Deck score snapshot on registered decks --------------------------------
alter table public.podmatch_league_decks
  add column if not exists deck_name text,
  add column if not exists commander text,
  add column if not exists color_identity text[] not null default '{}',
  add column if not exists power numeric,
  add column if not exists speed numeric,
  add column if not exists salt numeric,
  add column if not exists combo_density numeric,
  add column if not exists tutor_density numeric,
  add column if not exists budget_pressure numeric;

-- 3. Membership helper (SECURITY DEFINER -> no RLS recursion) ----------------
create or replace function public.podmatch_is_member(p_league uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (
      select 1 from public.podmatch_leagues l
      where l.id = p_league and l.admin_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.podmatch_league_players lp
      join public.podmatch_players p on p.id = lp.player_id
      where lp.league_id = p_league and p.user_id = auth.uid()
    );
$$;

grant execute on function public.podmatch_is_member(uuid) to authenticated;

-- 4. Join a league by invite code -------------------------------------------
create or replace function public.podmatch_join_league(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_league uuid;
  v_player uuid;
  v_name text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_league
  from public.podmatch_leagues
  where invite_code = lower(trim(p_code));

  if v_league is null then
    raise exception 'Invalid invite code';
  end if;

  -- Already a member (or admin who is also a player)? Return idempotently.
  select p.id into v_player
  from public.podmatch_league_players lp
  join public.podmatch_players p on p.id = lp.player_id
  where lp.league_id = v_league and p.user_id = v_uid
  limit 1;

  if v_player is not null then
    return v_league;
  end if;

  select coalesce(nullif(split_part(u.email, '@', 1), ''), 'Player')
  into v_name
  from auth.users u
  where u.id = v_uid;

  insert into public.podmatch_players (owner_user_id, user_id, display_name)
  values (v_uid, v_uid, coalesce(v_name, 'Player'))
  returning id into v_player;

  insert into public.podmatch_league_players (league_id, player_id)
  values (v_league, v_player);

  return v_league;
end;
$$;

grant execute on function public.podmatch_join_league(text) to authenticated;

-- 5. Confirm a game result (member self-service + auto-finalize) -------------
create or replace function public.podmatch_confirm_game(p_game uuid, p_player uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_league uuid;
  v_count int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.podmatch_players p
    where p.id = p_player and p.user_id = v_uid
  ) then
    raise exception 'Not your player';
  end if;

  select league_id into v_league from public.podmatch_games where id = p_game;
  if v_league is null then
    raise exception 'Game not found';
  end if;

  if not public.podmatch_is_member(v_league) then
    raise exception 'Not a league member';
  end if;

  if not exists (
    select 1 from public.podmatch_game_players gp
    where gp.game_id = p_game and gp.player_id = p_player
  ) then
    raise exception 'Player not in this game';
  end if;

  insert into public.podmatch_game_confirmations (game_id, player_id, confirmed)
  values (p_game, p_player, true)
  on conflict (game_id, player_id) do update set confirmed = true;

  select count(*) into v_count
  from public.podmatch_game_confirmations
  where game_id = p_game and confirmed = true;

  if v_count >= 2 then
    update public.podmatch_games
    set status = 'final', finalized_at = now()
    where id = p_game and status <> 'final';
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.podmatch_confirm_game(uuid, uuid) to authenticated;

-- 6. Member read access (additive; admin "for all" policies remain) ----------
create policy "podmatch_leagues_select_member" on public.podmatch_leagues
  for select using (public.podmatch_is_member(id));

create policy "podmatch_league_players_select_member" on public.podmatch_league_players
  for select using (public.podmatch_is_member(league_id));

create policy "podmatch_players_select_member" on public.podmatch_players
  for select using (
    exists (
      select 1 from public.podmatch_league_players lp
      where lp.player_id = podmatch_players.id
        and public.podmatch_is_member(lp.league_id)
    )
  );

create policy "podmatch_league_decks_select_member" on public.podmatch_league_decks
  for select using (public.podmatch_is_member(league_id));

create policy "podmatch_pods_select_member" on public.podmatch_pods
  for select using (public.podmatch_is_member(league_id));

create policy "podmatch_pod_players_select_member" on public.podmatch_pod_players
  for select using (
    exists (
      select 1 from public.podmatch_pods p
      where p.id = podmatch_pod_players.pod_id and public.podmatch_is_member(p.league_id)
    )
  );

create policy "podmatch_games_select_member" on public.podmatch_games
  for select using (public.podmatch_is_member(league_id));

create policy "podmatch_game_players_select_member" on public.podmatch_game_players
  for select using (
    exists (
      select 1 from public.podmatch_games g
      where g.id = podmatch_game_players.game_id and public.podmatch_is_member(g.league_id)
    )
  );

create policy "podmatch_game_confirmations_select_member" on public.podmatch_game_confirmations
  for select using (
    exists (
      select 1 from public.podmatch_games g
      where g.id = podmatch_game_confirmations.game_id and public.podmatch_is_member(g.league_id)
    )
  );

create policy "podmatch_ratings_select_member" on public.podmatch_ratings
  for select using (public.podmatch_is_member(league_id));

create policy "podmatch_rating_history_select_member" on public.podmatch_rating_history
  for select using (public.podmatch_is_member(league_id));

-- 7. Member write access -----------------------------------------------------
-- Register a deck I own, to my own player, in a league I belong to.
create policy "podmatch_league_decks_insert_member" on public.podmatch_league_decks
  for insert with check (
    public.podmatch_is_member(league_id)
    and exists (
      select 1 from public.podmatch_players p
      where p.id = player_id and p.user_id = auth.uid()
    )
    and exists (
      select 1 from public.decks d
      where d.id = deck_id and d.user_id = auth.uid()
    )
  );

-- Any pod member can report a game (provisional until confirmed).
create policy "podmatch_games_insert_member" on public.podmatch_games
  for insert with check (public.podmatch_is_member(league_id));

create policy "podmatch_game_players_insert_member" on public.podmatch_game_players
  for insert with check (
    exists (
      select 1 from public.podmatch_games g
      where g.id = game_id and public.podmatch_is_member(g.league_id)
    )
  );

-- Confirmations are written via podmatch_confirm_game() (SECURITY DEFINER),
-- so no member INSERT policy on podmatch_game_confirmations is needed.
