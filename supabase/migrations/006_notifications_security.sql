-- Lock down notifications RLS.
-- Run this in the Supabase SQL Editor.
-- Only admins may read/insert/update/delete notifications; service role bypasses RLS anyway.

drop policy if exists "Admins can read notifications" on notifications;
create policy "Admins can read notifications"
  on notifications for select
  using (public.is_admin());

drop policy if exists "Service role can insert notifications" on notifications;
create policy "Only admins can insert notifications"
  on notifications for insert
  with check (public.is_admin());

drop policy if exists "Admins can update notifications" on notifications;
create policy "Admins can update notifications"
  on notifications for update
  using (public.is_admin());

drop policy if exists "Admins can delete notifications" on notifications;
create policy "Admins can delete notifications"
  on notifications for delete
  using (public.is_admin());
