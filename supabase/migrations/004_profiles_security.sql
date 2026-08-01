-- Block profile privilege escalation.
-- Run this in the Supabase SQL Editor.

-- 1) Strengthen the update policy: a user may only update their OWN row
--    (with check prevents UPDATE ... WHERE other-user tricks from being allowed).
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- 2) Block borrowers from changing role or KYC status on any row.
--    Only admins (via the app/backend) or the service role / SQL editor may do so.
--    is_admin() uses security definer and reads the current auth.uid().
create or replace function public.prevent_profile_privilege_escalation()
returns trigger as $$
begin
  if (
    (new.role is distinct from old.role or new.kyc_status is distinct from old.kyc_status)
    and coalesce(auth.role(), '') not in ('service_role', '')
    and not public.is_admin()
  ) then
    raise exception 'Only admins can change role or KYC status';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists prevent_profile_privilege_escalation on profiles;
create trigger prevent_profile_privilege_escalation
  before update on profiles
  for each row
  execute function public.prevent_profile_privilege_escalation();

-- 3) Same guard on insert: a user must not be able to create a profile row
--    with elevated privileges (e.g. role = 'admin').
create or replace function public.prevent_profile_privilege_escalation_insert()
returns trigger as $$
begin
  if (
    (new.role = 'admin' or new.kyc_status = 'approved')
    and coalesce(auth.role(), '') not in ('service_role', '')
    and not public.is_admin()
  ) then
    raise exception 'Only admins can create profiles with elevated privileges';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists prevent_profile_privilege_escalation_insert on profiles;
create trigger prevent_profile_privilege_escalation_insert
  before insert on profiles
  for each row
  execute function public.prevent_profile_privilege_escalation_insert();
