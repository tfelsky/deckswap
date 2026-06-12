-- Private storage bucket for government ID documents. Objects are only
-- accessed through the service-role client (uploads via the profile API
-- route, reads via short-lived signed URLs on the admin verifications page),
-- so no storage.objects policies are added here.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'government-ids',
  'government-ids',
  false,
  5000000,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
