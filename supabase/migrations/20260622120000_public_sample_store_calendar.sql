-- Public store profile calendar support.
--
-- Store sample accounts write safe public details into podmatch_leagues.settings:
-- address, public contact links, calendar summaries, and event metadata. This
-- policy exposes only those sample/store-calendar league rows to anonymous
-- profile visitors; all player, pod, game, and roster tables remain protected
-- by their existing policies.

create policy "sample store calendars are publicly readable"
  on public.podmatch_leagues
  for select
  using (
    coalesce((settings ->> 'sampleAccount')::boolean, false) = true
    and (
      settings ? 'calendarEvents'
      or settings ->> 'mode' = 'event'
    )
  );
