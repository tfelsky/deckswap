-- Store the generated Commander achievement goals shown to each player when a
-- league game is reported. Each row keeps the assigned goals plus completed
-- flags so point totals remain auditable from the saved result.

alter table public.podmatch_game_players
  add column if not exists achievement_goals jsonb not null default '[]'::jsonb;

create or replace function public.podmatch_report_achievement_goal(
  p_game uuid,
  p_player uuid,
  p_goal text,
  p_completed boolean default true
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_league uuid;
  v_goals jsonb;
  v_new_goals jsonb;
  v_goal_found boolean;
  v_was_completed boolean;
  v_completed_count int;
  v_delta int;
  v_points_per_goal numeric := 1;
  v_points numeric;
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

  select g.league_id, gp.achievement_goals
  into v_league, v_goals
  from public.podmatch_game_players gp
  join public.podmatch_games g on g.id = gp.game_id
  where gp.game_id = p_game and gp.player_id = p_player;

  if v_league is null then
    raise exception 'Player not in this game';
  end if;

  if not public.podmatch_is_member(v_league) then
    raise exception 'Not a league member';
  end if;

  v_goals := coalesce(v_goals, '[]'::jsonb);

  select exists (
    select 1
    from jsonb_array_elements(v_goals) as item(goal)
    where item.goal->>'id' = p_goal
  )
  into v_goal_found;

  if not v_goal_found then
    raise exception 'Achievement goal not assigned to this player';
  end if;

  select coalesce((item.goal->>'completed')::boolean, false)
  into v_was_completed
  from jsonb_array_elements(v_goals) as item(goal)
  where item.goal->>'id' = p_goal
  limit 1;

  select count(*)
  into v_completed_count
  from jsonb_array_elements(v_goals) as item(goal)
  where coalesce((item.goal->>'completed')::boolean, false);

  select gp.points_awarded
  into v_points
  from public.podmatch_game_players gp
  where gp.game_id = p_game and gp.player_id = p_player;

  if v_was_completed = p_completed then
    return v_points;
  end if;

  if p_completed and v_completed_count >= 5 then
    return v_points;
  end if;

  select coalesce(nullif(l.settings #>> '{scoring,achievement}', '')::numeric, 1)
  into v_points_per_goal
  from public.podmatch_leagues l
  where l.id = v_league;

  v_delta := case when p_completed then 1 else -1 end;

  select coalesce(
    jsonb_agg(
      case
        when item.goal->>'id' = p_goal
          then jsonb_set(item.goal, '{completed}', to_jsonb(p_completed), true)
        else item.goal
      end
      order by item.ord
    ),
    '[]'::jsonb
  )
  into v_new_goals
  from jsonb_array_elements(v_goals) with ordinality as item(goal, ord);

  update public.podmatch_game_players gp
  set
    achievement_goals = v_new_goals,
    points_awarded = round((gp.points_awarded + (v_delta * v_points_per_goal))::numeric, 1)
  where gp.game_id = p_game and gp.player_id = p_player
  returning gp.points_awarded into v_points;

  return v_points;
end;
$$;

grant execute on function public.podmatch_report_achievement_goal(uuid, uuid, text, boolean)
  to authenticated;
