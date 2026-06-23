-- NOTE: Folded into supabase/migrations/20260622151100_deck_inventory_status.sql (run by `supabase db push`).
-- Kept for reference only — do not hand-apply.

alter table public.decks
  add column if not exists inventory_status text not null default 'staged',
  add column if not exists holiday_donation_agreed_at timestamptz,
  add column if not exists holiday_donation_submitted_at timestamptz;
