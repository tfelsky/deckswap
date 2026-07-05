-- Folded from docs/sql/deck-inventory-status.sql into a migration so `supabase db push`
-- keeps every project in sync. Idempotent: create-if-not-exists / add-column-
-- if-not-exists / drop-policy-if-exists guards make it safe to re-run.

alter table public.decks
  add column if not exists inventory_status text not null default 'staged',
  add column if not exists holiday_donation_agreed_at timestamptz,
  add column if not exists holiday_donation_submitted_at timestamptz;
