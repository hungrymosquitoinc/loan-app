-- Fix Supabase Security Advisor warnings
-- Run in Supabase SQL Editor

-- ============================================================
-- 1) Fix "Function Search Path Mutable" for all 3 functions
--    Add SET search_path = public to prevent search path attacks
-- ============================================================

-- is_admin()
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable
   set search_path = public;

-- prevent_profile_privilege_escalation()
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
$$ language plpgsql
   set search_path = public;

-- prevent_profile_privilege_escalation_insert()
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
$$ language plpgsql
   set search_path = public;

-- ============================================================
-- 2) Fix "Public Can Execute SECURITY DEFINER Function"
--    Revoke EXECUTE from public (PostgreSQL role), keep for
--    authenticated (needed for RLS policies to call is_admin)
-- ============================================================

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;
