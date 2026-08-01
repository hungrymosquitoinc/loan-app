-- Combined notifications RLS fix (run as ONE script in SQL Editor)

-- 1) Rename read -> is_read (skip if already done)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'notifications' and column_name = 'read'
  ) then
    alter table notifications rename column read to is_read;
  end if;
end $$;

-- 2) Drop ALL existing policies, then recreate with is_admin()
drop policy if exists "Admins can read notifications" on notifications;
drop policy if exists "Service role can insert notifications" on notifications;
drop policy if exists "Only admins can insert notifications" on notifications;
drop policy if exists "Admins can update notifications" on notifications;
drop policy if exists "Admins can delete notifications" on notifications;

create policy "Admins can read notifications"
  on notifications for select
  using (public.is_admin());

create policy "Only admins can insert notifications"
  on notifications for insert
  with check (public.is_admin());

create policy "Admins can update notifications"
  on notifications for update
  using (public.is_admin());

create policy "Admins can delete notifications"
  on notifications for delete
  using (public.is_admin());