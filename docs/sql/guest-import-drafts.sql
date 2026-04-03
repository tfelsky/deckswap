create extension if not exists pgcrypto;

create table if not exists public.guest_import_drafts (
  id uuid primary key default gen_random_uuid(),
  resume_token text not null unique,
  deck_name text,
  source_type text not null default 'text',
  source_url text,
  raw_list text,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);

create index if not exists guest_import_drafts_resume_token_idx
  on public.guest_import_drafts (resume_token);

create index if not exists guest_import_drafts_expires_at_idx
  on public.guest_import_drafts (expires_at desc);

alter table public.guest_import_drafts enable row level security;

create or replace function public.get_guest_import_draft(p_resume_token text)
returns table (
  resume_token text,
  deck_name text,
  source_type text,
  source_url text,
  raw_list text,
  created_at timestamptz,
  updated_at timestamptz,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    draft.resume_token,
    draft.deck_name,
    draft.source_type,
    draft.source_url,
    draft.raw_list,
    draft.created_at,
    draft.updated_at,
    draft.expires_at
  from public.guest_import_drafts draft
  where draft.resume_token = p_resume_token
    and draft.claimed_by_user_id is null
    and draft.expires_at > now()
  limit 1;
$$;

create or replace function public.upsert_guest_import_draft(
  p_resume_token text,
  p_deck_name text,
  p_source_type text,
  p_source_url text,
  p_raw_list text
)
returns table (
  resume_token text,
  deck_name text,
  source_type text,
  source_url text,
  raw_list text,
  created_at timestamptz,
  updated_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.guest_import_drafts (
    resume_token,
    deck_name,
    source_type,
    source_url,
    raw_list,
    expires_at,
    updated_at
  )
  values (
    p_resume_token,
    nullif(trim(p_deck_name), ''),
    coalesce(nullif(trim(p_source_type), ''), 'text'),
    nullif(trim(p_source_url), ''),
    nullif(trim(p_raw_list), ''),
    now() + interval '14 days',
    now()
  )
  on conflict (resume_token) do update
    set deck_name = excluded.deck_name,
        source_type = excluded.source_type,
        source_url = excluded.source_url,
        raw_list = excluded.raw_list,
        updated_at = now(),
        expires_at = now() + interval '14 days'
  where public.guest_import_drafts.claimed_by_user_id is null;

  return query
  select
    draft.resume_token,
    draft.deck_name,
    draft.source_type,
    draft.source_url,
    draft.raw_list,
    draft.created_at,
    draft.updated_at,
    draft.expires_at
  from public.guest_import_drafts draft
  where draft.resume_token = p_resume_token
  limit 1;
end;
$$;

create or replace function public.claim_guest_import_draft(
  p_resume_token text,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.guest_import_drafts
  set claimed_by_user_id = p_user_id,
      claimed_at = now(),
      updated_at = now()
  where resume_token = p_resume_token
    and claimed_by_user_id is null;

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

revoke all on public.guest_import_drafts from anon, authenticated;
grant execute on function public.get_guest_import_draft(text) to anon, authenticated;
grant execute on function public.upsert_guest_import_draft(text, text, text, text, text) to anon, authenticated;
grant execute on function public.claim_guest_import_draft(text, uuid) to authenticated;
