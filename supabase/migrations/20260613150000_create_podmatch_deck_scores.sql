-- PodMatch deck scoring cache. One row per deck holding the explainable
-- sub-scores (0-10), per-score driver explanations, and the cached Rule-Zero
-- profile. Keyed to the existing public.decks table (bigint ids). Scores are
-- recomputed deterministically from deck_cards, so this table is a cache and
-- can be safely truncated/rebuilt.

create table if not exists public.deck_scores (
  deck_id bigint primary key references public.decks(id) on delete cascade,
  overall_power numeric,
  speed numeric,
  consistency numeric,
  interaction numeric,
  combo_density numeric,
  tutor_density numeric,
  salt numeric,
  budget_pressure numeric,
  casual_friction numeric,
  explanation jsonb not null default '{}'::jsonb,
  rule_zero jsonb,
  calculated_at timestamptz not null default now()
);

alter table public.deck_scores enable row level security;

-- A deck score is visible to / writable by whoever owns the underlying deck.
-- Ownership is resolved through public.decks.user_id rather than stored here,
-- so the score row stays a pure derived cache.
create policy "deck_scores_select_own"
  on public.deck_scores
  for select
  using (
    exists (
      select 1 from public.decks d
      where d.id = deck_scores.deck_id and d.user_id = auth.uid()
    )
  );

create policy "deck_scores_insert_own"
  on public.deck_scores
  for insert
  with check (
    exists (
      select 1 from public.decks d
      where d.id = deck_scores.deck_id and d.user_id = auth.uid()
    )
  );

create policy "deck_scores_update_own"
  on public.deck_scores
  for update
  using (
    exists (
      select 1 from public.decks d
      where d.id = deck_scores.deck_id and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.decks d
      where d.id = deck_scores.deck_id and d.user_id = auth.uid()
    )
  );

create index if not exists deck_scores_calculated_at_idx
  on public.deck_scores(calculated_at desc);
