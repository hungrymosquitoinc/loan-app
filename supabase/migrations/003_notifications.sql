create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  type text not null default 'info',
  from_user_id uuid references auth.users(id) on delete set null,
  to_role text not null default 'admin',
  read boolean default false,
  link text,
  created_at timestamptz default now()
);

alter table notifications enable row level security;

create policy "Admins can read notifications" on notifications
  for select using (true);

create policy "Service role can insert notifications" on notifications
  for insert with check (true);

create policy "Admins can update notifications" on notifications
  for update using (true);

create policy "Admins can delete notifications" on notifications
  for delete using (true);
