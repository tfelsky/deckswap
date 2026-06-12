create table if not exists public.affiliate_clicks (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  deck_id bigint references public.decks(id) on delete set null,
  card_name text,
  marketplace text,
  opportunity_id text,
  target_url text not null,
  referrer text,
  user_agent text,
  clicked_at timestamptz not null default now()
);

alter table public.affiliate_clicks enable row level security;

create policy "affiliate_clicks_insert_own_or_guest"
  on public.affiliate_clicks
  for insert
  with check (user_id is null or auth.uid() = user_id);

create policy "affiliate_clicks_select_own"
  on public.affiliate_clicks
  for select
  using (auth.uid() = user_id);

create index if not exists affiliate_clicks_deck_id_idx
  on public.affiliate_clicks(deck_id);

create index if not exists affiliate_clicks_marketplace_clicked_at_idx
  on public.affiliate_clicks(marketplace, clicked_at desc);
