-- NOTE: Intentionally NOT folded into a migration. This trigger lives on
-- auth.users and embeds a per-project Edge Function URL (replace
-- YOUR_PROJECT_REF below), so it must be applied by hand per environment after
-- editing the URL — running it blindly via `supabase db push` would bake in a
-- broken endpoint.

create extension if not exists pg_net;

drop trigger if exists auth_users_new_user_email_webhook on auth.users;

create trigger auth_users_new_user_email_webhook
after insert on auth.users
for each row
execute function supabase_functions.http_request(
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/new-user-alert',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '5000'
);
