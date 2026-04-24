-- CastLog seed: create the first admin profile.
--
-- Step 1: Create the auth user via Supabase dashboard or CLI:
--   supabase auth users create \
--     --email admin@castlog.app \
--     --password changeme123
--
-- Step 2: Copy the UUID from the output, paste below, then run this file:
--   supabase db reset   (runs migrations + seed)
--   OR run it manually in the SQL editor.

-- Replace the UUID below with the actual auth user UUID:
insert into profiles (id, username, role, force_password_change)
values ('<paste-auth-user-uuid-here>', 'admin', 'admin', true)
on conflict (id) do update set role = 'admin', force_password_change = true;
