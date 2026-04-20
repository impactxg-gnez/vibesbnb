-- One-time migration: auto-approve hosts and listings (run in Supabase SQL Editor as postgres)
-- 1) Promote auth users with role host_pending → host
-- 2) Promote properties stuck in pending_approval → active
-- 3) Optional: mark legacy pending_host_applications as approved (does not change auth)

-- --- Auth: host_pending → host (JWT user_metadata)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"host"'
)
WHERE raw_user_meta_data->>'role' = 'host_pending';

-- --- Profiles table (if you store role here)
UPDATE public.profiles
SET role = 'host', updated_at = now()
WHERE role = 'host_pending';

-- --- Properties: listing approval queue no longer used
UPDATE public.properties
SET status = 'active', updated_at = now()
WHERE status = 'pending_approval';

-- --- Optional: close legacy host application rows (adjust table name if different)
-- UPDATE public.pending_host_applications SET status = 'approved', reviewed_at = now() WHERE status = 'pending';
