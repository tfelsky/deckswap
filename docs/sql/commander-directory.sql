create table if not exists public.commander_directory (
  normalized_name text primary key,
  name text not null,
  type_line text,
  oracle_text text,
  source_updated_at timestamptz,
  synced_at timestamptz not null default now()
);

alter table public.commander_directory enable row level security;

create policy "commander directory is publicly readable"
  on public.commander_directory
  for select
  using (true);

create index if not exists commander_directory_name_idx
  on public.commander_directory (name);
