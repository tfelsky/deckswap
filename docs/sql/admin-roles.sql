create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'superadmin')),
  granted_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_roles enable row level security;

create policy "superadmins can read admin roles"
  on public.admin_roles
  for select
  using (auth.jwt() ->> 'email' = 'tim.felsky@gmail.com');

create policy "superadmins manage admin roles"
  on public.admin_roles
  for all
  using (auth.jwt() ->> 'email' = 'tim.felsky@gmail.com')
  with check (auth.jwt() ->> 'email' = 'tim.felsky@gmail.com');
