-- Enforce uniqueness: phone, name, id_number, qr_data, id_image
-- This removes existing duplicates (keeps oldest record) then creates indexes.

-- 1) Remove duplicate phones (keep oldest)
delete from profiles where id not in (
  select min(id) from profiles where phone != '' group by phone
);

-- 2) Remove duplicate names (keep oldest)
delete from profiles where id not in (
  select min(id) from profiles where name != '' group by name
);

-- 3) Remove duplicate id_numbers (keep oldest)
delete from profiles where id not in (
  select min(id) from profiles where id_number != '' group by id_number
);

-- 4) Remove duplicate qr_data (keep oldest)
delete from profiles where id not in (
  select min(id) from profiles where qr_data != '' group by qr_data
);

-- 5) Remove duplicate id_images (keep oldest)
delete from profiles where id not in (
  select min(id) from profiles where id_image != '' group by id_image
);

-- 6) Now create unique indexes
create unique index if not exists idx_profiles_phone_unique on profiles (phone)
  where phone != '';

create unique index if not exists idx_profiles_name_unique on profiles (name)
  where name != '';

create unique index if not exists idx_profiles_id_number_unique on profiles (id_number)
  where id_number != '';

create unique index if not exists idx_profiles_qr_data_unique on profiles (qr_data)
  where qr_data != '';

create unique index if not exists idx_profiles_id_image_unique on profiles (id_image)
  where id_image != '';
