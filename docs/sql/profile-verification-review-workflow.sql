-- NOTE: Folded into supabase/migrations/20260622130000_profile_trust_schema.sql
-- (run by `supabase db push`). Kept for reference only — do not hand-apply.

alter table public.profile_verifications
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists review_notes text;
