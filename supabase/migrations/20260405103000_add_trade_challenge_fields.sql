alter table public.decks
  add column if not exists trade_goal text,
  add column if not exists share_headline text;

alter table public.decks
  drop constraint if exists decks_trade_goal_check;

alter table public.decks
  add constraint decks_trade_goal_check
  check (
    trade_goal is null
    or trade_goal in ('lateral', 'upgrade', 'downgrade_cash', 'sell_fast')
  );
