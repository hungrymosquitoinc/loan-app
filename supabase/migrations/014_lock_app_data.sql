-- 014: Lock down app_data (payment methods + cached data).
-- Security fix: the "Anyone can read app_data" SELECT policy exposed
-- payment methods (GCash/Maya account numbers, holder names, QR images)
-- and cached borrower profiles/loans to anyone holding the anon key.
-- The backend uses the service-role key, which bypasses RLS, so locking
-- this down does not break the app.
-- Run this in the Supabase SQL Editor (project: ywfthihddyvhskwserta.supabase.co).

-- 1) Remove the world-readable SELECT policy.
drop policy if exists "Anyone can read app_data" on app_data;

-- 2) Ensure RLS is enabled (defense in depth).
alter table app_data enable row level security;

-- 3) Admins-only policy (covers SELECT + INSERT/UPDATE/DELETE for admins;
--    all other roles are denied, service role bypasses RLS).
drop policy if exists "Admins can manage app_data" on app_data;
create policy "Admins can manage app_data"
  on app_data for all
  using (public.is_admin())
  with check (public.is_admin());

-- 4) Drop the policy created by an earlier draft of this migration (if any).
drop policy if exists "Admins can read app_data" on app_data;
