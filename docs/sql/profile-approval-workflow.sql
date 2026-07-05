-- NOTE: Folded into supabase/migrations/20260622130000_profile_trust_schema.sql
-- (run by `supabase db push`). Kept for reference only — do not hand-apply.

alter table public.profile_reputation_summary
  add column if not exists approval_status text not null default 'pending',
  add column if not exists approval_notes text,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null;
