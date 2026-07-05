-- NOTE: Folded into supabase/migrations/20260622152000_holiday_giveback_admin.sql (run by `supabase db push`).
-- Kept for reference only — do not hand-apply.

-- Holiday Giveback admin operations: receive/place timestamps and internal
-- notes for donated decks. inventory_status is plain text, so the new
-- 'holiday_placed' status needs no schema change.

alter table public.decks
  add column if not exists holiday_received_at timestamptz,
  add column if not exists holiday_placed_at timestamptz,
  add column if not exists holiday_admin_notes text;
