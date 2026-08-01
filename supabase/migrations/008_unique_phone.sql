-- Enforce unique phone numbers across borrowers.
-- Run this in the Supabase SQL Editor.

-- 1) Remove any empty/duplicate phone values first (set blanks to avoid constraint failure)
update profiles set phone = '' where phone is null;

-- 2) Add unique constraint on phone (ignoring empty strings)
create unique index idx_profiles_phone_unique on profiles (phone)
  where phone != '';

-- 3) Optional: show existing duplicates (run manually to investigate)
-- select phone, count(*) from profiles where phone != '' group by phone having count(*) > 1;