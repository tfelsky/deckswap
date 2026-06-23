-- Public storage bucket for profile avatars and banners. Uploads go through the
-- service-role client (the /api/profile/image route), and reads are served via
-- the public object URL stored in profiles.avatar_url / profiles.banner_url, so
-- no storage.objects policies are needed here.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  true,
  5000000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
