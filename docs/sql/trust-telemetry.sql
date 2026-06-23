-- NOTE: Folded into supabase/migrations/20260622152300_trust_telemetry.sql (run by `supabase db push`).
-- Kept for reference only — do not hand-apply.

-- Trust telemetry: populate the reputation-summary fields used by the
-- internal validation score (last_seen_at, avg_trade_reply_hours,
-- last_login_ip_country). Called fire-and-forget from authenticated pages
-- and from trade-offer resolution actions.

create or replace function public.touch_profile_last_seen(
  p_ip_country text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return;
  end if;

  insert into public.profile_reputation_summary (user_id, last_seen_at, last_login_ip_country)
  values (v_user_id, now(), nullif(trim(p_ip_country), ''))
  on conflict (user_id) do update
  set
    last_seen_at = now(),
    last_login_ip_country = coalesce(
      nullif(trim(p_ip_country), ''),
      public.profile_reputation_summary.last_login_ip_country
    ),
    updated_at = now()
  -- Throttle: skip the write when the row was touched in the last 15 minutes.
  where public.profile_reputation_summary.last_seen_at is null
    or public.profile_reputation_summary.last_seen_at < now() - interval '15 minutes';
end;
$$;

grant execute on function public.touch_profile_last_seen(text) to authenticated;

-- Recompute the average reply time (hours) for offers a user has resolved.
-- Reply time = updated_at - created_at on offers the user received and
-- accepted / declined / countered.
create or replace function public.refresh_avg_trade_reply_hours(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg_hours numeric;
begin
  if p_user_id is null then
    return;
  end if;

  select avg(extract(epoch from (offer.updated_at - offer.created_at)) / 3600.0)
  into v_avg_hours
  from public.trade_offers offer
  where offer.requested_user_id = p_user_id
    and offer.status in ('accepted', 'declined', 'countered')
    and offer.updated_at > offer.created_at;

  if v_avg_hours is null then
    return;
  end if;

  insert into public.profile_reputation_summary (user_id, avg_trade_reply_hours)
  values (p_user_id, round(v_avg_hours, 2))
  on conflict (user_id) do update
  set
    avg_trade_reply_hours = round(v_avg_hours, 2),
    updated_at = now();
end;
$$;

grant execute on function public.refresh_avg_trade_reply_hours(uuid) to authenticated;
