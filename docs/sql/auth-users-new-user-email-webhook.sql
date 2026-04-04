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
